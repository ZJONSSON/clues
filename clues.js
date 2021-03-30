(function(self) {
  'use strict';
  if (typeof module !== 'undefined') {
    clues.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.Promise = self.Promise;
    self.clues = clues;
  }

  var reArgs = /^\s*function.*?\(([^)]*?)\).*/;
  var reEs6 =  /^\s*\({0,1}([^)]*?)\){0,1}\s*=>/;
  var reEs6Class = /^\s*[a-zA-Z0-9\-$_]+\s*\((.*?)\)\s*{/;
  var createEx = (e,fullref,caller,ref,report) => {
    if (e.fullref) return e;
    let result = {ref : e.ref || ref || fullref, message: e.message || e, fullref: e.fullref || fullref, caller: e.caller || caller, stack: e.stack || '', error: true, notDefined: e.notDefined, report: e.report || report, value: e.value, cache: e.cache, cluesHasLogged: e.cluesHasLogged};
    return result;
  }; 
  var reject = (e,fullref,caller,ref) => clues.reject(createEx(e || {},fullref,caller,ref));
  var isPromise = f => f && f.then && typeof f.then === 'function';
  var noop = d => d;
  var undefinedPromise = clues.Promise.resolve(undefined);
  var fakePrivate = function(){};
  fakePrivate.private = true;

  function matchArgs(fn) {
    if (!fn.__args__) {
      var match = fn.prototype && fn.prototype.constructor.toString() || fn.toString();
      match = match.replace(/^\s*async/,'');
      match = reArgs.exec(match) || reEs6.exec(match) || reEs6Class.exec(match);
      fn.__args__ = !match ? [] : match[1].replace(/\s/g,'')
        .split(',')
        .filter(function(d) {
          if (d === '$private')
            fn.private = true;
          if (d === '$prep')
            fn.prep = true;
          return d.length;
        });
    }
    return fn.__args__;
  }


  // fast promise rejection
  const Rejection = clues.Promise.reject();
  Rejection.suppressUnhandledRejections();
  clues.reject = d => Object.create(Rejection,{_fulfillmentHandler0: {value: d}});

  function clues(logic,fn,$global,caller,fullref) {
    try { 
      let rawCluesResult = _rawClues(logic,fn,$global,caller,fullref);
      return clues.Promise.resolve(rawCluesResult); 
    }
    catch (e) { 
      return reject(e,fullref,caller);
    }
  }

  function promiseHelper(val, success, error, _finally, _errorMessage) {
    if (isPromise(val)) {
      // if it's already resolve, we can just use that direct
      if (!val.isFulfilled) val = clues.Promise.resolve(val);
      if (val.isFulfilled()) return promiseHelper(val.value(), success, error, _finally);
      if (val.isRejected()) return promiseHelper(null, success, error, _finally, val.reason());

      let result = val;
      if (success) result = result.then(success);
      if (error) result = result.catch(error);
      if (_finally) result = result.finally(_finally);
      return result;
    }

    if (_errorMessage) {
      let result = reject(_errorMessage);
      if (error) {
        result = error(_errorMessage);
      }
      if (_finally) _finally(val);
      return result;
    }

    let result = null;
    try { 
      result = success(val); 
      if (isPromise(result) && result.isRejected && result.isRejected()) {
        result = promiseHelper(null, success, error, _finally, result.reason());
      }
    } 
    catch (e) { result = promiseHelper(null, success, error, _finally, e); }
    if (_finally) _finally(val);
    return result;
  }

  function storeRef(logic, ref, value, fullref, caller) {
    if (ref) {
      try {
        logic[ref] = value;
      }
      catch (e) {
        try {
          Object.defineProperty(logic,ref,{value: value, enumerable: true, configurable: true, writable: true});
          return value;
        }
        catch (e) {
          return reject({ref : ref, message: 'Object immutable', fullref:fullref,caller: caller, stack: e.stack || '', value: value,error:true});
        }
      }
    }
    return value;
  }

  function expandFullRef(fullref, next) {
    var separator = fullref && fullref[fullref.length-1] !== '(' && '.' || '';
    return (fullref ? fullref+separator : '')+next;
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

        let handleError = e => {
          if (e && e.notDefined && logic && logic.$external && typeof logic.$external === 'function') {
            if (!logic[ref]) {
              try {
                return storeRef(logic, ref, _rawClues(logic,function() { return logic.$external.call(logic,ref); },$global,ref,expandFullRef(fullref, ref)), fullref, caller);
              }
              catch (e) {
                fullref = expandFullRef(fullref, ref);
                return storeRef(logic, ref, reject({message:e.message || e, value: value}, fullref, ref, ref), fullref, caller);
              }
            }
            return logic[ref];
          }
          else {
            return reject(e);
          } 
        };

        return promiseHelper(_rawClues(logic,next,$global,caller,fullref),
          d => {
            logic = d;
            fullref = expandFullRef(fullref, next);
            ref = ref.slice(dot+1);
            return promiseHelper(_rawClues(logic,ref,$global,caller,fullref), a => a, handleError);
          },
          handleError);
      }

      fullref = expandFullRef(fullref, ref);
      fn = logic ? logic[ref] : undefined;
      if (fn === undefined) {
        if (typeof(logic) === 'object' && logic !== null && (Object.getPrototypeOf(logic) || {})[ref] !== undefined)
          fn = Object.getPrototypeOf(logic)[ref];
        else if ($global[ref] && caller && caller !== '__user__')
          return _rawClues($global,ref,$global,caller,fullref);
        else if (logic && logic.$property && typeof logic.$property === 'function')
          fn = logic[ref] = function() { return logic.$property.call(logic,ref); };
        else return reject({message: ref+' not defined', notDefined:true},fullref,caller,ref);
      }
    }

    // Support an array with some argument names in front and the function as last element
    if (typeof fn === 'object' && fn && fn.length && typeof fn[fn.length-1] == 'function') {
      if (fn.length > 1 && (typeof(fn[0]) === 'object' || typeof(fn[0]) == 'function') && !fn[0].length) {
        var obj = fn[0];
        fn = fn.slice(1);
        if (fn.length === 1) fn = fn[0];
        var result = _rawClues(obj,fn,$global,caller,fullref);
        return storeRef(logic, ref, result, fullref, caller);
      }
      args = fn.slice(0,fn.length-1);
      fn = fn[fn.length-1];
      var fnArgs = matchArgs(fn);
      var numExtraArgs = fnArgs.length-args.length;
      if (numExtraArgs) {
        args = args.concat(fnArgs.slice(numExtraArgs));
      }
    }

    if (typeof fn === 'function')
      args = (args || matchArgs(fn));

    // If fn name is private or promise private is true, reject when called directly
    if (fn && (!caller || caller == '__user__') && ((typeof(fn) === 'function' && (fn.private || fn.name == '$private' || fn.name == 'private')) || (fn.then && fn.private)))
     return reject({message: ref+' not defined', notDefined:true }, fullref, caller, ref);

    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function' || ((ref && ref[0] === '$') && !fn.prep && fn.name !== '$prep')) {
      // If the value is a promise we wait for it to resolve to inspect the result
      if (isPromise(fn))
        return promiseHelper(fn, d => {
          return (typeof d == 'function' || (d && typeof d == 'object' && d.length)) ? _rawClues(logic,d,$global,caller,fullref) : d;
        });
      else 
        return fn;
    }

    // Shortcuts to define empty objects with $property or $external
    if (fn.name === '$property' || (args[0] === '$property' && args.length === 1)) return storeRef(logic, ref, {$property: fn.bind(logic)}, fullref, caller);
    if (fn.name === '$external' || (args[0] === '$external' && args.length === 1)) return storeRef(logic, ref, {$external: fn.bind(logic)}, fullref, caller);
    if (fn.name === '$service') return fn;
    
    let argsHasPromise = false, errorArgs = null;
    args = args.map(function(arg) {
      if (arg === null || arg === undefined) return arg;
      var optional,showError,res;
      if ((optional = (arg[0] === '_'))) arg = arg.slice(1);
      if ((showError = (arg[0] === '_'))) arg = arg.slice(1);

      if (arg[0] === '$' && logic[arg] === undefined) {
        if (arg === '$caller') return caller;
        else if (arg === '$fullref') return fullref;
        else if (arg === '$global') return $global;
        else if (arg === '$private') {
          fn.private = true;
          return true;
        }
        else if (arg === '$prep') {
          fn.prep = true;
          return true;
        }
      }

      let processError = e => {
        if (optional) return (showError) ? e : undefined;
        let rejection = reject(e);
        if (!errorArgs) errorArgs = rejection;
        return rejection;
      };

      try {
        res = promiseHelper(_rawClues(logic,arg,$global,ref || 'fn',fullref + '('), d => d, processError);
      }
      catch (e) {
        res = processError(e);
      }

      if (!argsHasPromise && isPromise(res)) argsHasPromise = true;

      return res;
    });

    var inputs = errorArgs ? errorArgs : (argsHasPromise ? clues.Promise.all(args) : args),
        wait = Date.now(),
        duration, 
        hasHandledError = false;

    let solveFn = args => {
      duration = Date.now();
      let result = null;
      try {
        result = fn.apply(logic || {}, args);
        if (result === undefined) {
          result = undefinedPromise;
          fn = fakePrivate; // private function results remain promises in `Logic`.  We don't want to modify the fn, and this is somewhat more efficient than adding another flag
        }
      }
      catch (e) {
        // If fn is a class we solve for the constructor variables (if defined) and return a new instance
        if (e instanceof TypeError && /^Class constructor/.exec(e.message)) {
          let constructorArgs = (/constructor\s*\((.*?)\)/.exec(fn.toString()) || [])[1];
          constructorArgs = constructorArgs ? constructorArgs.split(',').map(d => d.trim()) : [];
          constructorArgs.push(function() {
            let newObj = new (Function.prototype.bind.apply(fn,[null].concat(Array.prototype.slice.call(arguments))));
            return newObj;
          });

          result = _rawClues(logic,constructorArgs,$global,ref || 'fn',fullref);
        }
        else {
          throw e;
        }
      }

      if (isPromise(result) && !result.isFulfilled) result = clues.Promise.resolve(result); // wrap non-bluebird promise
      return result;
    };

    let handleError = e => {
      if (hasHandledError) return reject(e);
      hasHandledError = true;

      let wrappedEx = createEx(e || {}, fullref, caller, ref, true);
      if (e && e.stack && !wrappedEx.cluesHasLogged && typeof $global.$logError === 'function') {
        wrappedEx.cluesHasLogged = true;
        $global.$logError(wrappedEx, fullref);
      }
      return storeRef(logic, ref, reject(wrappedEx), fullref, caller);
    };

    let captureTime = () => {
      if (typeof $global.$duration === 'function')
        $global.$duration(fullref || ref || (fn && fn.name),[(Date.now()-duration),(Date.now())-wait],ref);
    };

    var value = null;
    if (errorArgs) {
      args.forEach(input => input && input.suppressUnhandledRejections && input.suppressUnhandledRejections());
      value = handleError(errorArgs.reason());
    }
    else if (isPromise(inputs)) {
      value = inputs.then(d => solveFn(d)).catch(e => {
        return handleError(e);
      }).finally(captureTime);
    }
    else {
      try { value = solveFn(inputs); }
      catch (e) { value = handleError(e); }
    }

    value = promiseHelper(value, noop, handleError, captureTime);

    value = promiseHelper(value, 
      d => (typeof d == 'string' || typeof d == 'number') ? d : _rawClues(logic,d,$global,caller,fullref),
      e => reject(e, fullref, caller, ref)
    );

    if (fn.name == 'private' || fn.name == '$private' || fn.private) {
      if (!isPromise(value)) value = clues.Promise.resolve(value);
      value.private = true;
    }

    return storeRef(logic, ref, value, fullref, caller);
  }

})(this);
