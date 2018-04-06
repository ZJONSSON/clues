const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('Class functions', {autoend: true}, async t => {

  class TestClass {
    constructor(d, e) {
      this.d = d;
      this.e = e;
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
    c() {
      return 7;
    }
    f(a,b,c) { return (d,e) => a+b+c+d+e;}
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

  t.test('Solving functions of an instance', async t => {
    const facts = new TestClass();
    t.same(await clues(facts, 'method1'), 26);
    t.same(await clues(facts, 'method3'), 15);
  });

  t.test('Generating instance from a class', {autoend: true}, async t => {
    t.test('with constructor', async t => {
      t.same(await clues(a,'class.f'),75);
      t.same(await clues(b,'class.f'),94);
    });

    t.test('without constructor', async t => {
      t.same(await clues(a,'class2.a'),2);
    }); 
  });
});