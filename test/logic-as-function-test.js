var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

function logic($global) {
  $global.$constant = 380;
  return { a : { b : function($constant) { return $constant; } } };
}

describe('When logic is a function',function() {
  it('it is evaluated before solving',function() {
    return clues(logic,'a.b')
      .then(function(d) {
        assert.equal(d,380);
      });
  });

  it('even nested functions are evaluated before solving',function() {
    function wrapped() {
      return function($global) {
        return logic;
      };
    }

    return clues(wrapped,'a.b')
      .then(function(d) {
        assert.equal(d,380);
      });
  });
});
