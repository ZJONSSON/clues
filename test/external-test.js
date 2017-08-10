const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

t.test('$external', {autoend:true, jobs: 10}, t => {

  t.test('in simple logic with $external', {autoend: true}, t => {
    const facts = {
      simple: {
        count : 0,
        $external : function(ref) {
          this.count+=1;
          if (ref == 'STOP') throw {message:'STOP_ERROR',error:true};
          return 'simple:'+ref;
        }
      }
    };

    t.test('asking for non-existent property', async t => {
      const d = await clues(facts,'simple.test.1');
      t.same(d,'simple:test.1','returns the $external function value');
      t.ok(facts.simple['test.1'].isFulfilled(),'resolved promise is placed on logic');
      t.same(facts.simple['test.1'].value(),'simple:test.1','promise contains value');
      t.same(facts.simple.count,1,'function is called once');
    });

    t.test('asking for a different property',async t => {
      t.same(await clues(facts,'simple.test.2'),'simple:test.2','returns new value');
      t.same(facts.simple.count,2,'$external has now been called twice');
    });

    t.test('results so far are cached', async t => {
      const d = await Promise.all([ clues(facts,'simple.test.1'), clues(facts,'simple.test.2')]);
      t.same(d[0],'simple:test.1','first is cached');
      t.same(d[1],'simple:test.2','second is cached');
      t.equal(facts.simple.count,2,'an $external is not run again');
    });

    t.test('error raised in $external', async t => {
      const e = await clues(facts,'simple.STOP',{},'__test__').catch(Object);
      t.same(e.message,'STOP_ERROR','error message ok');
      //t.same(e.ref,'abc','ref is ok');
      t.same(e.fullref,'simple.STOP','fullref is ok');
      t.same(e.caller,'STOP','caller is ok');
      t.equal(facts.simple.STOP.isRejected(),true,'rejected promise in logic');
      t.equal(facts.simple.STOP.reason().message,'STOP_ERROR','rejected promise has error');
      t.equal(facts.simple.count,3,'$external has now been called 3 times');
    });
  });

  t.test('concurrent request', async t => {
    const facts = {
      concurrent : {
        count: 0,
        $external : function() {
          return clues.Promise.delay(Math.random()*1000)
            .then(() => {
              this.count += 1;
              return new Date();
            });
        }
      }
    };

    const d = await Promise.map([...Array(10)],() => clues(facts,'concurrent.test.value'));
    t.ok( d.every(e => e == d[0]),'should return the same value');
    t.same(facts.concurrent.count,1,'and should not rerun the function');
  });

  t.test('$external inside a function', {autoend: true}, t => {
    const facts = {
      a : 'ok:',
      funct : a => ({
        count : 0,
        $external : function(ref) {
          this.count+=1;
          return a+ref;
        }
      })
    };

    t.test('asking for non-existent property', async t => {
      t.same( await clues(facts,'funct.test.1'), 'ok:test.1', 'returns value');
      t.same(facts.funct.value().count,1,'$external is called once');
      t.same( await clues(facts,'funct.test.1'), 'ok:test.1', 'previous results are cached');
      t.same(facts.funct.value().count,1,'$an fn not run again for same property');
    });
  });

  t.test('when function name is $external', {autoend: true}, t => {
    const facts = {
      a: 'ok:',
      shorthand : function $external(ref) {
        return this.a+ref;
      }
    };

    t.test('asking for a property', async t => {
      t.same( await clues(facts,'shorthand.test.1'),'ok:test.1','returns right value');

      // TODO: value() shouldn't really be needed here... it should just be complete by the end
      t.same( facts.shorthand['test.1'].value(),'ok:test.1','stores promise with value');
    });

    t.test('asking for another property', async t => {
      t.same( await clues(facts,'shorthand.test.2'),'ok:test.2','returns right value');
      t.same( facts.shorthand['test.2'].value(),'ok:test.2','stores promise with value');
    });
  });

  t.test('when argument name is $external', {autoend: true}, t => {

    const facts = {
      a: 'ok:',
      as_argument: function ($external) {
        return this.a + $external;
      },
      as_argument_es6 : a => $external => a + $external
    };

    t.test('regular function', async t => {
      t.test('asking for a property', async t => {
        t.same( await clues(facts,'as_argument.test.1'),'ok:test.1','returns right value');
        t.same( facts.as_argument['test.1'].value(),'ok:test.1','stores promise with value');
      });

      t.test('asking for another property', async t => {
        t.same( await clues(facts,'as_argument.test.2'),'ok:test.2','returns right value');
        t.same( facts.as_argument['test.2'].value(),'ok:test.2','stores promise with value');
      });
    });

    t.test('ES6 fat arrow', async t => {
      t.test('asking for a property', async t => {
        t.same( await clues(facts,'as_argument_es6.test.1'),'ok:test.1','returns right value');
        t.same( facts.as_argument_es6['test.1'].value(),'ok:test.1','stores promise with value');
      });

      t.test('asking for another property', async t => {
        t.same( await clues(facts,'as_argument_es6.test.2'),'ok:test.2','returns right value');
        t.same( facts.as_argument_es6['test.2'].value(),'ok:test.2','stores promise with value');
      });
    });

  });
});