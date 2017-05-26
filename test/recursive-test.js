const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const shouldErr = () => { throw 'Should Error'; };

t.test('In recursive logic',{autoend: true}, t => {
  const Logic = {
    simple : {
      value : 2,
    },
    medium : Object.create({
      bucket : Object.create({
        value : Promise.delay(100,10)
      }),
    }),
    hard : ['simple.value',function(val) {
      return {
        a : {
          b : {
            c : {
              d : {
                id: val+100,
                e : {
                  f :12,
                  g : function(f) {
                    return 2*f;
                  },
                  h : function() {
                    return function(f) {
                      return f+2;
                    };
                  }
                }
              }
            }
          }
        }
      };
    }]
  };

  const facts = Object.create(Logic);

  t.test('simple nesting',async t => {
    t.same( await clues(facts,'simple.value'),2,'works');
  });
    
  t.test('medium nesting works', async t => {
    t.same( await  clues(facts,'medium.bucket.value'),10,'works');
  });

  t.test('ᐅ works as an alias for dot', async t => {
    t.same( await clues(facts,'mediumᐅbucketᐅvalue'), 10, 'works');
  });
  
  t.test('complex nesting', async t => {
    t.same( await clues(facts,'hard.a.b.c.d.id'),102,'works');
  });

  t.test('ᐅ as an alias for dot',async t => {
    t.same( await clues(facts,'hardᐅaᐅbᐅcᐅdᐅid'),102,'works');
  });

  t.test('on returned functions',async t => {
    t.same( await clues(facts,'hard.a.b.c.d.e.h'),14,'works');
  });

  t.test('works when fact repeats twice', async t => {
    const d = await clues(facts,['hard.a.b.c.d.e','hard.a.b.c.d.e.f','hard.a.b.c.d.e.g',Array]);
    t.same(d[1],12,'works');
    t.same(d[2],24,'works');
  });

  t.test('supports optional', async t => {
    t.same( await clues(facts,['_hard.a.b.c.d.id',Number]),102,'works');
  });

  t.test('path traversed manually', async t => {
    const d = await clues(facts,hard => {
      return clues(hard.a.b,c => {
        return clues(c.d,'id');
      });
    });
    t.same(d,102,'works');
  });

  t.test('bad path returns an error', async t => {
    const e = await clues(facts,'hard.a.b.c.d.i.oo.oo').then(shouldErr,Object);
    t.same(e.message,'i not defined','errors');
    t.same(e.ref,'i','ref ok');
    t.same(e.fullref,'hard.a.b.c.d.i','fullref ok');
      
  });

  t.test('optional bad path returns undefined',async t => {
    const d = await clues(facts,['_hard.a.b.e','simple.value',Array]);
    t.same(d[0],undefined,'bad path is undefined');
    t.same(d[1],2,'good path returns value');
  });
});