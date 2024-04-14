const clues = require('../clues');
const t = require('tap');

t.test('$ as a first letter', async t => {

  const Logic = {
    a : 10,
    b : 11,
    counter: {with_prep: 0, with_prep_arg: 0},
    $logic_service : a => a,
    $with_prep : function $prep(a,b,counter) {
      counter.with_prep++;
      let c = a + b;
      return function $service(d) {
        return c + d;
      };
    },
    $with_prep_arg : ($prep,a,b,counter) => {
      counter.with_prep_arg++;
      let c = a + b;
      return function $service(d) {
        return c + d;
      };
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

  t.test('with function called $prep', async t => {
    t.test('prepares a service function', async t => {
      const d = await clues(Object.create(Logic), '$with_prep', Object.create(global));
      t.same(typeof d, 'function','returns a function');
      t.same(d(5), 26);
    });

    t.test('prep solved only once', async t => {
      let logic = Object.create(Logic);
      logic.counter = {with_prep: 0, with_prep_arg: 0};
      const d1 = await clues(logic, '$with_prep', Object.create(global));
      const d2 = await clues(logic, '$with_prep', Object.create(global));
      t.same(typeof d1, 'function','returns a function');
      t.same(d1(5), 26);
      t.same(logic.counter.with_prep, 1);
    });
    t.end();
  });

  t.test('with $prep as argument', async t => {
    t.test('prepares a service function', async t => {
      const d = await clues(Object.create(Logic), '$with_prep_arg', Object.create(global));
      t.same(typeof d, 'function','returns a function');
      t.same(d(5), 26);
    });

    t.test('prep solved only once', async t => {
      let logic = Object.create(Logic);
      logic.counter = {with_prep: 0, with_prep_arg: 0};
      const d1 = await clues(logic, '$with_prep_arg', Object.create(global));
      const d2 = await clues(logic, '$with_prep_arg', Object.create(global));
      t.same(typeof d1, 'function','returns a function');
      t.same(d1(5), 26);
      t.same(logic.counter.with_prep_arg, 1);
    });
    t.end();
  });

  t.test('with $prep as an argument to a class function', async t => {
    class Test {
      constructor(a, counter) {
        this.a = a;
        this.counter = counter;
      }

      $multiply($prep,a,counter) {
        counter.with_prep_arg++;
        return function $service(d) {
          return d * a;
        };
      }
    }

    const Logic = {
      counter: {with_prep_arg: 0},
      a: 2,
      test: Test
    };

    t.test('prepares a service function', async t => {
      const d = await clues(Object.create(Logic), 'test.$multiply', Object.create(global));
      t.same(typeof d, 'function','returns a function');
      t.same(d(5), 10);
    });

    t.test('prep solved only once', async t => {
      let logic = Object.create(Logic);
      logic.counter = {with_prep_arg: 0};
      const d1 = await clues(logic, 'test.$multiply', Object.create(global));
      const d2 = await clues(logic, 'test.$multiply', Object.create(global));
      t.same(typeof d1, 'function','returns a function');
      t.same(d1(5), 10);
      t.same(logic.counter.with_prep_arg, 1);
    });
    t.end();


  })

});
