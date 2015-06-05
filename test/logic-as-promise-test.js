var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');


var logic = Promise.delay(100).then(function() {
  return {
    $constant : 380,
     a :  function($constant) { return {b: $constant}; }
  };
});

describe('When logic is a promise',function() {
  it('is used when resolved',function() {
    return clues(logic,'a.b')
      .then(function(d) {
        assert.equal(d,380);
      });
  });
});