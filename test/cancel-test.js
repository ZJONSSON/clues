const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

Promise.config({cancellation:true});

t.test('cancellation', {autoend: true}, async t => {
  const cancel = {};

  const Logic = {
    M1 : () => new Promise(function(resolve,reject,onCancel) {
      onCancel(() => cancel.M1 = true);
      setTimeout(() => resolve(10),130);
    }),

    M2 : () => new Promise(function(resolve,reject,onCancel) {
      onCancel(() => cancel.M2 = true);
      setTimeout(() => resolve(50),170);
    }),

    M3 : () => new Promise(function(resolve,reject,onCancel) {
      onCancel(() => cancel.M3 = true);
      setTimeout(() => resolve(10));
    }),
  

    M4 : (M1,M2,M3) => M1+M2+M3,

    MTOP : (M1,M4) => M1+M4
  };

  const facts = Object.create(Logic);
  let res;

  let gotResults;

  res = clues(facts,'MTOP')
    .then(function() {
      gotResults = true;
    });

  // Cancelling in 100ms  
  setTimeout(res.cancel.bind(res),100);

  await Promise.delay(200);

  t.test('should not return results', t => {
    t.same(gotResults,undefined);
    t.end();
  });

  t.test('Cancellation affects dependencies', t => {
    t.same(cancel.M1,true,'M1 cancelled');
    t.same(cancel.M2,true,'M2 cancelled');
    t.end();
  });

  t.test('Any result resolved before cancellation should not be invalidated',t => {
    t.same(cancel.M3,undefined,'M3 not cancelled');
    t.same(facts.M3.value(),10,'M3 resolved to a promise with correct value');
    t.end();
  });
});