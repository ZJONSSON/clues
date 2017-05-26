const clues = require('../clues');
const t = require('tap');

const Logic = {
  a : 41,
  b: 1,
  c : a => {
    return function(b) {
      return a + b;
    };
  }
};

// Fix bug where in the example above the (b) would match as the requested arguments instead of `a`
// This test verifies the fix
t.test('Inner function arguments', async t => {
  t.same( await clues(Logic,'c'), 42, 'do not affect function signature');
});