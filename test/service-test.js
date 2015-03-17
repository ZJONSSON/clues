var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

describe('$service',function() {
  var logic = {
    a : 5,
    simple : Object.create({
      count : 0,
      $service : function(ref) {
        this.count+=1;
        if (ref == 'STOP') throw {message:'STOP_ERROR',error:true};
        return 'simple:'+ref;
      }
    }),
    funct : function(a) {
      return {
        count : 0,
        $property : function(ref) {
          this.count+=1;
          return 'functservice:'+ref;
        }
      };
    },
    nested : Object.create({
      $property : function(ref) {
        return { a : { b: { c: function() { return 'nestedservice'+ref; } } } };
      }
    })
  };

  var facts = Object.create(logic);

  describe('in simple logic',function() {
    it('runs $service function for non-existent property',function() {
      return clues(facts,'simple.test')
        .then(function(d) {
          assert.equal(d,'simple:test');
          assert(facts.simple.test.isFulfilled());
          assert.equal(facts.simple.test.value(),'simple:test');
          assert.equal(facts.simple.count,1);
        });
    });

    it('passes the full path as argument',function() {
      return clues(facts,'simple.test.a.b.c')
        .then(function(d) {
          assert.equal(d,'simple:test.a.b.c');
          assert.equal(facts.simple.count,2);
        });
    });

    it('caches previous results',function() {
      return clues(facts,['simple.test','simple.test.a.b.c',function(a,b) {
        assert.equal(a,'simple:test');
        assert.equal(b,'simple:test.a.b.c');
        assert.equal(facts.simple.count,2);
      }]);
    });

    it('handles errors correctly',function() {
      return clues(facts,'simple.STOP')
        .then(function() {
          throw 'Should Error';
        },function(e) {
          assert.equal(e.error,true);
          assert.equal(e.message,'STOP_ERROR');
          assert.equal(facts.simple.count,3);
          assert.equal(e.fullref,'simple.STOP');
        });
    });
    
  });
});