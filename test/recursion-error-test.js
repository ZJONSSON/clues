var clues = require('../clues'),
    assert = require('assert');

 var logic = {
    mph : function(_mpm) { 
      if (_mpm) return _mpm * 60;
      else return function(miles,hours) {
        return miles / hours;
      };
    },
    mpm : function(_mph) {
      if (_mph) return _mph / 60;
      return function(miles,hours) {
        return miles / hours / 60;
      };
    },
  };

describe('recursive logic',function() {

  it('should error if not optional',function() {
    var facts = {
      a : ['b',Object],
      b : ['a',Object]
    };

    return clues(facts,'a')
      .then(function() { throw 'Should error';},function(e) {
        assert.equal(e.message,'recursive');
      });
  });

  it('should ignore recursion errors when optional (a)',function() {
    var facts = Object.create(logic,{
      hours : {value: 5},
      miles : {value: 10}
    });
    
    return clues(facts,'mph')
      .then(function(d) {
        assert.equal(d,10/5);
      });
  });

  it('should ignore recursion errors when optional (b)',function() {
    var facts = Object.create(logic,{
      mpm : {value: 10/5/60}
    });
    
    return clues(facts,'mph')
      .then(function(d) {
        assert.equal(d,10/5);
      });
  });
});