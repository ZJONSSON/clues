const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('Class functions', async t => {

  class TestClass {
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
    met$h_od2 (  a , b   ) {
      return a + b;
    }
    method3(met$h_od2) {
      return met$h_od2;
    }
  }

  const facts = new TestClass();
  t.same(await clues(facts, 'method1'), 26);
  t.same(await clues(facts, 'method3'), 15);
});