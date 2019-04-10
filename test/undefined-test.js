const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');


t.test('undefined', {autoend: true},t => {
  
  const Logic = {
    a : function() { return undefined; },
    b : undefined,
    c : function() { return Promise.delay(1).then(() => undefined); },
    c1 : function(a) { return 5; },
    d1 : function(a) { return 6; },
    c2 : function(b) { return 7; },
    d2 : function(b) { return 8; },
    c3 : function(c) { return 9; },
    d3 : function(c) { return 10; },
    
  };

  t.test('functions returning undefined are ok', {autoend:true}, t => {

    t.test('immediate call', async t => {
      const facts = Object.create(Logic);
      const c1 = await clues(facts,'c1');
      const d1 = await clues(facts,'d1');
      t.same(c1, 5);
      t.same(d1, 6);
    });

    // undefineds actually walk up the prototype chain to see if there is a function there,
    // so try it without the undefineds
    t.test('immediate call via assign', async t => {
      const facts = Object.assign({}, Logic);
      const c1 = await clues(facts,'c1');
      const d1 = await clues(facts,'d1');
      t.same(c1, 5);
      t.same(d1, 6);
    });

    t.test('no fn call', async t => {
      const facts = Object.create(Logic);
      const c2 = await clues(facts,'c2').catch(Object);
      const d2 = await clues(facts,'d2').catch(Object);
      t.same(c2.message, 'b not defined');
      t.same(d2.message, 'b not defined');
    });

    t.test('async call', async t => {
      const facts = Object.create(Logic);
      const c3 = await clues(facts,'c3');
      const d3 = await clues(facts,'d3');
      t.same(c3, 9);
      t.same(d3, 10);
    });


  });
});