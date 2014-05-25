var clues = require("../clues"),
    assert = require("assert");
    

describe('fork',function() {
  var logic = {
    A : function(Promise) { return Promise.delay(42,500);},
    B : 10,
    C : function(A,B) { return A + B; }
  };

  var c = clues(logic,{});

  it('resolve variable should not affect parent',function() {
    var f = c.fork();
    f.solve(function(A) {
      assert.equal(A,42);
      assert.equal(c.facts.A,undefined);
    });
  });

  it('can override own facts without affecting parent',function() {
    var f = c.fork({A: 50, B: 100});
    return f.solve(function(A,B,C) {
      assert.equal(A,50);
      assert.equal(B,100);
      assert.equal(C,150);
      assert.equal(c.facts.A,undefined);
      assert.equal(c.facts.B,undefined);
      assert.equal(c.facts.C,undefined);
      assert.equal(c.logic.A,logic.A);
      assert.equal(c.logic.A,logic.A);
    });

  });

});

