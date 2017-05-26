const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('Arrow functions', async t => {
  const logic = {
    M1 : () => Promise.delay(100,10),
    M2 : () => Promise.delay(20,300),
    M3 : ['M1','M2', (a,b) => a+b],
    M4 : () => Promise.delay(150,70),
    TOP : (M3,M4) => M3+M4,
    MTOP: TOP => TOP
  };

  const facts = Object.create(logic);
  const MTOP = await clues(facts,'MTOP');

  t.same(MTOP,380,'resolves tree to the top');
  t.same(facts.M1.value(),10,'fact M1 resolved');
  t.same(facts.M2.value(),300,'fact M2 resolved');
  t.same(facts.M3.value(),310,'fact M3 resolved');
  t.same(facts.M4.value(),70,'fact M4 resolved');
  t.same(facts.MTOP.value(),380,'fact MTOP resolved');
});