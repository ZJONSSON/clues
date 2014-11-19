// clues.js (c) 2009-2014 Ziggy.jonsson.nyc@gmail.com @license MIT

(function(self) {
  if (typeof module !== 'undefined') {
    clues.prototype.Promise = require('bluebird');
    module.exports = clues;
  } else {
    clues.prototype.Promise = self.Promise;
    self.clues = clues;
  }

  // Extract argument names from a function
  var reArgs = /function.*?\((.*?)\).*/;
  function matchArgs(fn) {
    if (!fn.__args__) {
      var match = reArgs.exec(fn.prototype.constructor.toString());
      fn.__args__ = match[1].replace(/\s/g,'')
        .split(",")
        .filter(function(d) {
          return d.length;
        });
    }
    return fn.__args__;
  }

  function clues(logic,facts,options) {
    if (!(this instanceof clues))
      return new clues(logic,facts);
    this.logic = logic || (typeof window === 'undefined' ? {} : window);
    this.facts = facts || {};
    this.options = options || {};
    this.self = this;
  }

  clues.version = "2.5.0";

  clues.prototype.solve = function(fn,local,caller,fullref) {
    var self = this, ref, args;
    local = local || {};

    if (typeof fn === "string") {
      ref = fn;

      // If we have already determined the fact we simply return it
      if (self.facts[ref] !== undefined) return self.Promise.fulfilled(self.facts[ref]);

      // If the reference contains dots we solve recursively
      if (!self.options.ignoreDots && ref.indexOf('.') > -1) {
        var keys = ref.split('.'), i=-1;
        
        return function next(d) {
          var key = keys[++i];
          if (!key) return self.Promise.fulfilled(d);
          fullref = fullref ? fullref+'.'+key : key;
          if (typeof d !== 'object') throw {ref: ref, fullref: fullref || ref, caller: caller, message: ref+' not defined', name: 'Undefined'};
          if (!d.solve) d = clues(d,{},self.options);
          return d.facts[keys.slice(i).join('.')] = d.solve(key,local,caller,fullref).then(next);
        }(self);
      }

      // If we can't find any logic, we check self and local before returning an error
      if (self.logic[ref] === undefined) {
        if (caller !== '__user__') {
          if (local[ref] !== undefined) return self.Promise.fulfilled(local[ref]);
          if (self[ref] !== undefined && typeof self[ref] !== 'function') return self.Promise.fulfilled(self[ref]);
        }
        if (typeof(self.options.fallback) === 'function') return self.facts[ref] = self.options.fallback.call(this,ref,local,caller);
        return self.Promise.rejected({ref: ref, fullref: fullref || ref, caller: caller, message: ref+' not defined', name: 'Undefined'});
      }

      fn = self.logic[ref];
    }

    // Support an array with argument names in front and the function as last element
    if (typeof fn === 'object' && fn.length && typeof fn[fn.length-1] == 'function') {
      args = fn.slice(0,fn.length-1);
      fn = fn[fn.length-1];
    }

    // If the logic reference is not a function, we simply return the value
    if (typeof fn !== 'function') return self.facts[ref] = self.Promise.fulfilled(fn);

    args = (args || matchArgs(fn))
      .map(function(arg) {
        var optional = arg[0] === '_';
        if (optional) arg = arg.slice(1);

        return self.solve(arg,local,ref)
          .then(null,function(e) {
            if (optional) return undefined;
            else throw e;
          });
      });

    // Wait for all arguments to be resolved before executing the function
    var inputs =  self.Promise.all(args);
    if (inputs.cancellable) inputs = inputs.cancellable();

    return self.facts[ref] = inputs
      .then(function(args) {
        return fn.apply(self,args);
      })
      .then(null,function(e) {
        if (e.name && e.name == 'CancellationError')
          return args.forEach(function(arg) { arg.cancel(); });
        if (typeof e !== 'object')
          e = { message : e};
        e.ref = e.ref || ref;
        e.fullref = e.fullref || fullref;
        e.caller = e.caller || caller || '';
        throw e;
      });
  };

  clues.prototype.solver = function(d,e,f) {
    return this.solve.bind(this,d,e,f);
  };

  clues.prototype.fork = function(update) {
    update = update || {};
    var facts = Object.create(this.facts);
    Object.keys(update).forEach(function(key) {
      facts[key] = update[key];
    });
    return clues(this.logic,facts);
  };

  clues.prototype.clues = clues;
})(this);