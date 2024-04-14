const clues = require('../clues');
const t = require('tap');

const shouldErr = () => { throw 'SHOULD_ERROR'; };

t.test('Frozen logic', async  t => {
  let calls = 0;

  const Logic = {
    a : b => b,
    b : () => {
      calls++;
      return 15;
    }
  };

  Object.freeze(Logic);

  t.test('solving property of a frozen object directly', async t => {
    const e = await (clues(Logic,'a').then(shouldErr,Object));
    t.same(e.message,'Object immutable','errors as Object immutable');
    //t.same(calls,0,'does not execute function');
    t.same(typeof Logic.a,'function','does not modify function');
    t.same(typeof Logic.b,'function','does not modify function');
  });

  t.test('solving on a clone of a frozen object', async t => {
    const facts = Object.create(Logic);
    t.test('first time', async t => {
      const d = await clues(facts,'a');
      t.same(d,15,'correct result');
      t.same(calls,2,'two calls have been made');
      t.same(facts.a,15,'promise is registered');
    });

    t.test('second time', async t => {
      const d = await clues(facts,'a');
      t.same(d,15,'correct result');
      t.same(calls,2,'two calls have been made');
      t.same(facts.a,15,'promise is registered');
    });
  });
});
