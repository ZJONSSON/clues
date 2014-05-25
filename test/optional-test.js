var clues = require("../clues"),
    assert = require("assert");


describe('optional argument',function() {

  var logic = {
    data : function(Promise) { return Promise.delay(5,1000); },
    passthrough : function(_optional) { return _optional; },
    internalize : function(data,_optional) { return data + (_optional || 2); },
    optional_data : function(_data) { return _data; }
  };

  describe('not supplied',function() {
    it('should return undefined',function() {
      return clues(logic)
        .solve('passthrough')
        .then(function(d) {
          assert.deepEqual(d,undefined);
        });
    });
  });

  describe('with internal default',function() {
    it('should use the internal default',function() {
      return clues(logic)
        .solve('internalize')
        .then(function(d) {
          assert.equal(d,7);
        });

    });
  });

  describe('with a set fact',function() {
    it('should return the right value',function() {
      return clues(logic,{optional:10})
        .solve('passthrough')
        .then(function(d) {
          assert.equal(d,10);
        });
    });
  });

  describe('with a working function',function() {
    it('should return the function results',function() {
      return clues(logic)
        .solve('optional_data')
        .then(function(d) {
          assert.equal(d,5);
        });
    });
  });

  describe('as an error',function() {
    var c = clues({
      error : function() { throw "#Error"; },
      optional : function(_error) { return _error; },
      regular : function(_error) { return _error; }
    });

    it('should return undefined, if optional',function() {
      c.solve('optional')
        .then(function(d) {
          assert.equal(d,undefined);
        });
    });

    it('should raise error if non-optonal',function() {
      c.solve('regular')
        .then(null,function(e) {
          assert.equal(d.err,"#Error");
        });
    });
  });
});


