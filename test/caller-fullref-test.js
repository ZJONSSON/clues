const clues = require('../clues');
const t = require('tap');

const facts = () => ({
  a : {
    b : {
      caller : function($caller) { return $caller; },
      fullref : function($fullref) { return $fullref; }
    }
  },
  call : ['a.b.caller',String],
  fullref : ['a.b.fullref',String]
});


t.test('$caller', {autoend:true}, t => {
  t.test('with fn called directly', async t => {
    t.same(await clues(facts,'a.b.caller'),undefined,'is null without caller');
    t.same(await clues(facts,'a.b.caller',{},'__user__'),'__user__','shows with caller');
  });
});

t.test('with fn called indirectly', async t => {
  t.same(await clues(facts,'call'),'call','shows last fn without provided caller');
  t.same(await clues(facts,'call',{},'__user__'),'call','shows last fn even with caller');
});

t.test('with $caller override in factsect', async t => {
  const o = facts();
  o.a.b.$caller = 'CUSTOM_CALLER';
  t.same(await clues(o,'call',{},'__user__'),'CUSTOM_CALLER','returns override');
});

t.test('$fullref', async t => {
  t.same(await clues(facts,'a.b.fullref'),'a.b.fullref','direct call shows fullref');
  t.same(await clues(facts,'fullref'),'fullref(.a.b.fullref','indirect call shows fullref');

  const o = facts();
  o.a.b.$fullref = 'CUSTOM_FULLREF';
  t.same(await clues(o,'fullref',{}),'CUSTOM_FULLREF','$fullref override returns override');
});
