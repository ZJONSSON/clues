var clues = require('../clues'),
    assert = require('assert');

describe('$property',function() {
  var logic = {
    a : 5,
    simple : Object.create({
      count : 0,
      $property : function(ref) {
        this.count+=1;
        if (isNaN(ref)) throw 'NOT_A_NUMBER';
        return +ref+2;
      }
    }),
    funct : function(a) {
      return {
        count : 0,
        $property : function(ref) {
          this.count+=1;
          return +ref+a;
        }
      };
    },
    nested : {
      $property : function(ref) {
        return { a : { b: { c: function() { return +ref+10; } } } };
      }
    },
    shorthand : function $property(ref) {
      return +ref * this.a;
    },
    concurrent : {
      $property : function() {
      return clues.Promise.delay(Math.random()*1000)
        .then(function() {
          return new Date();
        });
    }}
  };

  var facts = Object.create(logic);

  describe('in simple logic',function() {
    it('runs $property function for non-existent property',function() {
      return clues(facts,'simple.1234')
      .then(function(d) {
        assert.equal(d,1236);
        assert(facts.simple['1234'].isFulfilled());
        assert.equal(facts.simple['1234'].value(),1236);
        assert.equal(facts.simple.count,1);
      });
    });

    it('concurrent requests should return first response',function() {
      var requests = Array.apply(null, {length: 10})
        .map(function() {
          return clues(facts,'concurrent.test');
        });
      
      return clues.Promise.all(requests)
        .then(function(d) {
          return d.map(function(e) {
            assert.equal(e,d[0],'Return time should be the same');
          });
        });
    });

    it('runs $property again for a different property',function() {
      return clues(facts,'simple.1235')
        .then(function(d) {
          assert.equal(d,1237);
          assert.equal(facts.simple.count,2);
        });
    });

    it('previous results are cached',function() {
      return clues(facts,['simple.1234','simple.1235',function(a,b) {
          assert.equal(a,1236);
          assert.equal(b,1237);
          assert.equal(facts.simple.count,2);
        }]);
    });

    it('handles errors correctly',function() {
      return clues(facts,'simple.abc',{},'__test__')
        .then(function() {
          throw 'Should Error';
        },function(e) {
          assert.equal(e.message,'NOT_A_NUMBER');
          assert.equal(e.ref,'abc');
          assert.equal(e.fullref,'simple^abc');
          assert.equal(e.caller,'__test__');
          assert.equal(facts.simple.abc.isRejected(),true);
          assert.equal(facts.simple.abc.reason().message,'NOT_A_NUMBER');
          assert.equal(facts.simple.count,3);
        });
    });
  });

  describe('inside a function',function() {
    it('runs $property function for non-existent property',function() {
      return clues(facts,'funct.1234')
        .then(function(d) {
          assert.equal(d,1239);
          assert.equal(facts.funct.value().count,1);
        });
    });

    it('caches previous results',function() {
      return clues(facts,'funct.1234')
        .then(function(d) {
          assert.equal(d,1239);
          assert.equal(facts.funct.value().count,1);
        });
    });
  });
  
  describe('inside a nested structure',function() {
    it('runs $property',function() {
      return clues(facts,'nested.1234.a.b.c')
      .then(function(d) {
        assert.equal(d,1244);
        assert(facts.nested['1234'].value().a.b.c.isFulfilled());
        assert(facts.nested['1234'].value(),1244);
      });
    });

    it('handles error correctly',function() {
      return clues(facts,'nested.1234.a.b.d',{},'__test__')
        .then(function() {
          throw 'Should error';
        },function(e) {
          console.log('got error',e)
          assert.equal(e.ref,'d');
          assert.equal(e.fullref,'nested.1234.a.b^d');
          assert.equal(e.caller,'__test__');
        });
    });
  });

  describe('when function name is $property',function() {
    it('acts as a shorthand for empty object with $property',function() {
      return clues(facts,'shorthand.2')
        .then(function(d) {
          assert.equal(d,10);
          assert.equal(facts.shorthand.value()['2'].value(),10);
          return clues(facts,'shorthand.4');
        })
        .then(function(d) {
          assert.equal(d,20);
          assert.equal(facts.shorthand.value()['4'].value(),20);
          assert.equal(facts.shorthand.value()['2'].value(),10);
        });
    });
  });

});