const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('array functions', async t => {
  const logic = {
    M1 : [function() { return Promise.delay(100,10); }],
    M2 : function() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function(a,b) { return a+b; }],
    M4 : function(M3) { return M3;},
    recursive : [['M1',Number],[['M2',Number],['M3',Number],Array],Array],
    regular_array : [1,2,3,4],
    nested : [function() {
      return function() {
        return ['M1',function(M1) {
          return M1+5;
        }];
      };
    }],
    input : {
      a: 40,
      b: 3
    },
    b: 2,
    partial: ['input.a', function(a, b){
      return a + b;
    }]
  };

  const facts = Object.create(logic);

  t.same(await clues(facts,'M3'),310, 'should resolve to the top');
  t.same(await clues(facts,'M4'),310, 'should work for individual functions');
  t.same(await clues(facts,'nested'),15,'should work for nested structures');
  t.same(await clues(facts,'regular_array'),logic.regular_array,'should not affect regular array');
  t.same(await clues(facts,'partial'),42,'partial positional arguments ok');
  t.same(await clues(facts,'recursive'),[10,[300,310]],'should work recursively');
  
  t.test('should only execute arrays once', async function(t) {  
    let counter = 0;
    const otherContext = {
      M1: Promise.delay(100, 10),
      M2: Promise.delay(200, 20)
    };

    const facts = {
      M3: [otherContext, 'M1', 'M2', function(a,b) {
        counter++;
        return a + b;
      }]
    };

    const d = await Promise.all([clues(facts,'M3'), clues(facts,'M3')]);
    t.same(d[0],30,'results ok');
    t.same(d[1],30,'results ok');
    t.same(counter,1,'fn only executed once');
        
  });
});