var instinct = require("../clues"),
    assert = require("assert");

describe('Global variable',function() {
  var logic = {
    a: 123,
    b: {
      count : 0,
      c : ['$input.test','$parent.a',function(test,a) {
        this.count +=1;
        return test+a;
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
});