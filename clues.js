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

  function clues(logic,facts) {
    if (!(this instanceof clues))
      return new clues(logic,facts);
    this.logic = logic || (typeof window === 'undefined' ? {} : window);
    this.facts = facts || {};
    this.self = this;
  }

  clues.version = "2.0.0";

  clues.prototype.solve = function(fn,local) {
    var self = this, ref;

    if (typeof fn !== "function") {
      ref = fn;

      // If we have already determined the fact we simply return it
      if (self.facts[ref] !== undefined) return self.Promise.fulfilled(self.facts[ref]);

      // If we can't find any logic, we check self and local before returning an error
      if (self.logic[ref] === undefined) {
        if (local && local[ref] !== undefined) return self.Promise.fulfilled(local[ref]);
        else if (self[ref] !== undefined) return self.Promise.fulfilled(self[ref]);
        else if (ref === 'local') return self.Promise.fulfilled(local);
        else return self.Promise.rejected({ref: ref, message: ref+' not defined', name: 'Undefined'});
      }

      // If the logic reference is not a function, we simply return the value
      if (typeof self.logic[ref] !== 'function' ) return self.Promise.fulfilled(self.logic[ref]);
      fn = self.logic[ref];
    }

    var args = matchArgs(fn)
      .map(function(arg) {
        var optional = arg[0] === '_';
        if (optional) arg = arg.slice(1);

        return self.solve(arg,local)
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
        if (!e.ref)
          e.ref = ref;
        throw e;
      });
  };

  clues.prototype.solver = function(d,e) {
    return this.solve.bind(this,d,e);
  };

  clues.prototype.fork = function(update) {
    update = update || {};
    var facts = Object.create(this.facts);
    Object.keys(update).forEach(function(key) {
      facts[key] = update[key];
    });
    return clues(this.logic,facts);
  };
})(this);