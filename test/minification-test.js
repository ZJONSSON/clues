var clues = require("../clues"),
    assert = require("assert");

describe('minified logic',function() {

  var logic = {
    M1 : [function() { return this.Promise.delay(10,100); }],
    M2 : function() { return this.Promise.delay(300,20); },
    M3 : ['M1','M2',function(a,b) { return a+b; }],
    M4 : function(M3) { return M3;},
    regular_array : [1,2,3,4]
  };

  var c = clues(logic);

  it('should resolve to the top',function() {
    return c.solve('M4')
      .then(function(d) {
        assert.equal(d,310);
      });
  });

  it('should work for individual functions',function() {
    return c.solve(['M4',function(a) {
      assert.equal(a,310);
    }]);
  });

  it('should not affect regular arrays',function() {
    return c.solve(function(regular_array) {
      assert.equal(regular_array,logic.regular_array);
    });
  });
});