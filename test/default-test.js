const clues = require('../clues');
const t = require('tap');

const Logic = {
  a: () => 5,
  optA: (a = 42) => a,
  optMissing: (b = 42) => b,
  optError: (err = 42) => err,
  err: clues.reject('ERROR')
};

t.test('default arguments in function',{autoend: true}, async t => {
  const facts = Object.create(Logic);
  t.same(await clues(facts,'optA'),5,'resolve without default if value exists');
  t.same(await clues(facts,'optMissing'),42,'resolves to default if value missing');
  t.same(await clues(facts,'optError'),42,'resolves to default if value missing');
});