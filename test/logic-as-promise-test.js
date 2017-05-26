const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const Logic = Promise.delay(100).then(function() {
  return {
    $constant : 380,
    a :  function($constant) { return {b: $constant}; }
  };
});

t.test('When logic is a promise', async t => {
  t.same( await clues(Logic,'a.b'),380,'logic is resolved before solving');
});