var clues = require('../clues'),
    assert = require('assert');

 function obj() {
  return {
    a : {
      b : {
        caller : function($caller) { return $caller; },
        fullref : function($fullref) { return $fullref; }
      }
    },
    call : ['a.b.caller',String],
    fullref : ['a.b.fullref',String]
  };
}

describe('$caller',function() {
  describe('with fn called directly',function() {
    it('is null without provided caller',function() {
      return clues(obj,'a.b.caller')
        .then(function(caller) {
          assert.equal(caller,undefined);
        });
    });

    it('shows provided caller',function() {
      return clues(obj,'a.b.caller',{},'__user__')
        .then(function(caller) {
          assert.equal(caller,'__user__');
        });
    });
  });

  describe('with fn called indirectly',function() {
    it('show last fn without provided caller',function() {
      return clues(obj,'call')
        .then(function(caller)  {
          assert.equal(caller,'call');
        });
    });

    it('shows last fn even with provded caller',function() {
      return clues(obj,'call',{},'__user__')
        .then(function(caller)  {
          assert.equal(caller,'call');
        });
    });
  });

  describe('with $caller override in object',function() {
    it('returns override',function() {
      var o = obj();
      o.a.b.$caller = 'CUSTOM_CALLER';
      return clues(o,'call',{},'__user__')
        .then(function(caller) {
          assert.equal(caller,'CUSTOM_CALLER');
        });
    });
  });

});

describe('$fullref',function() {
  it('direct call shows fullref',function() {
    return clues(obj,'a.b.fullref')
      .then(function(fullref) {
        assert.equal(fullref,'a.b.fullref');
      });
  });

  it('indirect call shows fullref',function() {
    return clues(obj,'fullref')
      .then(function(fullref) {
        assert.equal(fullref,'fullref.a.b.fullref');
      });
  });

  it('with $fullref override in object returns override',function() {
    var o = obj();
    o.a.b.$fullref = 'CUSTOM_FULLREF';
    return clues(o,'fullref',{})
      .then(function(fullref) {
        assert.equal(fullref,'CUSTOM_FULLREF');
      });
  });
});