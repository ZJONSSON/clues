var clues = require('../clues'),
    assert = require('assert');

clues.Promise.config({cancellation:true});

 var logic = {
    mph : function(_mpm) { 
      if (_mpm) return _mpm * 60;
      else return function(miles,hours) {
        return miles / hours;
      };
    },
    mpm : function(_mph) {
      if (_mph) return _mph / 60;
      return function(miles,hours) {
        return miles / hours / 60;
      };
    },
  };

describe('recursive logic',function() {

  it('should error if not optional',function() {
    var facts = {
      a : function(b) { return b;},
      b : function(a) { return a;}
    };

    return clues(facts,'a')
      .then(function() { throw 'Should error';},function(e) {
        assert.equal(e.message,'circular');
      });
  });

  it('should ignore recursion errors when optional (a)',function() {
    var facts = Object.create(logic,{
      hours : {value: 5},
      miles : {value: 10}
    });
    
    return clues(facts,'mph')
      .then(function(d) {
        assert.equal(d,10/5);
      });
  });

  it('should ignore recursion errors when optional (b)',function() {
    var facts = Object.create(logic,{
      mpm : {value: 10/5/60}
    });
    
    return clues(facts,'mph')
      .then(function(d) {
        assert.equal(d,10/5);
      });
  });

  it('should error with complex chains',function() {
    var facts = {
      a : function(b) {
        return b;
      },
      c : function() {
        return ['d.e.f',Object];
      },
      b : function() {
        return clues.Promise.delay(100)
          .then(function() {
            return function(c) {
              return c;
            };
          });
      },
      d : function() {
        var self = this;
        return {
          e : function() {
            return {
              f : function() {
                return [self,'a',Object];
              }
            };
          }
        };
      },
      g : ['_d.e.f',function() {
        return 42;
      }]
    };

    return clues(facts,function(__b,g) {
      assert.equal(g,42);
      assert.equal(__b.error,true);
      assert.equal(__b.message,'circular');
      assert.equal(__b.fullref,'b.c.d.e.f');
    });
  });
});