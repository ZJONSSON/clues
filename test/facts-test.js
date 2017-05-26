const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('facts',{autoend: true}, t => {
  const Logic = {
    response : function() { return Promise.delay(500,42);},
    other : function() { return 5; }
  };

  const facts = Object.create(Logic);

  t.test('called first time', async t => {
    const start = new Date();
    t.same(await clues(facts,'response'),42,'resolves function when called');
    const wait = new Date() - start;
    t.ok(  wait >= 500,true, `wait was ${wait}`);
  });

  t.test('called second time', async t => {
    const start = new Date();
    t.same(await clues(facts,'response'),42,'resolves function when called');
    const wait = new Date() - start;
    t.ok(  wait <= 100,true, 'should return immediately');
  });

  t.test('unrequested logic function', {autoend: true}, t => {
    t.same(typeof facts.other,'function','should not be resolved');
  });

});