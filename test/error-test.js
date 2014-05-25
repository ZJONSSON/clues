var clues = require("../clues"),
    assert = require("assert");

describe('error',function() {
  describe('when argument can´t be found',function() {
    it('should throw an error',function() {
      return clues({a:1})
        .solve('SOMETHING')
        .then(null,function(e) {
          assert.equal(e.ref,'SOMETHING');
          assert.equal(e.message, 'SOMETHING not defined');
        });
    });
  });

  describe('thrown',function() {
    var c = clues({
      ERR : function() { throw "Could not process"; },
      DEP : function(ERR) { return "Where is the error"; }
    });


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
});