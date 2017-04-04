var clues = require('../clues'),
    assert = require('assert');

var Logic = {
  a : 41,
  b: 1,
  c : a => {
    return function(b) {
      return a+b;
    };
  }
};

// Fix bug where in the example above the (b) would match as the requested arguments instead of `a`
// This test verifies the fix
describe('Inner function arguments',function() {
  it('are not affecting function signature',function() {
    return clues(Logic,'c')
      .then(function(d) {
        assert.equal(d,'42');
      });
  });
});