var clues = require('../clues'),
    assert = require('assert');

describe('$external',function() {
  var logic = {
    a : 5,
    simple : Object.create({
      count : 0,
      $external : function(ref) {
        this.count+=1;
        if (ref == 'STOP') throw {message:'STOP_ERROR',error:true};
        return 'simple:'+ref;
      }
    }),
    shorthand : function $external(ref) {
      return 'answer:'+ref;
    },
    shorthandThis : function $external() {
      return this;
    },
    as_argument: function($external) {
      return 'answer:'+$external;
    },
    as_argument_es6: $external => 'answer:'+$external,
    concurrent : function $external() {
      return clues.Promise.delay(Math.random()*1000)
        .then(function() {
          return new Date();
        });
    }
  };

  var facts = Object.create(logic);

  describe('in simple logic',function() {
    it('runs $external function for non-existent property',function() {
      return clues(facts,'simple.test')
        .then(function(d) {
          assert.equal(d,'simple:test');
          assert(facts.simple.test.isFulfilled());
          assert.equal(facts.simple.test.value(),'simple:test');
          assert.equal(facts.simple.count,1);
        });
    });

    it('concurrent requests should return first response',function() {
      var requests = Array.apply(null, {length: 10})
        .map(function() {
          return clues(facts,'concurrent.test_concurrent');
        });
      
      return clues.Promise.all(requests)
        .then(function(d) {
          return d.map(function(e) {
            assert.equal(e,d[0],'Return time should be the same');
          });
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

  describe('when function name is $external',function() {
    it('acts as a shorthand for empty object with $external',function() {
      return clues(facts,'shorthand.first')
        .then(function(d) {
          assert.equal(d,'answer:first');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          return clues(facts,'shorthand.second');
        })
        .then(function(d) {
          assert.equal(d,'answer:second');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          assert.equal(facts.shorthand.value().second.value(),'answer:second');
        });
    });
    it('assumes this of the parent',function() {
      return clues(facts,'shorthandThis.test')
        .then(function(d) {
          assert.equal(d,facts);
        });
    });
  });

  describe('when argument name is $external',function() {
    it('acts as a shorthand for empty object with $external',function() {
      return clues(facts,'as_argument.first')
        .then(function(d) {
          assert.equal(d,'answer:first');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          return clues(facts,'as_argument.second');
        })
        .then(function(d) {
          assert.equal(d,'answer:second');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          assert.equal(facts.shorthand.value().second.value(),'answer:second');
        });
    });

    it('as ES6 acts as a shorthand for empty object with $external',function() {
      return clues(facts,'as_argument_es6.first')
        .then(function(d) {
          assert.equal(d,'answer:first');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          return clues(facts,'as_argument_es6.second');
        })
        .then(function(d) {
          assert.equal(d,'answer:second');
          assert.equal(facts.shorthand.value().first.value(),'answer:first');
          assert.equal(facts.shorthand.value().second.value(),'answer:second');
        });
    });
    
  });


});