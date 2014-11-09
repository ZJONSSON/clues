var clues = require("../clues"),
    assert = require("assert");

describe('cancellation',function() {
  var cancel = {};

  var logic = {
    M1 : function() {
      return this.Promise
        .delay(10,130)
        .cancellable()
        .catch(this.Promise.CancellationError,function() {
          cancel.M1 = true;
        });
    },
    M2 : function() {
      return this.Promise
        .delay(50,170)
        .cancellable()
        .catch(this.Promise.CancellationError,function() {
          cancel.M2 = true;
        });
    },
    M3 : function() {
      return this.Promise
        .delay(10,10)
         .catch(this.Promise.CancellationError,function() {
          cancel.M3 = true;
        });
    },
    M4 : function(M1,M2,M3) { return M1+M2+M3; },
    MTOP : function(M1,M4) { return M1+M4; }
  };

  var c = clues(logic),
      res = c.solve('MTOP');

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
        assert.equal(c.facts.M3.value(),10);
      });
  });
    
  // Cancelling in 100ms  
  setTimeout(res.cancel.bind(res),100);
    
  
});