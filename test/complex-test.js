var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

describe('complex tree',function() {

  var logic = {
    M1 : function() { return Promise.delay(10,100); },
    M2 : function() { return Promise.delay(300,20); },
    M3 : function(M1,M2) { return M1+M2; },
    M4 : function() { return Promise.delay(70,150); },
    MTOP : function(M3,M4) { return M3+M4; }
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