var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('recursive logic',function() {
  var logic = {
    hours : 5,
    miles : 10,
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
    a : ['b',Object],
    b : ['a',Object]
  };

  it('should error if not optional',function() {
    var facts = Object.create(logic);
    return clues(facts,'a')
      .then(function() { throw 'Did not error';},function(e) {
        assert.equal(e.message,'recursive');
      });
  });

  it('should provide alternative solutions when optional',function() {
    var facts = Object.create(logic);
    return clues(facts,'mph')
      .then(function(d) {
        assert.equal(d,10/5);
      });
  });
});