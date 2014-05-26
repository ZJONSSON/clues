var clues = require("../clues"),
    assert = require("assert");

describe('error',function() {

  describe('when argument can´t be found',function() {
    var c = clues({a:function(b) { return b;}});

    it('should throw an error',function() {
      return c.solve('SOMETHING')
        .then(null,function(e) {
          assert.equal(e.ref,'SOMETHING');
          assert.equal(e.message, 'SOMETHING not defined');
        });
    });

    it('should show caller if a named logic function',function() {
      return c.solve('a')
        .then(null,function(e) {
          assert.equal(e.ref,'b');
          assert.equal(e.message,'b not defined');
          assert.equal(e.caller,'a');
        });
    });
  });

  describe('thrown',function() {
    var logic = {
      ERR : function() { throw "Could not process"; },
      DEP : function(ERR) { return "Where is the error"; }
    };

    describe('directly',function() {
      var c = clues(logic);

      it('should show up as first argument (err)',function() {
        return c.solve('ERR')
          .then(null,function(e) {
            assert.equal(e.ref,'ERR');
            assert.equal(e.message,'Could not process');
          });
      });

      it ('should update the fact table',function() {
        return c.solve(function(facts) {
          var e = facts.ERR.inspect().error();
          assert.equal(e.ref,'ERR');
          assert.equal(e.message,'Could not process');
        });
      });
    });

    describe('indirectly',function() {
      var c = clues(logic);
      it('should throw same error for dependent logic',function() {
        return c.solve('DEP')
          .then(null,function(e) {
            assert.equal(e.ref,'ERR');
            assert.equal(e.message,'Could not process');
          });
      });

      it('should contain reference to the first caller',function() {
        return c.solve('DEP')
          .then(null,function(e) {
            assert.equal(e.caller,'DEP');
          });
      });
    });
  });
});