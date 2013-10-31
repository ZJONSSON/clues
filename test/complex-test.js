/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

vows.describe("complex tree").addBatch({
  "" : {
    topic : function() {
      var self = this;
      C1 = clues(logic.complex);
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
  }
})
.export(module);