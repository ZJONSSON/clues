(function(self) {
  if (typeof module !== 'undefined') {
    clues.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.Promise = self.Promise;
    self.clues = clues;
  }

  var reArgs = /function.*?\(([^)]*?)\).*/;
  function matchArgs(fn) {
    if (!fn.__args__) {
      var match = reArgs.exec(fn.prototype.constructor.toString());
      fn.__args__ = match[1].replace(/\s/g,'')
        .split(',')
        .filter(function(d) {
          return d.length;
        });
    }
    return fn.__args__;
  }

  var ID = 0;

  function clues(logic,fn,$global,caller,fullref,crumbs) {
    var args,ref;

    if (!$global) $global = {};
    crumbs = crumbs || {};

    if (typeof logic === 'function' || (logic && typeof logic.then === 'function'))
      return clues({},logic,$global,caller,fullref,crumbs)
        .then(function(logic) {
          return clues(logic,fn,$global,caller,fullref,crumbs);
        });
      
    if (typeof fn === 'string') {
      ref = fn;
    
      var dot = ref.indexOf('.');
      if (dot > -1 && logic[ref] === undefined) {
        var next = ref.slice(0,dot);
        return clues(logic,next,$global,caller,fullref,crumbs)
          .then(function(d) {
            logic = d;
            ref = ref.slice(dot+1);
            fullref = (fullref ? fullref+'.' : '')+next;
            return clues(logic,ref,$global,caller,fullref);
          })
          .catch(function(e) {
            if (logic && logic.$external && typeof logic.$external === 'function')
              return logic[ref] = clues(logic,function() { return logic.$external.call(logic,ref); },$global,caller,(fullref ? fullref+'.' : '')+ref,crumbs);
            else throw e;
          });
      }

      fullref = (fullref ? fullref+'.' : '')+ref;
      fn = logic[ref];
      if (fn === undefined) {
        if (typeof(logic) === 'object' && Object.getPrototypeOf(logic)[ref] !== undefined)
          fn = Object.getPrototypeOf(logic)[ref];
        else if ($global[ref])
          return clues($global,ref,$global,caller,fullref,crumbs);
        else if (logic && logic.$property && typeof logic.$property === 'function')
          fn = logic[ref] = function() { return logic.$property.call(logic,ref); };
        else return clues.Promise.rejected({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller});
      }
    }

    // Support an array with some argument names in front and the function as last element
    if (typeof fn === 'object' && fn.length && typeof fn[fn.length-1] == 'function') {
      if (fn.length > 1 && (typeof(fn[0]) === 'object' || typeof(fn[0]) == 'function')) {
        var obj = fn[0];
        fn = fn.slice(1);
        if (fn.length === 1) fn = fn[0];
        return clues(obj,fn,$global,caller,fullref,crumbs);
      }
      args = fn.slice(0,fn.length-1);
      fn = fn[fn.length-1];
      var fnArgs = matchArgs(fn);
      var numExtraArgs = fnArgs.length-args.length;
      if (numExtraArgs) {
        args = args.concat(fnArgs.slice(numExtraArgs));
      }
    }
    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function' || (ref && ref[0] === '$')) {
      if (fn && fn.then && crumbs[fn.ID]) 
        return clues.Promise.rejected({message:'recursive',ref:ref,fullref:fullref,caller:caller,id:fn.ID});
      else 
        return clues.Promise.fulfilled(fn);
    }
     
    crumbs = Object.create(crumbs);
    crumbs[ID++] = ref;

    var defer = clues.Promise.defer();
    defer.promise.ID = ID;
    if (ref) logic[ref] = defer.promise;

    args = (args || matchArgs(fn))
      .map(function(arg) {
        var optional,showError,res;
        if (optional = (arg[0] === '_')) arg = arg.slice(1);
        if (showError = (arg[0] === '_')) arg = arg.slice(1);

        if (arg[0] === '$' && logic[arg] === undefined) {
          if (arg === '$caller')
            res = clues.Promise.fulfilled(caller);
          else if (arg === '$fullref')
            res = clues.Promise.fulfilled(fullref);
          else if (arg === '$global')
            res = clues.Promise.fulfilled($global);
        }

        return res || clues(logic,arg,$global,ref,fullref,crumbs)
          .then(null,function(e) {
            if (optional) return (showError) ? e : undefined;
            else throw e;
          });
      });

    var inputs =  clues.Promise.all(args);
    if (inputs.cancellable) inputs = inputs.cancellable();

    var value = inputs
      .then(function(args) {
        return fn.apply(logic, args);
      })
      .then(function(d) {
        return typeof d == 'string' ? d : clues(logic,d,$global,caller,fullref,crumbs);
      },function(e) {
        if (e.name && e.name == 'CancellationError')
          return args.forEach(function(arg) { arg.cancel(); });
        if (typeof e !== 'object')
          e = { message : e};
        e.error = true;
        e.ref = e.ref || ref;
        e.fullref = e.fullref || fullref;
        e.caller = e.caller || caller || '';
        throw e;
      });

    defer.resolve(value);
    return value;
  }

})(this);