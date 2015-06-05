var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('optional argument',function() {

  var logic = {
    data : function() { return Promise.delay(5,1000); },
    passthrough : function(_optional) { return _optional; },
    internalize : function(data,_optional) { return data + (_optional || 2); },
    optional_data : function(_data) { return _data; }
  };

  describe('not supplied',function() {
    return it('should return undefined',function() {
      clues(Object.create(logic),'passthrough')
        .then(function(d) {
          assert.deepEqual(d,undefined);
        });
    });
  });

  describe('with internal default',function() {
    it('should use the internal default',function() {
      return clues(Object.create(logic),'internalize')
        .then(function(d) {
          assert.equal(d,7);
        });
    });
  });

  describe('with a set fact',function() {
    it('should return the right value',function() {
      return clues(Object.create(logic),'passthrough',{optional:10})
        .then(function(d) {
          assert.equal(d,10);
        });
    });
  });

  describe('with a working function',function() {
    it('should return the function results',function() {
      return clues(Object.create(logic),'optional_data')
        .then(function(d) {
          assert.equal(d,5);
        });
    });
  });

  describe('as an error',function() {
    var logic2 = {
      error : function() { throw '#Error'; },
      optional : function(_error) { return _error; },
      regular : function(error) { return error; },
      showerror : function(__error) { return __error;}
    };

    it('should return undefined, if optional',function() {
      return clues(Object.create(logic2),'optional')
        .then(function(d) {
          assert.equal(d,undefined);
        });
    });

    it('should raise error if non-optonal',function() {
      return clues(Object.create(logic2),'regular')
        .then(function() {
          throw 'Should error';
        },function(e) {
          assert.equal(e.message,'#Error');
        });
    });

    it('should return the error as an object when prefix is two underscores',function() {
      return clues(Object.create(logic2),'showerror')
        .then(function(e) {
          assert.equal(e.error,true);
          assert.equal(e.message,'#Error');
          assert.equal(e.fullref,'showerror.error');
          assert.equal(e.ref,'error');
        });
    });
  });
});


