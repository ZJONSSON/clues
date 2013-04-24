/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    C1;

var simple = {
  A: function(resolve) {
    setTimeout(function() {
      resolve(42);
    },200);
  },
  B: function(A,resolve) {
    setTimeout(function() {
      resolve("Answer is "+A);
    });
  },
  C : function(_default,resolve) {
    resolve(_default);
  },
  irrelevant : function(resolve) {
    setTimeout(function() {
      resolve("irrelevant");
    });
  },
  _default : 999
};

var complex = {
  M1 : function(callback) {
    setTimeout(function() {
      callback(null,10);
    },100);
  },
  M2 : function(callback) {
    setTimeout(function() {
      callback(null,20);
    },300);
  },
  M3 : function(M1,M2,callback) {
    setTimeout(function() {
      callback(null,M1+M2);
    },50);
  },
  M4 : function(callback) {
    setTimeout(function() {
      callback(null,70);
    },150);
  },
  MTOP : function(M3,M4,callback) {
    callback(null,M3+M4);
  }
};

var S1 = clues(simple),
    S2 = clues(simple);

vows.describe("clues").addBatch({
  "clues by function" : {
    topic : function() {
      var self = this;
      clues(simple).solve(function(A) {
        self.callback(null,A);
      });
    },
    "returns correct value" : function(d) {
      assert.equal(d,42);
    }
  },
  "clues by name" : {
    topic : function() {
      var self = this;
      clues(simple)
        .solve("A")
        .then(function(d) {
          self.callback(null,d);
        });
    },
    "returns correct value" : function(d) {
      assert.equal(d,42);
    }
  },
  'clues.facts' : {
    topic : function() {
      var self = this;
      S1.time = new Date();
      S1.solve(function(A) {
        self.callback(null,A);
      });
    },
    "returns correct variable" : function(d) {
      assert.equal(d,42);
    },
    "waits for solveution" : function() {
      var wait = (new Date()) - S1.time;
      assert.equal(wait >= 200,true,"wait was "+wait);
    },
    "memoization" : {
      topic : function() {
        var that = this;
        S1.time = new Date();
        S1.solve(function(A) {
          that.callback(null,A);
        });
      },
      "The time to fetch again is zero" : function(d) {
        var wait = (new Date()) -S1.time;
        assert.equal(wait<50,true,"wait was "+wait);
        assert.equal(d,42);
      },
      "fact table reflects the value" : function() {
        assert.equal(S1.facts.A,42);
      },
      "only required facts are resolved " : function() {
        assert.isUndefined(S1.facts.C);
      }
    }
  },

  "_default value in logic" : {
    "without a fact" : {
      topic : function() {
        var self = this;
        S2.solve("_default")
          .then(function(d) {
            self.callback(null,d);
          });
      },
      "logic value is returned as a fact" : function(d) {
        assert.equal(d,999);
      }
    },
    "dependent function" : {
      topic : function() {
        var self = this;
        S2.solve("C")
          .then(function(d) {
            self.callback(null,d);
          });
      },
      "returns derived value" : function(d) {
        assert.equal(d,999);
      },
      "fact table is not updated" : function(d) {
        assert.isUndefined(S2.facts['_default']);
      }
    },
    "with a overriding fact" : {
      topic : function() {
        var self = this;
        clues(simple,{"_default":20})
          .solve("_default")
          .then(function(d) {
            self.callback(null,d);
          });
      },
      "returns the fact, not the _default value" : function(d) {
        assert.equal(d,20);
      }
    }
  },
  "non-existing argument" : {
    topic : function() {
      var self = this;
      clues(simple)
        .solve("SOMETHING")
        .then(null, function(d) { self.callback(null,d); });
    },
    "returns an error" : function(err) {
      assert.deepEqual(err, { "ref": 'SOMETHING', "err": 'not defined' });
    }
  },

  "multiple callbacks" : {
    topic : function() {
      var self = this;
      clues({
        A : function(resolve,callback,error) {
          callback(null,42);
          callback(null,19);
        }
      }).solve("A")
        .then(function(d) {
          self.callback(null,d);
        });
    },
    "only first callback is used, rest goes to noop()" : function(d) {
      assert.equal(d,42);
    }
  },
  "errors" : {
    topic : function() {
      var self = this;
      E1 = clues({
        ERR : function(error) {
          error("Could not process");
        },
        DEP : function(ERR,callback) {
          callback(42);
        }
      });
      E1.solve("DEP")
        .then(null,function(d) { self.callback(null,d);});
    },
    "show up as first argument (err)" : function(err) {
      assert.deepEqual(err,{ ref: 'ERR', err: 'Could not process' });
    },
    "facts of the error ref and all dependents are undefined" : function(err,d) {
      assert.isUndefined(E1.facts.F);
      assert.isUndefined(E1.facts.G);
    }
  },
  "reserved function arguments defined in the context object" : {
    topic : function() {
      var that = this;

      clues(simple).solve(function(A,resolve,error,callback,success,facts,reject) {
        that.callback(null,{facts:facts,callback:callback,success:success,resolve:resolve,error:error,reject:reject});
      });
    },
    "facts is an object" : function(d) {
      assert.isObject(d.facts);
    },
    "callback, resolve/success and reject/error are functions" : function(d) {
      assert.isFunction(d.callback);
      assert.isFunction(d.success);
      assert.isFunction(d.resolve);
      assert.isFunction(d.error);
      assert.isFunction(d.reject);
    }
  },

  "complex tree " : {
    topic : function() {
      var self = this;
      C1 = clues(complex);
      C1.solve("MTOP").then(function(d) { self.callback(null,d);});
    },
    "is resolved to the top value" : function(d) {
        assert.equal(d,100);
      },
    "" : {
      topic : function() {
        var self=this;
        C1.solve(function(facts) {
          self.callback(null,facts);
        });
      },
      "fact table is correct" : function(d) {
        assert.isNumber(d.M1);
        assert.isNumber(d.M2);
        assert.isNumber(d.M3);
        assert.isNumber(d.M4);
        assert.isNumber(d.MTOP);
      },
      /**/
      /*
      "solve.set()" : {
        topic : function() {
          C1.set("M1",20);
          return true;
        },
        "changes the respective value" : function(d) {
          assert.equal(C1.facts.M1,20);
        },
        "and sets children of that reference to undefined" : function(d) {
          assert.isUndefined(C1.facts.M3);
          assert.isUndefined(C1.facts.MTOP);
        },
        "without touching the other facts" : function(d) {
          assert.isNumber(C1.facts.M2);
          assert.isNumber(C1.facts.M4);
        },
        "... subsequent solve" : {
          topic : function() {
            C1.solve("MTOP",this.callback);
          },
          "returns an updated value based on the new fact" : function(d) {
            assert.equal(d,110);
          }
        }
      }
      */
    }
  },

  "keyword all" : {
    topic : function() {
      var that = this;
      clues(complex)
        .solve(function(all) {
          that.callback(null,all);
        });
    },
    "returns all facts as resolved"  : function(d) {
      assert.isNumber(d.M1);
      assert.isNumber(d.M2);
      assert.isNumber(d.M3);
      assert.isNumber(d.M4);
      assert.isNumber(d.MTOP);
      assert.equal(d.MTOP,100);
    }
  },

  "as()" : {
    topic : function() {
      var i = clues(),
          that = this;

      function tester(cb) {
        setTimeout(function() {
          cb(null,10);
        },2000);
      }
      tester(i.as("a"));

      i.solve("a").then(function(d) {
        that.callback(null,d);
      });
    },
    "is handled by the clues object" : function(d) {
      assert.equal(d,10);
    }
  },
  "local" : {
    topic : function() {
      var that = this;

      var logic = {
        "A" : function(B,resolve) {
          resolve(B+10);
        },
        "B" : function(C,resolve) {
          resolve(C+10);
        },
        "C" : function(resolve) {
          resolve(1);
        }
      };

      clues(logic)
        .solve("A")
        .then(function(d) {
          that.callback(null,d);
        },console.log);
    },
    "takes in account the session variable" : function(d) {
      assert.equal(d,21);
    }
  }
})
.export(module);