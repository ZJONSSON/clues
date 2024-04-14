const clues = require('../clues');
const crypto = require('crypto');
const t = require('tap');

function shouldError() { throw 'Should not run';}

t.test('Array fn private scope', async t => {

  t.test('With only array logic', async t => {
    function privateObj() {
      return {
        answer : (forty,two) => forty + two,
        forty : 40,
        two : 2,
        err : () => {
          throw 'This is an error';
        }
      };
    }

    const pub = {
      M1 : 100,
      M2 : 200
    };

    const obj = privateObj();  

    t.same(await clues(null,[obj,'answer',Number]),42,'works without array arguments');
    t.same(await clues(null,[privateObj,'answer',Number]),42,'works with private scope');
    

    let d1 = await clues({},[privateObj,'err',String])
      .then(shouldError,e => e);

    t.same(d1.message,'This is an error','handles errors correctly');

    let d2 = await clues(null,[Object.create(pub),[['M1',Number],['M2',Number],[privateObj(),'forty',Number],Array],Object]);
    t.same(d2,[100,200,40],'works recursively');
  });

  t.test('public/private structure', async t => {

    const PrivateLogic  = {
      secret : 'Hidden secret',

      hash : (secret,userid) => {
        return crypto.createHash('sha1')
          .update(secret)
          .update(userid)
          .digest('hex');
      },

      public : (hash,_userid) => {
        return {hash, userid : _userid};
      }
    };

    const Logic = {
      info : function(_userid) {
        return [
          Object.create(PrivateLogic,{userid:{value:_userid}}),
          'public',
          Object
        ];
      }
    };

    t.test('custom access to private segments',t => {
      const obj = Object.create(Logic,{userid: {value:'admin'}});
      return clues(obj,function(info) {
        t.same(info.userid,'admin','username matches');
        t.same(info.hash,'b21b8fd516dbb99584d651f040d970dba2245b2a','hash matches');
        t.same(obj.secret,undefined,'no obj.secret');
        t.same(info.secret,undefined,'no info.secret');
      });
    });

    t.test('handles errors correctly',t => {
      const obj = Object.create(Logic);
      return clues(obj,'info')
        .then(shouldError,function(e) {
          t.same(e.error,true,'errors');
          t.same(e.ref,'userid','userid as ref');
          t.same(e.message,'userid not defined','right error message');
          t.same(e.caller,'hash','caller is hash');
          t.same(e.fullref,'info(public(hash(userid','fullref');
        });
    });
  });
});
