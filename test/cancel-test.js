var clues = require('../clues'),
    Promise = require('bluebird'),
    assert = require('assert');

describe('cancellation',function() {
  var cancel = {};

  var logic = {
    M1 : function() {
      return Promise
        .delay(10,130)
        .cancellable()
        .catch(Promise.CancellationError,function() {
          cancel.M1 = true;
        });
    },
    M2 : function() {
      return Promise
        .delay(50,170)
        .cancellable()
        .catch(Promise.CancellationError,function() {
          cancel.M2 = true;
        });
    },
    M3 : function() {
      return Promise
        .delay(10,10)
        .catch(Promise.CancellationError,function() {
          cancel.M3 = true;
        });
    },
    M4 : function(M1,M2,M3) { return M1+M2+M3; },
    MTOP : function(M1,M4) { return M1+M4; }
  };

  var facts = Object.create(logic);

  var res = clues(facts,'MTOP');

  it('should result in undefined value where cancelled',function() {
    return res
      .then(function(d) {
        assert.equal(d,undefined);
      });
  });

  it('should trigger the cancel higher up',function() {
    // Need to to this on a delay to ensure nextTick
    return res.delay()
      .then(function() {
        assert.equal(cancel.M1,true);
        assert.equal(cancel.M2,true);
      });
  });

  it('should not invalidate results aquired before cancellation',function() {
    return res.delay()
      .then(function() {
        assert.equal(cancel.M3,undefined);
        assert.equal(facts.M3.value(),10);
      });
  });
    
  // Cancelling in 100ms  
  setTimeout(res.cancel.bind(res),100);
    
  
});