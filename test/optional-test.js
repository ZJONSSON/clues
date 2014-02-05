/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

var S1 = clues(logic.simple);

vows.describe("optional argument").addBatch({
  "not supplied" : {
    topic : function() {
      var self = this;
      clues(logic.simple)
        .solve('D')
        .then(function(d) {
          self.callback(undefined,d);
        });
    },
    "should return null" : function(d) {
      assert.deepEqual(d,undefined);
    }
  },
  "calculation with internal default" : {
    topic : function() {
      var self = this;
      clues(logic.simple)
        .solve('E')
        .then(function(d) {
          self.callback(undefined,d);
        });
    },
    "should return correct value" : function(d) {
      assert.equal(d,84);
    }
  },
  "calculation with optional defined" : {
    topic : function() {
      var self = this;
      clues(logic.simple,{U:10})
        .solve('E')
        .then(function(d) {
          self.callback(undefined,d);
        });
    },
    "should return correct value" : function(d) {
      assert.equal(d,420);
    }
  },
  "optional that results in an error" : {
    topic : function() {
      var self = this;
      clues(logic.simple)
        .solve(function(A,_F) {
          self.callback(undefined,{A:A,F:_F});
        }).then(null,self.callback);
    },
    "should be undefined" : function(d) {
      assert.deepEqual(d.F,undefined);
      assert.equal(d.A,42);
    }
  }


})
.export(module);