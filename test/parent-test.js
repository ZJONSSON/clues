var instinct = require("../clues"),
    assert = require("assert");

describe('Object one layer down',function() {

  var logic = {
    a: 123,
    b: {
      c : function($parent) {
        return $parent.a;
      }
    },
    b2 : {
      c : ['$parent.a',function(a) {
        return a;
      }]
    },
    c : {
      $parent:function() {
        return {d: 3};
      },
      e : ['$parent.d',function(d) {
        return d;
      }]
    },
    f : { g: { h : { a: 3 } } }
  };

  var facts = Object.create(logic);

  it('should reference prior level through "$parent"',function() {
    return instinct(facts,'b.c')
      .then(function(d)   {
        assert.equal(d,123);
      });
  });
   it('should reference prior level through "$parent"',function() {
    return instinct(facts,'b2.c')
      .then(function(d)   {
        assert.equal(d,123);
      });
  });

  it('should not overwrite a logic function named "$parent"',function() {
    return instinct(facts,'c.e')
      .then(function(d) {
        assert.equal(d,3);
      });
  });

  it('should work through multiple levels',function() {
    return instinct(facts,'f.g.h.$parent.$parent.$parent.a')
      .then(function(d) {
        assert.equal(d,123);
      });
  });

});