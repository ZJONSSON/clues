/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

var S1 = clues(logic.simple);

vows.describe("facts table").addBatch({
  'facts' : {
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
  }
})
.export(module);