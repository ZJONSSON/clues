var clues = require("../clues"),
    assert = require("assert");

describe('In recursive logic',function() {
  var logic = {
    simple : {
      value : 2,
    },
    medium : {
      bucket : {
        value : clues.prototype.Promise.delay(10,100)
      },
    },
    hard : ['simple.value',function(val) {
      return {
        a : {
          b : clues({
            c : {
              d : clues({
                id: val+100,
                e : clues( {
                    f :12,
                    g : function(f) {
                      return 2*f;
                    }
                })
              })
            }
          })
        }
      };
    }]
  };

  function noError(e) {
    throw 'Should not result in an error: '+e.message;
  }

  var c = clues(logic);

  it('simple nesting works',function() {
    return c.solve('simple.value')
      .then(function(d) {
        assert.equal(d,2);
      },noError);
  });

  it('medium nesting works',function() {
    return c.solve('medium.bucket.value').then(function(value) {
      assert.equal(value,10);
    },noError);
  });

  describe('complex nesting',function() {
    it('works', function() {
      return c.solve('hard.a.b.c.d.id').then(function(value) {
        assert.equal(value,102);
      },noError);
    });

    it('works when clue repeats twice',function() {
      return c.solve(['hard.a.b.c.d.e','hard.a.b.c.d.e.f','hard.a.b.c.d.e.g',function(a,b,c) {
        assert(a.facts,'hard.a.b.c.d.e should be a clues object');
        assert.equal(b,12);
        assert.equal(c,24);
      }]);
    });

    it('registers dot notion facts at the root factspace',function() {
      assert.equal(c.facts['hard.a.b.c.d.id'].value(),102);
    });

    it ('registers facts inside the tree',function() {
      assert.equal(c.facts['hard'].value().a.b.facts['c.d.id'].value(),102);
    });

    it('supports optional',function() {
      return c.solve(['_hard.a.b.c.d.id',function(value) {
        assert.equal(value,102);
      }]);
    });

    it('can be resolved manually',function() {
      return c.solve(function(hard) {
        hard.a.b.solve(function(c) {
          c.d.solve(function(id) {
            assert.equal(id,102);
          });
        });
      });
    });

    it('bad path returns an error',function() {
      return c.solve('hard.a.b.c.d.i.oo.oo')
        .then(function() {
          throw 'We should not arrive here';
        },function(e) {
          assert.equal(e.ref, 'i');
          assert.equal(e.fullref, 'hard.a.b.c.d.i');
        });
    });

    it('optional bad path returns undefined',function() {
      return c.solve(['_hard.a.b.e','simple.value',function(a,b) {
        assert.equal(a,undefined);
        assert.equal(b,2);
        assert.equal(c.facts['hard.a.b.e'].reason().message,'e not defined');
      }]);
    });

  });
});