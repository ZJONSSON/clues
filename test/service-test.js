const clues = require('../clues');
const t = require('tap');

t.test('$ as a first letter', {autoend:true}, t => {

  const Logic = {
    a : 10,
    b : 11,
    counter: {count: 0},
    $logic_service : a => a,
    $with_prep : function $prep(a,b,counter) {
      counter.count++;
      let c = a + b;
      return function $service(d) {
        return c + d;
      }
    },
    top : a => ({ $nested_service : b => a + b })
  };

  const global = { $global_service : b => b };

  t.test('in logic', async t => {
    const d = await clues(Object.create(Logic),'$logic_service',Object.create(global));
    t.same(typeof d, 'function','returns a function');
    t.same(d(20),20,'function works');
  });

  t.test('in nested logic', async t => {
    const d = await clues(Object.create(Logic),'top.$nested_service',Object.create(global));
    t.same(typeof d, 'function','returns a function');
    t.same(d(20),30,'function works');
  });

  t.test('in global', async t => {
    await clues(Object.create(Logic),$global_service => {
      t.same(typeof $global_service, 'function','returns a function');
      t.same($global_service(20),20,'function works');
    },Object.create(global));
  });

  t.test('with prep', async t => {
    const d = await clues(Object.create(Logic), '$with_prep', Object.create(global));
    t.same(typeof d, 'function','returns a function');
    t.same(d(5), 26);
  });

  t.test('with prep - solved only once', async t => {
    let logic = Object.create(Logic);
    logic.counter = {count: 0};
    const d1 = await clues(logic, '$with_prep', Object.create(global));
    const d2 = await clues(logic, '$with_prep', Object.create(global));
    t.same(typeof d1, 'function','returns a function');
    t.same(d1(5), 26);
    t.same(logic.counter.count, 1);
  });

});
