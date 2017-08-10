(function(self) {
  if (typeof module !== 'undefined') {
    clues.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.Promise = self.Promise;
    self.clues = clues;
  }

  var reArgs = /^\s*function.*?\(([^)]*?)\).*/;
  var reEs6 =  /^\s*\({0,1}(.*?)\){0,1}\s*=>/;
  var reEs6Class = /^\s*[a-zA-Z0-9\-\$\_]+\((.*?)\)\s*{/;
  var reject = (e,fullref,caller) => clues.Promise.reject({ref : e.ref || fullref, message: e.message || e, fullref: e.fullref || fullref, caller: e.caller || caller, stack: e.stack, error: true});
  var rejectSuppressed = (e,fullref,caller) => { e = reject(e,fullref,caller); e.suppressUnhandledRejections(); return e; };
  var isPromise = f => f && f.then && typeof f.then === 'function';

  function matchArgs(fn) {
    if (!fn.__args__) {
      var match = fn.prototype && fn.prototype.constructor.toString() || fn.toString();
      match = match.replace(/^\s*async/,'');
      match = reArgs.exec(match) || reEs6.exec(match) || reEs6Class.exec(match);
      fn.__args__ = !match ? [] : match[1].replace(/\s/g,'')
        .split(',')
        .filter(function(d) {
          return d.length;
        });
    }
    return fn.__args__;
  }

  function clues(logic,fn,$global,caller,fullref) {
    try { return clues.Promise.resolve(_rawClues(logic,fn,$global,caller,fullref)); }
    catch (e) { return reject(e,fullref,caller) }
  }

  function promiseHelper(val, success, error, _finally, _errorMessage) {
    if (isPromise(val)) {
      // if it's already resolve, we can just use that direct
      if (val.isFulfilled && val.isFulfilled()) return promiseHelper(val.value(), success, error, _finally);
      if (val.isRejected && val.isRejected()) return promiseHelper(null, success, error, _finally, val.reason());

      let result = val;
      if (success) result = result.then(success);
      if (error) result = result.catch(error);
      if (_finally) result = result.finally(_finally);
      return result;
    }

    if (_errorMessage) {
      let result = val, rethrow = _errorMessage;
      if (error) {
        try { 
          result = error(_errorMessage);
          rethrow = null;
        } catch (e) { rethrow = e; }
      }
      if (_finally) _finally(val);
      if (rethrow) throw rethrow;
      return result;
    }

    let result = null;
    try { result = success(val); } 
    catch (e) { return promiseHelper(null, success, error, _finally, e); }
    if (_finally) _finally(val);
    return result;
  }

  function storeRef(logic, ref, value, fullref, caller) {
    if (ref) {
      logic[ref] = value;
      if (logic[ref] !== value) {
        try {
          Object.defineProperty(logic,ref,{value: value, enumerable: true, configurable: true, writable: true});
          return value;
        }
        catch (e) {
          throw {ref : ref, message: 'Object immutable', fullref:fullref,caller: caller, stack:e.stack, value: value,error:true};
        }
      }
    }
  }

  function _rawClues(logic,fn,$global,caller,fullref) {
    var args,ref;

    if (!$global) $global = {};

    if (typeof logic === 'function' || isPromise(logic))
      return promiseHelper(_rawClues({},logic,$global,caller,fullref),
        logic => _rawClues(logic,fn,$global,caller,fullref));
      
    if (typeof fn === 'string') {
      ref = fn;
    
      var dot = ref.search(/ᐅ|\./);
      if (dot > -1 && (!logic || logic[ref] === undefined)) {
        var next = ref.slice(0,dot);
        var nextFullRef = (fullref ? fullref+'.' : '')+next;

        let handleError = e => {
          if (e && e.notDefined && logic && logic.$external && typeof logic.$external === 'function') {
            if (!logic[ref]) {
              try {
                storeRef(logic, ref, _rawClues(logic,function() { return logic.$external.call(logic,ref); },$global,ref,(fullref ? fullref+'.' : '')+ref), fullref, caller);
              }
              catch (e) {
                fullref = (fullref ? fullref+'.' : '')+ref;
                storeRef(logic, ref, rejectSuppressed({ref : ref, message: e.message || e, fullref:fullref, caller: ref, stack:e.stack, value: value, error:true}), fullref, caller);
              }
            }
            return logic[ref];
          }
          else {
            throw e;
          } 
        }

        return promiseHelper(_rawClues(logic,next,$global,caller,fullref),
          d => {
            logic = d;
            fullref = (fullref ? fullref+'.' : '')+next;
            ref = ref.slice(dot+1);
            return promiseHelper(_rawClues(logic,ref,$global,caller,fullref), a => a, handleError);
          },
          handleError);
      }

      fullref = (fullref ? fullref+'.' : '')+ref;
      fn = logic ? logic[ref] : undefined;
      if (fn === undefined) {
        if (typeof(logic) === 'object' && logic !== null && (Object.getPrototypeOf(logic) || {})[ref] !== undefined)
          fn = Object.getPrototypeOf(logic)[ref];
        else if ($global[ref] && caller && caller !== '__user__')
          return _rawClues($global,ref,$global,caller,fullref);
        else if (logic && logic.$property && typeof logic.$property === 'function')
          fn = logic[ref] = function() { return logic.$property.call(logic,ref); };
        else return clues.Promise.reject({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller, notDefined:true, error:true});
      }
    }

    // Support an array with some argument names in front and the function as last element
    if (typeof fn === 'object' && fn && fn.length && typeof fn[fn.length-1] == 'function') {
      if (fn.length > 1 && (typeof(fn[0]) === 'object' || typeof(fn[0]) == 'function') && !fn[0].length) {
        var obj = fn[0];
        fn = fn.slice(1);
        if (fn.length === 1) fn = fn[0];
        var result = _rawClues(obj,fn,$global,caller,fullref);
        if (ref) {
          logic[ref] = result; 
        }
        return result;
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
     return clues.Promise.reject({ref : ref, message: ref+' not defined', fullref:fullref,caller: caller, notDefined:true, error:true});

    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function' || ((ref && ref[0] === '$') && fn.name !== '$prep')) {
      // If the value is a promise we wait for it to resolve to inspect the result
      if (isPromise(fn))
        return promiseHelper(fn, d => {
          return (typeof d == 'function' || (d && typeof d == 'object' && d.length)) ? _rawClues(logic,d,$global,caller,fullref) : d;
        });
      else 
        return fn
    }

    args = (args || matchArgs(fn));

    // Shortcuts to define empty objects with $property or $external
    if (fn.name === '$property' || (args[0] === '$property' && args.length === 1)) return logic[ref] = {$property: fn.bind(logic)};
    if (fn.name === '$external' || (args[0] === '$external' && args.length === 1)) return logic[ref] = {$external: fn.bind(logic)};
    if (fn.name === '$service') return fn;
    
    let argsHasPromise = false;
    args = args.map(function(arg) {
      var optional,showError,res;
      if (optional = (arg[0] === '_')) arg = arg.slice(1);
      if (showError = (arg[0] === '_')) arg = arg.slice(1);

      if (arg[0] === '$' && logic[arg] === undefined) {
        if (arg === '$caller') return caller;
        else if (arg === '$fullref') return fullref;
        else if (arg === '$global') return $global;
      }

      let processError = e => {
        if (optional) return (showError) ? e : undefined;
        throw e;
      };

      try {
        res = promiseHelper(_rawClues(logic,arg,$global,ref || 'fn',fullref), d => d, processError);
      }
      catch (e) {
        res = processError(e);
      }

      if (!argsHasPromise && isPromise(res)) argsHasPromise = true;

      return res;
    });

    var inputs = argsHasPromise ? clues.Promise.all(args) : args,
        wait = Date.now(),
        duration;

    var value = promiseHelper(inputs,
      args => {
        duration = Date.now();

        try {
          let result = fn.apply(logic || {}, args);
          if (isPromise(result) && !result.isFulfilled) result = Promise.resolve(result); // wrap non-bluebird promise
          return result;
        }
        catch (e) {
          // If fn is a class we solve for the constructor variables (if defined) and return a new instance
          if (e instanceof TypeError && /^Class constructor/.exec(e.message)) {
            args = (/constructor\s*\((.*?)\)/.exec(fn.toString()) || [])[1];
            args = args ? args.split(',') : [];
            return [logic].concat(args).concat(function() {
              args = [null].concat(Array.prototype.slice.call(arguments));
              return new (Function.prototype.bind.apply(fn,args));
            });
          }
          e = {ref : ref, message: e.message || e, fullref:fullref, caller: caller, stack:e.stack, value: value, error:true};
          
          if (e && e.stack && typeof $global.$logError === 'function')
            $global.$logError(e, fullref);
          
          storeRef(logic, ref, rejectSuppressed(e), fullref, caller);
          throw e;
        }
      },
      error => { throw error; },
      () => {
        if (typeof $global.$duration === 'function')
          $global.$duration(fullref || ref || (fn && fn.name),[(Date.now()-duration),(Date.now())-wait],ref);
      });

    value = promiseHelper(value, 
      d => {
        return (typeof d == 'string' || typeof d == 'number') ? d : _rawClues(logic,d,$global,caller,fullref);
      },
      e => {
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

    storeRef(logic, ref, value, fullref, caller);
    return value;
  }

})(this);