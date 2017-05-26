const clues = require('../clues');
const t = require('tap');

function facts($global) {
  $global.$constant = 380;
  return { a : { b : function($constant) { return $constant; } } };
}

function wrapped() {
  return function($global) {
    return facts;
  };
}

t.test('when logic is a function', async t => {
  t.same( await clues(facts,'a.b'),380,'direct call is evaluated before solving');
  t.same( await clues(wrapped,'a.b'),380,'nested functions evaluated');
});
