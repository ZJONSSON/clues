var clues = require('../clues'),
    inject = require('../util/inject'),
    assert = require('assert');

var Db = {
  user : function(userid) {
    return // database.query('users where usedid = ?',[userid]);
  }
};

var Logic = {
  db : function(userid) {
    return Object.create(Db,{
      userid: {value: userid}
    });
  },
  userid : ['input.userid',String],
  never_traversed : {}
};


var injected = function($global) {
  return inject(Object.create(Logic), {
    'userid': function(original_userid) {
      return 'test_'+original_userid;
    },
    'db.user' : function(userid) {
      return { desc: 'this is an injected response', userid: userid};
    },
    'impossible.to.reach' : 42,
    'possible' : {},
    'possible.value': 42,
    'never_traversed.value' : 11
  },$global);
};

describe('inject',function() {
  it('modifies the api tree',function() {
    return clues(injected,'db.user',{input:{userid:'johndoe'}})
      .then(function(d) {
        assert.equal(d.userid,'test_johndoe');
      });
  });

  it('allows sequential injections',function() {
    return clues(injected,'possible.value',{})
      .then(function(d) {
        assert.equal(d,42);
      });
  });

  it('ignores base paths that do not exists',function() {
    return clues(injected,'impossible.to.reach',{})
      .then(function() {
        throw 'SHOULD_ERROR';
      },function(e) {
        assert.equal(e.message,'impossible not defined');
      });
  });

  it('does not execute injected paths that are not traversed',function() {
    return clues({},injected)
      .then(function(injected) {
        assert(typeof injected.never_traversed === 'function');
      });
  });
});