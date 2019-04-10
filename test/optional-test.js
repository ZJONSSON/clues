const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const shouldErr = () => { throw 'Should error'; };

t.test('optional argument', {autoend: true}, t => {

  const Logic = {
    data : function() { return Promise.delay(1000,5); },
    passthrough : function(_optional) { return _optional; },
    internalize : function(data,_optional) { return data + (_optional || 2); },
    optional_data : function(_data) { return _data; }
  };

  t.test('not supplied', async t => {
    const facts = () => Object.create(Logic);
    t.same(await clues(facts,'passthrough'),undefined,'returns undefined');
  });

  t.test('internal default', async t => {
    const facts = () => Object.create(Logic);
    t.same(await clues(facts,'internalize'),7,'returns the default');
  });

  t.test('with a set global', async t => {
    const facts = () => Object.create(Logic);
    t.same(await clues(facts,'passthrough',{optional:10}),10,'returns global');
  });

  t.test('with a working function', async t => {
    const facts = () => Object.create(Logic);
    t.same(await clues(facts,'optional_data'),5,'returns value');
  });

  t.test('as an error', async t => {
    const logic2 = {
      error : function() { throw '#Error'; },
      optional : function(_error) { return _error; },
      regular : function(error) { return error; },
      showerror : function(__error) { return __error;}
    };

    const facts2 = () => Object.create(logic2);

    let d = await clues(facts2,'optional');
    t.same(d,undefined,'_ => undefined');

    d = await clues(facts2,'regular').then(shouldErr,Object);
    t.same(d.message,'#Error','raises error if not optional');

    d = await clues(facts2,'showerror');
    t.same(d.error,true);
    t.same(d.message,'#Error');
    t.same(d.fullref,'showerror(error');
    t.same(d.ref,'error');

  });

});

