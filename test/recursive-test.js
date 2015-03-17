var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

describe('In recursive logic',function() {
  var logic = {
    simple : {
      value : 2,
    },
    medium : Object.create({
      bucket : Object.create({
        value : Promise.delay(10,100)
      }),
    }),
    hard : ['simple.value',function(val) {
      return {
        a : {
          b : {
            c : {
              d : {
                id: val+100,
                e : {
                    f :12,
                    g : function(f) {
                      return 2*f;
                    },
                    h : function() {
                      return function(f) {
                        return f+2;
                      };
                    }
                }
              }
            }
          }
        }
      };
    }]
  };

  var facts = Object.create(logic);

  it('simple nesting works',function() {
    return clues(facts,'simple.value')
      .then(function(d) {
        assert.equal(d,2);
      });
  });

  it('medium nesting works',function() {
    return clues(facts,'medium.bucket.value')
    .then(function(value) {
      assert.equal(value,10);
    });
  });

  describe('complex nesting',function() {
    it('works', function() {
      return clues(facts,'hard.a.b.c.d.id').then(function(value) {
        assert.equal(value,102);
      });
    });

    it('works on returned functions',function() {
      return clues(facts,'hard.a.b.c.d.e.h')
        .then(function(h) {
          assert.equal(h,14);
        });
    });

    it('works when clue repeats twice',function() {
      return clues(facts,['hard.a.b.c.d.e','hard.a.b.c.d.e.f','hard.a.b.c.d.e.g',function(a,b,c) {
        assert.equal(b,12);
        assert.equal(c,24);
      }]);
    });

    it('supports optional',function() {
      return clues(facts,['_hard.a.b.c.d.id',function(value) {
        assert.equal(value,102);
      }]);
    });

    it('can be resolved manually',function() {
      return clues(facts,function(hard) {
        return clues(hard.a.b,function(c) {
          return clues(c.d,function(id) {
            assert.equal(id,102);
          });
        });
      });
    });

    it('bad path returns an error',function() {
      return clues(facts,'hard.a.b.c.d.i.oo.oo')
        .then(function() {
          throw 'We should not arrive here';
        },function(e) {
          assert.equal(e.ref, 'i');
          assert.equal(e.fullref, 'hard.a.b.c.d.i');
        });
    });

    it('optional bad path returns undefined',function() {
      return clues(facts,['_hard.a.b.e','simple.value',function(a,b) {
        assert.equal(a,undefined);
        assert.equal(b,2);
      }]);
    });

    it('optional bad path returns undefined',function() {
      return clues(facts,'hard.a.b.e')
        .then(function() {
          throw 'This function should return an error';
        },function(e) {
          assert.equal(e.message,'e not defined');
        });
    });

  });
});