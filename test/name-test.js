const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('function name', {autoend: true}, t => {
  const logic = {
    M1 : function() { return Promise.delay(100,10); },
    M2 : function $hide() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function(M1,M2) { return M1+M2; }]
  };

  const facts = Object.create(logic);

  t.test('before resolution', t => {
    t.same(facts.M2.name,'$hide','name is a property of function');
    t.end();
  });

  t.test('after resolution', {autoend:true}, async t => {
    await clues(facts,'M3');
    t.same(facts.M2.name,'$hide','name is a property of promise');
    t.same(facts.M3.value(),310,'and promise resolves to value');
  });

});