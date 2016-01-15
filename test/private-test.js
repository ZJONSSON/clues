var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

function shouldErr() { throw 'Should throw an error'; }

describe('private functions',function() {
  var logic = {
    M1 : function() { return Promise.delay(100,10); },
    M2 : function private() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function private(M1,M2) { return M1+M2; }],
    M4 : function() { return Promise.delay(150,70); },
    MTOP : function(
      M3,
      M4
      ) { return M3+M4; }
  };

  var facts = Object.create(logic);

  describe('before resolution ',function() {
    it('regular fn not disclosed',function() {
      return clues(facts,'M2')
        .then(shouldErr,function(e) {
          assert.equal(e.message,'M2 not defined');
          assert.equal(facts.M2,logic.M2);
        });
    });

    it('array defined fn not disclosed',function() {
      return clues(facts,'M3')
        .then(shouldErr,function(e) {
          assert.equal(e.message,'M3 not defined');
          assert.equal(facts.M3,logic.M3);
        });
    });
  });

  describe('after resolution',function() {
    it('should be accessible indirectly',function() {
      return clues(facts,'MTOP')
      .then(function(d) {
        assert.equal(d,380);
      });
    });

    it('regular fn promise not disclosed',function() {
      return clues(facts,'M2')
        .then(shouldErr,function(e) {
          assert.equal(e.message,'M2 not defined');
          assert.equal(facts.M2.value(),300);
        });
    });

    it('array defined fn promise not disclosed',function() {
      return clues(facts,'M3')
        .then(shouldErr,function(e) {
          assert.equal(e.message,'M3 not defined');
          assert.equal(facts.M3.value(),310);
        });
    });
  });
});
