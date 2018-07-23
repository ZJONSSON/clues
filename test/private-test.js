const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

function shouldErr() { throw 'Should throw an error'; }

t.test('private functions', {autoend: true}, t => {
  const Logic = {
    M1 : function($private) { return Promise.delay(100,10); },
    M2 : function $private() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function private(M1,M2) { return M1+M2; }],
    M4 : function() { return Promise.delay(150,70); },
    MTOP : function(
      M3,
      M4
      ) { return M3+M4; }
  };

  t.test('before resolution', {autoend: true}, t => {
    t.test('private regular function', async t => {
      const facts = Object.create(Logic);
      const e = await clues(facts,'M2').catch(Object);
      t.same(e.message,'M2 not defined','errors as not defined');
      t.same(facts.M2,Logic.M2,'fn is not run');
    });

    t.test('private array function', async t => {
      const facts = Object.create(Logic);
      const e = await clues(facts,'M3').catch(Object);
      t.same(e.message,'M3 not defined','errors as not defined')
      t.same(facts.M3, Logic.M3,'fn is not run');
    });

    t.test('$private argument', async t => {
      const facts = Object.create(Logic);
      const e = await clues(facts,'M1').catch(Object);
      t.same(e.message,'M1 not defined','errors as not defined')
      t.same(facts.M1, Logic.M1,'fn is not run');
    })
  });

  t.test('after resolution', async t => {
    const facts = Object.create(Logic);
    const MTOP = await clues(facts,'MTOP');
    const M1 = await clues(facts,'M1').catch(Object);
    const M2 = await clues(facts,'M2').catch(Object);
    const M3 = await clues(facts,'M3').catch(Object);

    t.same(MTOP,380,'is available indirectly');

    // TODO: this isn't really possible... unless we always wrap in a promise?
    //t.same(M1.message,'M1 not defined','private fn not available directly');

    t.same(facts.M1.value(),10,'private fn promise has the resolved value');
    t.same(M2.message,'M2 not defined','private fn not available directly');
    t.same(facts.M2.value(),300,'private fn promise has the resolved value');
    t.same(M3.message,'M3 not defined','private array - not defined');
    t.same(facts.M3.value(),310,'private fn promise has the resolved value');
  });
});
