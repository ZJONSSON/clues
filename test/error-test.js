var clues = require('../clues'),
    assert = require('assert');

function shouldErr() { throw 'Should throw an error'; }

describe('error',function() {
  var c = {a: function(b) { return b;}};

  describe('when argument can´t be found',function() {
    it('should throw an error',function() {
      return clues({},'SOMETHING')
        .then(shouldErr,function(e) {
          assert.equal(e.ref,'SOMETHING');
          assert.equal(e.message, 'SOMETHING not defined');
        });
    });

    it('should show caller if a named logic function',function() {
      return clues(c,'a')
        .then(shouldErr,function(e) {
          assert.equal(e.ref,'b');
          assert.equal(e.message,'b not defined');
          assert.equal(e.caller,'a');
        });
    });
  });

  describe('thrown',function() {
    var logic = {
      ERR : function() { throw 'Could not process'; },
      DEP : function(ERR) { return 'Where is the error'; }
    };
    var facts = Object.create(logic);

    describe('directly',function() {
      
      it('should show up as first argument (err)',function() {
        return clues(facts,'ERR')
          .then(shouldErr,function(e) {
            assert.equal(e.ref,'ERR');
            assert.equal(e.message,'Could not process');
          });
      });

      it ('should update the facts',function() {
          var e = facts.ERR.reason();
          assert.equal(e.ref,'ERR');
          assert.equal(e.message,'Could not process'); 
      });
    });

    describe('indirectly',function() {
      
      it('should throw same error for dependent logic',function() {
        return clues(facts,'DEP')
          .then(shouldErr,function(e) {
            assert.equal(e.ref,'ERR');
            assert.equal(e.message,'Could not process');
          });
      });

      it('should contain reference to the first caller',function() {
        facts = Object.create(logic);
        return clues(facts,'DEP')
          .catch(function() {
            return clues(facts,'ERR');
          })
          .then(shouldErr,function(e) {
            assert.equal(e.caller,'DEP');
          });
      });
    });

    describe('function named $noThrow',function() {
      it('should return the error obj',function() {
        return clues(facts,function $noThrow(DEP) {
          return DEP;
        })
        .then(function(e) {
          assert.equal(e.ref,'ERR');
          assert.equal(e.message,'Could not process');
        },function() {
          throw 'Should return the error object';
        });
      });
      it('should return the error obj for subsequent fn',function() {
        return clues(facts,function $noThrow() {
          return ['DEP',Object];
        })
        .then(function(e) {
          assert.equal(e.ref,'ERR');
          assert.equal(e.message,'Could not process');
        },function() {
          throw 'Should return the error object';
        });
      });
    });

    describe('$logError',function() {
      var logic = {
          stack_error: function() { throw new Error('error');},
          rejection: function() { throw 'error';},
          optional: function(_stack_error,_rejection) {
            return 'OK';
          }
        };

      it('should log an error with stack',function() {
        var facts = Object.create(logic),error;          
        return clues(facts,'stack_error',{$logError:function(e) {error = e;}})
          .catch(Object)
          .then(function() {
            assert.equal(error.message,'error');
          });
      });

      it('should not log an error with no stack',function() {
        var facts = Object.create(logic),error;          
        return clues(facts,'rejection',{$logError:function(e) {error = e;}})
          .catch(Object)
          .then(function() {
            assert.equal(error,undefined);
          });
      });
      
      it('should log an error even if only used optionally',function() {
        var facts = Object.create(logic),error;          
        return clues(facts,'optional',{$logError:function(e) {error = e;}})
          .catch(Object)
          .then(function() {
            assert.equal(error.message,'error');
          });
      });
    });
  });
});

