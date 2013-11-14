/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

var S2 = clues(logic.simple);

vows.describe("default").addBatch({
  "without a fact" : {
    topic : function() {
      var self = this;
      S2.solve("dflt")
        .then(function(d) {
          self.callback(null,d);
        },console.log);
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
      assert.isUndefined(S2.facts['dflt']);
    }
  },
  "with a overriding fact" : {
    topic : function() {
      var self = this;
      clues(logic.simple,{"dflt":20})
        .solve("dflt")
        .then(function(d) {
          self.callback(null,d);
        });
    },
    "returns the fact, not the dflt value" : function(d) {
      assert.equal(d,20);
    }
  }
  
})
.export(module);