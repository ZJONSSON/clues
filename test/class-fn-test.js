const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('Class functions', {autoend: true}, async t => {

  class TestClass {
    constructor(d, e, global_g) {
      this.d = d;
      this.e = e;
      this.g = global_g;
    }
    method1(a, b) {
      return a * b;
    }
    a() {
      return 2;
    }
    b(c) {
      return 6 + c;
    }
    c($private) {
        return 7;
    }
    f(a,b,c) { return (d,e,g) => a+b+c+d+e+g;}
    met$h_od2 (  a , b   ) {
      return a + b;
    }
    method3(met$h_od2) {
      return met$h_od2;
    }
  }

  class TestClass2 {
    a() {
      return 2;
    }
  }

  const a = {
    class: TestClass,
    class2: TestClass2,
    d: 11,
    e: 42
  };

  const b = {
    class: TestClass,
    d: 12,
    e: 60
  };

  const $global = {
    global_g : 1
  }

  t.test('Solving functions of an instance', async t => {
    const facts = new TestClass();
    t.same(await clues(facts, 'method1'), 26);
    t.same(await clues(facts, 'method3'), 15);
  });

  t.test('Generating instance from a class', {autoend: true}, async t => {
 
    t.test('$private as class argument', async t => {
      const res = await clues(a,'class.c', $global).then(() => Promise.reject('ShouldErrror'),Object);
      t.same(res.message,'c not defined');
    });
  });
});