var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

var Logic = {
  answer : async function() {
    var value = await Promise.delay(100).then(function() { return 41;});
    return value+1;
  }
}

describe('Async function',function() {
  it('should resolve',async function() {
    var answer = await clues(Logic,'answer');
    assert.equal(answer,42);
  })
});
