var clues = require('../clues'),
    assert = require('assert');

describe('Global variable',function() {
  var logic = {
    a: 123,
    b: {
      count : 0,
      c : ['$input.test',function(test) {
        this.count +=1;
        return test+123;
      }]
    },
    d: {
      u : 9,
      c : function(u) {
        return ['$input.test2',function(test) {
          return test+u;
        }];
      }
    },
    e : function($global) {
      $global.test = 4;
      return {f:{g:function(test) { return test;}}};
    },
    h : function() {
      return {
        $global : 'OVERRIDE_$GLOBAL',
        i : function($global) {
          return $global;
        },
        j : function(test) {
          return test;
        }
      };
    }
  };

  var facts = Object.create(logic);

  var global = {
    $input : {
      test: 10,
      test2: function(test) {
        return test+10;
      }
    }
  };

  it('should be applied where referenced',function() {
    return clues(facts,'b.c',global)
      .then(function(d) {
        assert.equal(d,133);
        assert.equal(facts.b.count,1);
      });
  });

  it('can not be applied directly',function() {
    return clues(facts,'$input',global)
      .then(function() {
        throw 'Should Error';
      },function(e) {
        assert.equal(e.message,'$input not defined');
      });
  });

  it('can not be applied as part of dot notation',function() {
    return clues(facts,'d.c',global)
      .then(function(d) {
        assert.equal(d,29);
      });
  });

  it('can be used as object $global',function() {
    return clues(facts,'e.f.g',global)
      .then(function(d) {
        assert.equal(d,4);
      });
  });
});