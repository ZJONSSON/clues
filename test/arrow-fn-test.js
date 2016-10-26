var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('Arrow functions',function() {

  var logic = {
    M1 : () => Promise.delay(100,10),
    M2 : () => Promise.delay(20,300),
    M3 : ['M1','M2', (a,b) => a+b],
    M4 : () => Promise.delay(150,70),
    TOP : (M3,M4) => M3+M4,
    MTOP: TOP => TOP
  };

  var facts = Object.create(logic);

  it('should resolve to the top',function() {
    return clues(facts,'MTOP')
      .then(function(d) {
        assert.equal(d,380);
      });
  });

  it('should update the fact table',function() {
    assert.equal(facts.M1.value(),10);
    assert.equal(facts.M2.value(),300);
    assert.equal(facts.M3.value(),310);
    assert.equal(facts.M4.value(),70);
    assert.equal(facts.MTOP.value(),380);
  });
});