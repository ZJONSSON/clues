var instinct = require("../clues"),
    assert = require("assert");

describe('Global variable',function() {
  var logic = {
    a: 123,
    b: {
      count : 0,
      c : ['$input.test',function(test) {
        this.count +=1;
        return test+123;
      }]
    },
    d: {
      u : 9,
      c : function(u) {
        return ['$input.test2',function(test) {
          return test+u;
        }];
      }
    },
    e : function($global) {
      $global.test = 4;
      return {f:{g:function(test) { return test;}}};
    }
  };

  var facts = Object.create(logic);

  var global = {
    $input : {
      test: 10,
      test2: function(test) {
        return test+10;
      }
    }
  };

  it('should be applied where referenced',function() {
    return instinct(facts,'b.c',global)
      .then(function(d) {
        assert.equal(d,133);
        assert.equal(facts.b.count,1);
      });
  });

  it('should be applied inside a function',function() {
    return instinct(facts,'d.c',global)
      .then(function(d) {
        assert.equal(d,29);
      });
  });

  it('can be used as object $global',function() {
    return instinct(facts,'e.f.g')
      .then(function(d) {
        assert.equal(d,4);
      });
  });
});