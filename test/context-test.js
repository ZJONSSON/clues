/*jshint node:true */
var clues=require("../clues"),
    assert = require("assert"),
    vows=require("vows"),
    logic = require("./logic");

vows.describe("context").addBatch({
  "reserved function arguments defined in the context object" : {
    topic : function() {
      var that = this;
      clues(logic.simple).solve(function(A,resolve,error,callback,success,facts,reject) {
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
  "keyword all" : {
    topic : function() {
      var that = this;
      clues(logic.complex)
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