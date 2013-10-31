/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

vows.describe("clues.as").addBatch({
  "" : {
    topic : function() {
      var i = clues(),
          that = this;

      function tester(cb) {
        setTimeout(function() {
          cb(null,10);
        },200);
      }
      tester(i.as("a"));

      i.solve("a").then(function(d) {
        that.callback(null,d);
      });
    },
    "is handled by the clues object" : function(d) {
      assert.equal(d,10);
    }
  }
})
.export(module);