const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

function shouldError(e) { throw 'Should error '+e;}

t.test('null logic', async t => {
  const values = [null,undefined,4,'a',0,Object,Array,Object];

  t.test('solving for a variable of null logic', async t => {
    await Promise.map(values, async nothing => {
      const value = await clues(nothing,'test').then(shouldError,Object);
      t.same(value.message,'test not defined',`${nothing}.test is undefined`);
    });
    t.end();
  });

  t.test('solving for a nested variable of null logic', async t => {
    await Promise.map(values, async nothing => {
      const value = await clues(nothing,'test.test').then(shouldError,Object);
      t.same(value.message,'test not defined',`${nothing}.test.test is undefined`);
    });
    t.end();
  });

  t.test('solving for context of null logic', async t => {
    await Promise.map(values, async nothing => {
      const context = await clues(nothing,function() { return this;});
      t.same(context, nothing == 'a' ? ['a'] : [],`${nothing} has a context of ${JSON.stringify(context)}`);
    });
    t.end();
  });

  t.test('null logic as a property', async t => {
    await Promise.map(values.filter(d => d !== undefined), async nothing => {
      const d = await clues({test: nothing},'test');
      const expected = typeof nothing === 'function' ? nothing() : nothing;
      t.same(d, expected,`test.${nothing} == ${expected}`);
    });
    t.end();
  });
  t.end();
});