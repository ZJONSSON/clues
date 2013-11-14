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
      assert.equal(d,null);
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
  }


})
.export(module);