var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('Array functions',function() {

  var logic = {
    M1 : [function() { return Promise.delay(100,10); }],
    M2 : function() { return Promise.delay(20,300); },
    M3 : ['M1','M2',function(a,b) { return a+b; }],
    M4 : function(M3) { return M3;},
    recursive : [['M1',Number],[['M2',Number],['M3',Number],Array],Array],
    regular_array : [1,2,3,4],
    nested : [function() {
      return function() {
        return ['M1',function(M1) {
          return M1+5;
        }];
      };
    }],
    input : {
      a: 40,
      b: 3
    },
    b: 2,
    partial: ['input.a', function(a, b){
      return a + b;
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

  it('should work with partial positional arguments',function() {
    return clues(facts, 'partial').then(function(r){
      assert.equal(r, 42);
    });
  });

  it('should work recursively',function() {
    return clues(facts,'recursive').then(function(d) {
      assert.deepEqual(d,[10,[300,310]]);
    });
  });
  
  it('should only execute arrays once', function() {
    var counter = 0;
    var otherContext = {
      M1: Promise.delay(100, 10),
      M2: Promise.delay(200, 20)
    };

    var logic = {
      M3: [otherContext, 'M1', 'M2', function(a,b) {
        counter++;
        return a + b;
      }]
    }
    var facts = Object.create(logic);

    return Promise.all([clues(facts,'M3'), clues(facts,'M3')])
      .then(function(results) {
        assert.equal(results[0],30);
        assert.equal(results[1],30);
        assert.equal(counter, 1);
      });
  });

});
