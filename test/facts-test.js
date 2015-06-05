var clues = require('../clues'),
    assert = require('assert'),
    Promise = require('bluebird');

describe('facts',function() {
  var logic = {
    response : function() { return Promise.delay(42,500);},
    other : function() { return 5; }
  };

  var facts = Object.create(logic);

  it('should return the solved logic when determined',function() {
    var start = new Date();
    return clues(facts,'response')
      .then(function(d) {
        var wait = (new Date()) - start;
        assert.equal(wait >= 500,true,'wait was '+wait);
        assert.equal(d,42);
      });
  });

  it('should return value immediately when solved for again',function() {
    var start = new Date();
    return clues(facts,'response')
      .then(function(d) {
        var wait = (new Date()) - start;
        assert.equal(wait <= 20,true,'wait was '+wait);
        assert.equal(d,42);
      });
  });

  it('should not be solved for unrequested logic',function() {
    assert(typeof facts.other === 'function');
  });
});