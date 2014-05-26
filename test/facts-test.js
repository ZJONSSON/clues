var clues = require("../clues"),
    assert = require("assert");

describe('facts',function() {
  var c = clues({
    response : function() { return this.Promise.delay(42,500);},
    other : function() { return 5; }
  });


  it('should return the solved logic when determined',function() {
    var start = new Date();
    return c.solve('response')
      .then(function(d) {
        var wait = (new Date()) - start;
        assert.equal(wait >= 500,true,'wait was '+wait);
        assert.equal(d,42);
      });
  });

  it('should return value immediately when solved for again',function() {
    var start = new Date();
    return c.solve('response')
      .then(function(d) {
        var wait = (new Date()) - start;
        assert.equal(wait <= 5,true,'wait was '+wait);
        assert.equal(d,42);
      });
  });

  it('should not be solved for unrequested logic',function() {
    assert.equal(c.facts.other,undefined);
  });
});