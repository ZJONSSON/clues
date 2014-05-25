var clues = require("../clues"),
    assert = require("assert");

describe('solver',function() {

  var logic = {
    A : 42,
    B : 100
  };

  var c = clues(logic);

  it('should work inside a .then',function() {
    return c.solve('U')
     .then(null,c.solver('A'))
      .then(function(d) {
       assert.equal(d,42);
      });
  });

  if('should work when injected',function() {
    return c.solve(function(B,solver) {
      return solver('A');
    })
    .then(function(d) {
      assert.equal(d,42);
    });
  });
});