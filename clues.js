(function(self) {
  if (typeof module !== 'undefined') {
    clues.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.Promise = self.Promise;
    self.clues = clues;
  }

  var reArgs = /function.*?\(([^)]*?)\).*/;
  var reEs6 =  /\({0,1}(.*?)\){0,1}\s*=>/;

  function matchArgs(fn) {
    if (!fn.__args__) {
      var match = fn.prototype && reArgs.exec(fn.prototype.constructor.toString()) || reEs6.exec(fn.toString());
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

    if (typeof logic === 'function' || (logic && typeof logic.then === 'function'))
      return clues({},logic,$global,caller,fullref)
        .then(function(logic) {
          return clues(logic,fn,$global,caller,fullref);
        });
      
    if (typeof fn === 'string') {
      ref = fn;
    
      var dot = ref.search(/ᐅ|\./);
      if (dot > -1 && (!logic || logic[ref] === undefined)) {
        var next = ref.slice(0,dot);
        return clues(logic,next,$global,caller,fullref)
          .then(function(d) {
            logic = d;
            ref = ref.slice(dot+1);
            fullref = (fullref ? fullref+'.' : '')+next;
            return clues(logic,ref,$global,caller,fullref);
          })
          .catch(function(e) {
            if (e && e.notDefined && logic && logic.$external && typeof logic.$external === 'function')
              return logic[ref] = logic[ref] || clues(logic,function() { return logic.$external.call(logic,ref); },$global,caller,(fullref ? fullref+'.' : '')+ref);
            else throw e;
          });
      }

      fullref = (fullref ? fullref+'.' : '')+ref;
      fn = logic ? logic[ref] : undefined;
      if (fn === undefined) {
        if (typeof(logic) === 'object' && logic !== null && (Object.getPrototypeOf(logic) || {})[ref] !== undefined)
          fn = Object.getPrototypeOf(logic)[ref];
        else if ($global[ref] && caller && caller !== '__user__')
          return clues($global,ref,$global,caller,fullref);
        else if (logic && logic.$property && typeof logic.$property === 'function')
          fn = logic[ref] = function() { return logic.$property.call(logic,ref); };
        else return clues.Promise.reject({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller, notDefined:true});
      }
    }

    // Support an array with some argument names in front and the function as last element
    if (typeof fn === 'object' && fn && fn.length && typeof fn[fn.length-1] == 'function') {
      if (fn.length > 1 && (typeof(fn[0]) === 'object' || typeof(fn[0]) == 'function') && !fn[0].length) {
        var obj = fn[0];
        fn = fn.slice(1);
        if (fn.length === 1) fn = fn[0];
        return clues(obj,fn,$global,caller,fullref);
      }
      args = fn.slice(0,fn.length-1);
      fn = fn[fn.length-1];
      var fnArgs = matchArgs(fn);
      var numExtraArgs = fnArgs.length-args.length;
      if (numExtraArgs) {
        args = args.concat(fnArgs.slice(numExtraArgs));
      }
    }

    // If fn name is private or promise private is true, reject when called directly
    if (fn && (!caller || caller == '__user__') && ((typeof(fn) === 'function' && (fn.name == '$private' || fn.name == 'private')) || (fn.then && fn.private)))
     return clues.Promise.reject({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller, notDefined:true});

    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function' || (ref && ref[0] === '$')) {
      // If the value is a promise we wait for it to resolve to inspect the result
      if (fn && typeof fn.then === 'function')
        return fn.then(function(d) {
          // Pass results through clues again if its a function or an array (could be array function)
          return (typeof d == 'function' || (d && typeof d == 'object' && d.length)) ? clues(logic,d,$global,caller,fullref) : d;
        });
      else 
        return clues.Promise.resolve(fn);
    }

    // Shortcuts to define empty objects with $property or $external
    if (fn.name == '$property') return logic[ref] = clues.Promise.resolve({$property: fn.bind(logic)});
    if (fn.name == '$external') return logic[ref] = clues.Promise.resolve({$external: fn.bind(logic)});

    args = (args || matchArgs(fn))
      .map(function(arg) {
        var optional,showError,res;
        if (optional = (arg[0] === '_')) arg = arg.slice(1);
        if (showError = (arg[0] === '_')) arg = arg.slice(1);

        if (arg[0] === '$' && logic[arg] === undefined) {
          if (arg === '$caller')
            res = clues.Promise.resolve(caller);
          else if (arg === '$fullref')
            res = clues.Promise.resolve(fullref);
          else if (arg === '$global')
            res = clues.Promise.resolve($global);
        }

        return res || clues(logic,arg,$global,ref || 'fn',fullref)
          .then(null,function(e) {
            if (optional) return (showError) ? e : undefined;
            else throw e;
          });
      });

    var inputs =  clues.Promise.all(args),
        wait = Date.now(),
        duration;

    var value = inputs
      .then(function(args) {
        duration = Date.now();
        return clues.Promise.try(function() {
          return fn.apply(logic || {}, args);
        })
        .catch(function(e) {
          if (e && e.stack && typeof $global.$logError === 'function')
            $global.$logError(e, fullref);
          throw e;
        });
      })
      .finally(function() {
        if (typeof $global.$duration === 'function')
          $global.$duration(fullref || ref || (fn && fn.name),[(Date.now()-duration),(Date.now())-wait]);
      })
      .then(function(d) {
        return (typeof d == 'string' || typeof d == 'number') ? d : clues(logic,d,$global,caller,fullref);
      })
      .catch(function(e) {
        if (typeof e !== 'object')
          e = { message : e};
        e.error = true;
        e.ref = e.ref || ref;
        e.fullref = e.fullref || fullref;
        e.caller = e.caller || caller || '';
        if (fn && fn.name == '$noThrow')
          return e;
        throw e;
      });

    if (fn.name == 'private' || fn.name == '$private')
      value.private = true;

    value.name = fn.name;
    value.fn = fn;

    if (ref) {
      logic[ref] = value;
      if (logic[ref] !== value)
        return clues.Promise.try(function() {
          Object.defineProperty(logic,ref,{value: value, enumerable: true, configurable: true});
          return value;
        })
        .catch(function(e) {
          return value.then(function(value) {
            return clues.Promise.reject({ref : ref, message: 'Object immutable', fullref:fullref,caller: caller, stack:e.stack, value: value});
          });
        });
    }

    return value;
    
  }

})(this);