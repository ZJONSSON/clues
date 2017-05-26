const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const facts = {
  answer : async function() {
    const value = await Promise.delay(100).then(() => 41);
    return value+1;
  }
};

t.test('Async function', async t => {
  const answer = await clues(facts,'answer');
  t.same(answer,42,'resolves to a value');
});