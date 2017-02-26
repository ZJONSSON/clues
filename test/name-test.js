var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('function name',function() {
  var logic = {
    M1 : function() { return Promise.delay(100,10); },
    M2 : function $hide() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function(M1,M2) { return M1+M2; }]
  };

  var facts = Object.create(logic);

  describe('before resolution ',function() {
    it('is defined in function',function() {
      assert.equal(facts.M2.name,'$hide');
    });
  });

  describe('after resolution',function() {
    it('is retained in promise',function() {
      return clues(facts,'M3')
        .then(function() {
          assert.equal(facts.M3.value(),310);
          assert.equal(facts.M2.name,'$hide');
        });
    });
  });
});