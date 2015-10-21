 var clues = require('../clues'),
    assert = require('assert');

function shouldError(e) { throw 'Should error '+e;}
function notDefined(e) { assert.deepEqual(e.message,'test not defined'); }

[null,undefined,4,'a',0,Object,Array,Object.prototype].forEach(function(nothing) {
//  [Object.prototype].forEach(function(nothing) {
  describe('with value '+String(nothing),function() {
    describe(' as logic',function() {

      it('property not defined',function() {
        return clues(nothing,'test')
          .then(shouldError,notDefined);
      });

      it('path not defined',function() {
        return clues(nothing,'test.test')
          .then(shouldError,notDefined);
      });

      it('context of empty function is empty object',function() {
        return clues(nothing,function() {
          if (nothing == 'a')
            return assert.deepEqual(this,{0:'a'});
          else
            assert.deepEqual(this,{});
        });
      });
    });

    describe('as a property',function() {
      it('should resolve correctly',function() {
        var obj = {};
        obj.test = nothing;
        return clues(obj,'test')
          .then(function(d) {
            // functions are always resolved to objects
            return assert.deepEqual(d, typeof nothing === 'function' ? nothing() : nothing);
          },function(e) {
            // we only error if the property is `undefined`
            assert.equal(nothing,undefined);
            assert.equal(e.message,'test not defined');
          });
      });
    });
  });

});