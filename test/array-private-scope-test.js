var clues = require("../clues"),
    assert = require("assert"),
    crypto = require('crypto');

function shouldError() { throw 'Should not run';}

describe('Array fn private scope',function() {

  describe('With only array logic',function() {

    function private() {
      return {
        answer : function(forty,two) {
          return forty+two;
        },
        forty : 40,
        two : 2,
        err : function() {
          throw 'This is an error';
        }
      };
    }

    var pub = {
      M1 : 100,
      M2 : 200
    };

    it('works without array arguments',function() {
      var obj = private();
      return clues(null,[obj,function(answer) {
        assert.equal(answer,42);
      }]);
    });

    it('works with array arguments',function() {
      var obj = private();
      return clues({},[obj,'answer',function(d) {
        assert.equal(d,42);
      }]);
    });

    it('works with private scope defined from function',function() {
      return clues({},[private,function(answer) {
        assert.equal(answer,42);
      }]);
    });

    it('handles errors correctly',function() {
      return clues({},[private,'err',String])
        .then(function() { console.log(arguments);throw 'Should Error';},function(e) {
          assert.equal(e.ref,'err');
          assert.equal(e.fullref,'err');
          assert.equal(e.message,'This is an error');
        });
    });

    it('works recursively',function() {
      return clues({},[Object.create(pub),[['M1',Number],['M2',Number],[private(),'forty',Number],Array],function(d) {
        assert.deepEqual(d,[100,200,40]);
      }]);
    });
  });

  describe('public/private structure',function() {

    var PrivateLogic  = {
      secret : 'Hidden secret',

      hash : function(secret,userid) {
        return crypto.createHash('sha1')
          .update(secret)
          .update(userid)
          .digest('hex');
      },

      public : function(hash,_userid) {
        return {
          hash : hash,
          userid : _userid,
        };
      }
    };

    var Logic = {
      info : function(_userid) {
        return [
          Object.create(PrivateLogic,{userid:{value:_userid}}),
          'public',
          Object
        ];
      }
    };

    it('provides custom access to private segments',function() {
      var obj = Object.create(Logic,{userid: {value:'admin'}});
      return clues(obj,function(info) {
        assert.equal(info.userid,'admin');
        assert.equal(info.hash,'b21b8fd516dbb99584d651f040d970dba2245b2a');
        assert.equal(obj.secret,undefined);
        assert.equal(info.secret,undefined);
      });
    });

    it('handles errors correctly',function() {
      var obj = Object.create(Logic);
      return clues(obj,'info')
        .then(shouldError,function(e) {
          assert.equal(e.ref,'userid');
          assert.equal(e.message,'userid not defined');
          assert.equal(e.caller,'hash');
          assert.equal(e.fullref,'info.public.hash.userid');
        });
    });
  });
});
