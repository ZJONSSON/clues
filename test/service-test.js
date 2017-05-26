const clues = require('../clues');
const t = require('tap');

t.test('$ as a first letter', {autoend:true}, t => {

  const Logic = {
    a : 10,
    b : 11,
    $logic_service : a => a,
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

});
