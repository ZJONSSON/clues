const clues = require('../clues');
const t = require('tap');

function shouldErr() { throw 'Should throw an error'; }

t.test('error', {autoend: true},t => {
  const c = {a: function(b) { return b;}};

  t.test('when argument is not found', async t => {
    t.test('direct call',async t => {
      const e = await clues({},'SOMETHING').then(shouldErr,Object);
      //t.equal(e.error,true,'shows errors');
      t.same(e.message,'SOMETHING not defined','message: not defined');
      t.same(e.ref,'SOMETHING','ref: missing variable');
    });

    t.test('caller is logic function', async t => {
      const e = await clues(c,'a').catch(Object);
      t.same(e.error,true,'errors');
      t.same(e.ref,'b','ref is correct');
      t.same(e.message,'b not defined','message is correct');
      t.same(e.caller,'a','caller is correct');
    });
  });

  const Logic = {
    ERR : function() { throw 'Could not process'; },
    DEP : function(ERR) { return 'Where is the error'; }
  };

  t.test('throw', {autoend:true}, t => {

    t.test('directly', async t => {
      const facts = Object.create(Logic);
      const e = await clues(facts,'ERR').catch(Object);
      const reason = facts.ERR.reason();
      t.equal(e.message,'Could not process','message ok');
      t.same(e.ref,'ERR','ref ok');
      t.same(reason.message,'Could not process','facts register message');
    });

    t.test('indirectly - dependent fn', async t => {
      const facts = Object.create(Logic);
      const e = await clues(facts,'DEP').catch(Object);
      t.equal(e.message,'Could not process','message ok');
      t.same(e.ref,'ERR','ref ok');
      t.same(e.caller,'DEP','Should reference the first caller');
    });
  });

  t.test('function named $noThrow', {autoend: true}, t => {
    const facts = Object.create(Logic);

    t.test('thrown rejection', async t => {
      const e = await clues(facts,function $noThrow(DEP) { return DEP;});
      t.same(e.error,true,'Returns an object with the error');
      t.same(e.ref,'ERR','ref ok');
      t.equal(e.message,'Could not process','message ok');
    });

    t.test('error within subsequent fn', async t => {
      const fn = function $noThrow() {
        return ['DEP',Object];
      };
      const e = await clues(facts,fn);
      t.same(e.error,true,'Returns an object with the error');
      t.same(e.ref,'ERR','ref ok');
      t.equal(e.message,'Could not process','message ok');
    });
  });

  t.test('$logError', {autoend: true}, t => {

    const Global = {
      $logError : function(e,f) {
        this.error = e;
        this.fullref = f;
      }
    };

    t.test('error with a stack', async t => {
      const $global = Object.create(Global);
      const facts = {
        stack_error: function() { throw new Error('error');}
      };

      await clues(facts,'stack_error',$global).then(shouldErr,Object);
      t.same($global.error.message,'error');
      t.ok($global.error.stack,'contains a stack');
      t.same($global.error.fullref,'stack_error','fullref ok');
    });

    t.test('promise rejected with a stack', async t => {
      const $global = Object.create(Global);
      const facts = {
        stack_error_promise: ()  => clues.Promise.reject(new Error('error'))
      };

      await clues(facts,'stack_error_promise',$global).then(shouldErr,Object);
      t.same($global.error.message,'error','error passed to $logError');
      t.ok($global.error.stack,'contains a stack');
      t.same($global.error.fullref,'stack_error_promise','fullref ok');
    });

    t.test('error without a stack (rejection)', async t => {
      const $global = Object.create(Global);
      const facts = {
        rejection: function() { throw 'error';}
      };
      await clues(facts,'rejection',$global).then(shouldErr,Object);
      t.same($global.error,undefined,'should not $logError');
    });

    t.test('Promise rejection without a stack', async t => {
      const $global = Object.create(Global);
      const facts = {
        rejection_promise: function() { return Promise.reject('error');}
      };

      await clues(facts,'rejection_promise',$global).then(shouldErr,Object);
      t.same($global.error,undefined,'should not $logError');
    });

    t.test('stack error in an optional dependency', async t => {
      const $global = Object.create(Global);
      const facts = {
        stack_error: () => { throw new Error('error');},
        rejection: () => { throw 'error';},
        optional: (_stack_error,_rejection) => 'OK'
      };

      await clues(facts,'optional',$global);
      t.same($global.error.message,'error','error passed to $logError');
      t.ok($global.error.stack,'contains a stack');
      t.same($global.error.fullref,'optional.stack_error','fullref ok');
    });

  });
});