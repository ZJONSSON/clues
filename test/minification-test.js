var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

describe('Angular style minification',function() {

  var logic = {
    M1 : [function() { return Promise.delay(10,100); }],
    M2 : function() { return Promise.delay(300,20); },
    M3 : ['M1','M2',function(a,b) { return a+b; }],
    M4 : function(M3) { return M3;},
    regular_array : [1,2,3,4],
    nested : [function() {
      return function() {
        return ['M1',function(M1) {
          return M1+5;
        }];
      };
    }]
  };

  var facts = Object.create(logic);

  it('should resolve to the top',function() {
    return clues(facts,'M3')
      .then(function(d) {
        assert.equal(d,310);
      });
  });

  it('should work for individual functions',function() {
    return clues(facts,['M4',function(a) {
      assert.equal(a,310);
    }]);
  });

  it('should work for nested structures',function() {
    return clues(facts,['nested',function(d) {
      assert.equal(d,15);
    }]);
  });

  it('should not affect regular arrays',function() {
    return clues(facts,function(regular_array) {
      assert.equal(regular_array,logic.regular_array);
    });
  });
});