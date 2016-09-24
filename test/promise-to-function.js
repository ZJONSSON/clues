var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');


var logic = {
  a : 41,
  test : Promise.resolve(function(a) {
    return Promise.resolve(Promise.resolve(function() {
      return Promise.resolve(function() {
        return a+1;
      });
    }));
  }),

};

describe('When promise resolve to a function',function() {
  it('is used when resolved',function() {
    return clues(logic,'test')
      .then(function(d) {
        assert.equal(d,42);
      });
  });
});