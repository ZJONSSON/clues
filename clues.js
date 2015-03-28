(function(self) {
  if (typeof module !== 'undefined') {
    clues.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.Promise = self.Promise;
    self.clues = clues;
  }

  var reArgs = /function.*?\((.*?)\).*/;
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

  function clues(logic,fn,$global,caller,fullref) {
    var args,ref;

    if (!$global) $global = {};
      
    if (typeof fn === 'string') {
      ref = fn;
    
      var dot = ref.indexOf('.');
      if (dot > -1) {
        var next = ref.slice(0,dot);
        return clues(logic,next,$global,caller,fullref)
          .then(function(d) {
            d.$parent = d.$parent || logic;          
            logic = d;
            ref = ref.slice(dot+1);
            fullref = (fullref ? fullref+'.' : '')+next;
            return clues(logic,ref,$global,caller,fullref);
          })
          .catch(function(e) {
            if (logic[ref]) return clues.Promise.fulfilled(logic[ref]);
            if (logic.$service && typeof logic.$service === 'function')
              return logic[ref] = clues(logic,function() { return logic.$service.call(logic,ref); },$global,caller,(fullref ? fullref+'.' : '')+ref);
            else throw e;
          });
      }

      fullref = (fullref ? fullref+'.' : '')+ref;
      fn = logic[ref];
      if (fn === undefined) {
        if ($global[ref]) return clues($global,ref,$global,caller,fullref);
        if (logic.$property && typeof logic.$property === 'function')
          return logic[ref] =  clues(logic,function() { return logic.$property.call(logic,ref); },$global,caller,fullref) ;
        return clues.Promise.rejected({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller});
      }
    }

    // Support an array with argument names in front and the function as last element
    if (typeof fn === 'object' && fn.length && typeof fn[fn.length-1] == 'function') {
      args = fn.slice(0,fn.length-1);
      fn = fn[fn.length-1];
    }
    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function') return clues.Promise.fulfilled(fn);

    args = (args || matchArgs(fn))
      .map(function(arg) {
        var optional,showError;
        if (optional = (arg[0] === '_')) arg = arg.slice(1);
        if (showError = (arg[0] === '_')) arg = arg.slice(1);
        return clues(logic,arg,$global,ref,fullref)
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
        return typeof d == 'string' ? d : clues(logic,d,$global,caller,fullref);
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

    if (ref) logic[ref] = value;
    return value;
  }

})(this);