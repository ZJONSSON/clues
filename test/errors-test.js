/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

vows.describe("errors").addBatch({
   "non-existing argument" : {
    topic : function() {
      var self = this;
      clues(logic.simple)
        .solve("SOMETHING")
        .then(null, function(d) { self.callback(null,d); });
    },
    "returns an error" : function(err) {
      assert.deepEqual(err, { "ref": 'SOMETHING', "err": 'not defined' });
    }
  },


  "err return" : {
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
  }
})
.export(module);