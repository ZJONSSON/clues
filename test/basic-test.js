/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

vows.describe("basic").addBatch({
  "clues by function" : {
    topic : function() {
      var self = this;
      clues(logic.simple)
        .solve(function(A) {
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
      clues(logic.simple)
        .solve("A")
        .then(function(A) {
          self.callback(undefined,A)
        })
    },
    "returns correct value" : function(d) {
      assert.equal(d,42);
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
  }
})
.export(module);