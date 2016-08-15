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
  userid : ['input.userid',String]
};


var injected = function($global) {
  return inject(Object.create(Logic), {
    'userid': function(original_userid) {
      return 'test_'+original_userid;
    },
    'db.user' : function(userid) {
      return { desc: 'this is an injected response', userid: userid};
    }
  },$global);
};

describe('inject',function() {
  it('modifies the api tree',function() {
    return clues(injected,'db.user',{input:{userid:'johndoe'}})
      .then(function(d) {
        assert.equal(d.userid,'test_johndoe');
      });
  });
});