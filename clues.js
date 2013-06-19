/**
  * clues.js (c) 2009-2013 Ziggy.jonsson.nyc@gmail.com
  * @license MIT
  */

(function(self) {
  var Q;

  if (typeof module !== 'undefined') {
    Q = require("q");
    module.exports = clues;
  } else {
    Q = self.Q;
    self.clues = clues;
  }

  clues.version = "0.0.7";

  function clues(logic,facts) {
    if (!(this instanceof clues))
      return new clues(logic,facts);
    this.logic = logic || (typeof window === 'undefined' ? {} : window);
    this.facts = facts || {};
  }

  // Extract argument names from a function
  var reArgs = /function.*?\((.*?)\).*/;
  function matchArgs(fn) {
    if (fn.__args__) return fn.__args__;
    var match = reArgs.exec(fn.prototype.constructor.toString());
    return fn.__args__ = match[1].replace(/\s/g,'').split(",");
  }

  clues.prototype.solve = function(fn,local) {
    var self = this;
    var promise = self.adapter,
        p = promise.pending(),
        ref;

    local = local || {};

    if (typeof fn !== "function") {
      ref = fn;
      // Local variables supercede anything else
      if (local[ref]) return promise.fulfilled(local[ref]);
      // If we have already determined the fact we simply return it
      if (self.facts[ref] !== undefined) return promise.fulfilled(self.facts[ref]);
      // If we can't find any logic for the reference at this point, we return an error
      if (self.logic[ref] === undefined) return promise.rejected({ref:ref,err:'not defined'});
      // If the logic reference is not a function, we simply return the value
      if (typeof self.logic[ref] !== 'function' ) return promise.fulfilled(self.logic[ref]);
      // Schedule an update where we overwrite fact table with the result
      self.facts[ref] = p.promise;
      p.promise.then(function(d) {
        self.facts[ref] = d;
      });
      // Moving on to the defined function of the logic table
      fn = self.logic[ref];
    }

    // Create a local context object (this) for the function
    var context = {
      ref : ref,
      self : self,
      local : local,
      facts : self.facts,
      promise : p.promise,
      fulfill : p.fulfill,
      reject: p.reject,
      callback : function(err,d) {
        if (err) p.reject(err);
        else p.fulfill(d);
      }
    };
    context.resolve = context.success = context.fulfill;
    context.error = context.reject;

    var args = matchArgs(fn)
      .filter(function(d) { return d.length; })
      .map(function(arg) {
        // Request for 'all' variables is handled specially
        if (arg == 'all') return self.all();
        // If arg is in context we apply directly, otherwise we need to solve for the answer
        return context[arg] || self.solve(arg,local);
      });

    // Wait for all arguments to be resolved before executing the function
    this.join(args)
      .then(function() {
        var value =  self.wrap.call(context,fn,args);
        if (value !== undefined) {
          if (value.then) value.then(p.fulfill,p.reject);
          else p.fulfill(value);
        }
      })
      .then(null,function(err) {
        p.reject(err);
      });

    return p.promise
      .then(null,function(e) {
        // Convert error object to text
        if (e.message) e = e.message;
        // Add a reference, if it doesn't exist
        if (!e.ref) e= {ref:ref,err:e};
        throw e;
      });
  };

  clues.prototype.wrap = function(fn,args) {
    return fn.apply(this,args);
  };

  // Resolves all logic into facts
  clues.prototype.all = function(local) {
    var self = this,_all;
    _all = Object.keys(self.logic)
      .map(function(key) {
        return self.solve(key,local);
      });
    return self.join.call(this,_all)
      .then(function() { return self.facts;});
  };

  // Conveniently define a node callback as a logic function
  clues.prototype.as = function(ref) {
    var self = this,
        defer = self.adapter.pending();
    self.facts[ref] = defer.promise;
    return function(err,d) {
      if (err) defer.reject(err);
      else defer.fulfill(d);
      self.facts[ref] = d;
    };
  };

  // Default Promises Adapter (uses Q)
  if (Q !== 'undefined')
    clues.prototype.adapter = {
      fulfilled : Q.resolve,
      rejected : Q.reject,
      pending : function () {
        var deferred = Q.defer();
        return {
          promise: deferred.promise,
          fulfill: deferred.resolve,
          reject: deferred.reject
        };
      }
    };

  // Default join/all function (works for any standard adaptor)
  clues.prototype.join = function(args) {
    var l = args.length,
        p = this.adapter.pending();

    if (!l) p.fulfill([]);
    args.forEach(function(d,i) {
      if (!d.then) return !(l-=1) && p.fulfill(args);
      d.then(
        function(d) {
          args[i] = d;
          return !(l-=1) && p.fulfill(args);
        },
        p.reject);
    });
    return p.promise;
  };


})(this);