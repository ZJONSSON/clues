var clues = require('../clues'),
    Promise = clues.Promise,
    assert = require('assert');

Promise.config({cancellation:true});

describe('cancellation',function() {
  var cancel = {};

  var logic = {
    M1 : function() {
      return new Promise(function(resolve,reject,onCancel) {
        onCancel(function() {
          cancel.M1 = true;
        });

        setTimeout(function() {
          resolve(10);
        },130);
      });
    },

    M2 : function() {
      return new Promise(function(resolve,reject,onCancel) {
        onCancel(function() {
          cancel.M2 = true;
        });

        setTimeout(function() {
          resolve(50);
        },170);
      });
    },

    M3 : function() {
      return new Promise(function(resolve,reject,onCancel) {
        onCancel(function() {
          cancel.M3 = true;
        });

        setTimeout(function() {
          resolve(10);
        },10);
      });
    },

    M4 : function(M1,M2,M3) {
      return M1+M2+M3;
    },

    MTOP : function(M1,M4) {
      return M1+M4;
    }
  };

  var facts = Object.create(logic),res;

  it('should not return results',function() {
    var gotResults;

    res = clues(facts,'MTOP')
      .then(function() {
        gotResults = true;
      });

    // Cancelling in 100ms  
    setTimeout(res.cancel.bind(res),100);

    return Promise.delay(150)
      .then(function() {
        assert.equal(gotResults,undefined);
      });
  });

  it('should trigger the cancel higher up',function() {
    assert.equal(cancel.M1,true);
    assert.equal(cancel.M2,true);
  });

  it('should not invalidate results aquired before cancellation',function() {
    assert.equal(cancel.M3,undefined);
    assert.equal(facts.M3.value(),10);
  });
});