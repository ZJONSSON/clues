const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('$property', {autoend:true, jobs: 10}, t => {

  t.test('in simple logic with $property', {autoend: true}, t => {
    const facts = {
      simple: {
        count : 0,
        $property : function(ref) {
          this.count+=1;
          if (isNaN(ref)) throw 'NOT_A_NUMBER';
          return +ref+2;
        }
      }
    };

    t.test('asking for non-existent property', async t => {
      const d = await clues(facts,'simple.1234');
      t.same(d,1236,'returns the $property function value');
      t.ok(facts.simple['1234'],'resolved promise is placed on logic');
      t.same(facts.simple['1234'],1236,'promise contains value');
      t.same(facts.simple.count,1,'function is called once');
    });

    t.test('asking for a different property',async t => {
      t.same(await clues(facts,'simple.1235'),1237,'returns new value');
      t.same(facts.simple.count,2,'$property has now been called twice');
    });

    t.test('results so far are cached', async t => {
      const d = await Promise.all([ clues(facts,'simple.1234'), clues(facts,'simple.1235')]);
      t.same(d[0],1236,'first is cached');
      t.same(d[1],1237,'second is cached');
      t.equal(facts.simple.count,2,'an $property is not run again');
    });

    t.test('error raised in $property', async t => {
      const e = await clues(facts,'simple.abc',{},'__test__').catch(Object);
      t.same(e.message,'NOT_A_NUMBER','error message ok');
      t.same(e.ref,'abc','ref is ok');
      t.same(e.fullref,'simple.abc','fullref is ok');
      t.same(e.caller,'__test__','caller is ok');
      t.equal(facts.simple.abc.isRejected(),true,'rejected promise in logic');
      t.equal(facts.simple.abc.reason().message,'NOT_A_NUMBER','rejected promise has error');
      t.equal(facts.simple.count,3,'$property has now been called 3 times');
    });
  });

  t.test('concurrent request', async t => {
    const facts = {
      concurrent : {
        count: 0,
        $property : function() {
          return clues.Promise.delay(Math.random()*1000)
            .then(() => {
              this.count += 1;
              return new Date();
            });
        }
      }
    };

    const d = await Promise.map([...Array(10)],() => clues(facts,'concurrent.test'));
    t.ok( d.every(e => e == d[0]),'should return the same value');
    t.same(facts.concurrent.count,1,'and should not rerun the function');
  });

  t.test('$property inside a function', {autoend: true}, t => {
    const facts = {
      a : 5,
      funct : a => ({
        count : 0,
        $property : function(ref) {
          this.count+=1;
          return +ref+a;
        }
      })
    };

    t.test('asking for non-existent property', async t => {
      t.same( await clues(facts,'funct.1234'), 1239, 'returns value');
      t.same(facts.funct.count,1,'$property is called once');
      t.same( await clues(facts,'funct.1234'), 1239, 'previous results are cached');
      t.same(facts.funct.count,1,'$an fn not run again for same property');
    });
  });

  t.test('$property inside a nested structure', {autoend:true}, t => {
    const facts = {
      nested : {
        $property : function(ref) {
          return { a : { b: { c: function() { return +ref+10; } } } };
        }
      }
    };

    t.test('asking for non existing property nested', async t => {
      t.same( await clues(facts,'nested.1234.a.b.c'),1244,'returns correct value');
      t.ok(facts.nested['1234'].a.b.c,'registers fulfilled promise');
      t.same(facts.nested['1234'].a.b.c,1244,'promise registers value');
    });

    t.test('error raised in $property', async t => {
      const e = await clues(facts,'nested.1234.a.b.d',{},'__test__').catch(Object);
      t.same(e.ref,'d','ref ok');
      t.same(e.fullref,'nested.1234.a.b.d','fullref ok');
      t.same(e.caller,'__test__','caller ok');
    });
  });

  t.test('when function name is $property', {autoend: true}, t => {
    const facts = {
      a: 5,
      shorthand : function $property(ref) {
        return +ref * this.a;
      }
    };

    t.test('asking for a property', async t => {
      t.same( await clues(facts,'shorthand.2'),10,'returns right value');
      t.same( facts.shorthand['2'],10,'stores promise with value');
    });

    t.test('asking for another property', async t => {
      t.same( await clues(facts,'shorthand.4'),20,'returns right value');
      t.same( facts.shorthand['4'],20,'stores promise with value');
    });
  });

  t.test('when argument name is $property', {autoend: true}, t => {

    const facts = {
      a: 5,
      as_argument: function ($property) {
        return $property * this.a;
      },
      as_argument_es6 : a => $property => $property * a
    };

    t.test('regular function', async t => {
      t.test('asking for a property', async t => {
        t.same( await clues(facts,'as_argument.2'),10,'returns right value');
        t.same( facts.as_argument['2'],10,'stores promise with value');
      });

      t.test('asking for another property', async t => {
        t.same( await clues(facts,'as_argument.4'),20,'returns right value');
        t.same( facts.as_argument['4'],20,'stores promise with value');
      });
    });

    t.test('ES6 fat arrow', async t => {
      t.test('asking for a property', async t => {
        t.same( await clues(facts,'as_argument_es6.2'),10,'returns right value');
        t.same( facts.as_argument_es6['2'],10,'stores promise with value');
      });

      t.test('asking for another property', async t => {
        t.same( await clues(facts,'as_argument_es6.4'),20,'returns right value');
        t.same( facts.as_argument_es6['4'],20,'stores promise with value');
      });
    });

  });
});