var clues = require("../clues"),
    assert = require("assert");

describe('context',function() {
  var f = {a: 1, b: 2},
      l = {c: 3, d: 4, l : function(a,b) { return {a: a,b: b}; }},
      c = clues(l,f);

  it('should inject self',function() {
    return c.solve(function(a,self) {
      assert.deepEqual(self,c);
    });
  });

  it('should inject facts',function() {
    return c.solve(function(a,facts) {
      assert.deepEqual(f,facts);
    });
  });

  it('should inject local',function() {
    var local = {a: 1, b: 2};
    return c.solve('l',local)
      .then(function(d) {
        assert.deepEqual(d,local);
      });
  });

  it('should inject local variable',function() {
    return c.solve('y',{y:5})
      .then(function(y) {
        assert.equal(y,5);
      });
  });

});