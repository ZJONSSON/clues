var clues = require('../clues'),
    assert = require('assert');

describe('Frozen logic',function() {
  var calls = 0;

  var Logic = {
    a : b => b,
    b : () => {
      calls++;
      return 15;
    }
  };

  Object.freeze(Logic);
  describe('direct access',function() {
    it('should not run directly ',function() {
      return clues(Logic,'a')
        .then(function() {
          throw 'SHOULD_ERROR';
        },function(e) {
          assert.equal(e.message,'Object immutable');
          assert.equal(e.value,15);
          assert.equal(typeof Logic.a,'function');
        });
    });
  });
  
  describe('cloned access',function() {
    var facts = Object.create(Logic);

    it('should resolve',function() {
      return clues(facts,'a')
        .then(function(a) {
          assert.equal(a,15);
          assert.equal(calls,2);
          assert.equal(facts.a.value(),15);
        });
    });

    it('should memoize',function() {
      return clues(facts,'a')
        .then(function(a) {
          assert.equal(a,15);
          assert.equal(calls,2);
          assert.equal(facts.a.value(),15);
        });
    });
  });
});