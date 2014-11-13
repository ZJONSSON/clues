var clues = require("../clues"),
    assert = require("assert");

describe('logic value',function() {

  var logic = {
    dflt : 499,
    dependent : function(dflt) { return dflt;}
  };

  it('should return the logic value',function() {
    return clues(logic)
      .solve('dflt')
      .then(function(d) {
        assert.equal(d,499);
      },console.log);
  });

  describe('as an input',function() {
    var c = clues(logic);
    it('should lead to correct derived value',function() {
      return c.solve('dflt')
        .then(function(d) {
          assert.equal(d,499);
        });
    });
  });

  describe('with an overriding fact',function() {
    it('should return the fact, not the dflt value',function() {
      return clues(logic,{'dflt':20})
        .solve('dflt')
        .then(function(d) {
          assert.equal(d,20);
        });
    });
  });
});

