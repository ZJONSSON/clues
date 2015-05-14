var clues = require("../clues"),
    assert = require("assert"),
    Promise = require('bluebird');

describe('$ as a first letter',function() {

  var logic = {
    a : 10,
    b : 11,
    $logic_service : function(a) {
      return a;
    },
    top : function(a) {
      return {
        $nested_service : function(b) {
          return a+b;
        }
      };
    }
  
  };

  var global = {
    $global_service : function(b) {
      return b;
    }
  };

  describe('in logic',function() {
    it ('should return a function',function() {
      clues(Object.create(logic),'$logic_service',Object.create(global))
        .then(function($logic_service) {
          assert.equal(typeof $logic_service,'function');
          assert.equal($logic_service(20),20);
        });
      });
  });


  describe('in nested logic',function() {
    it ('should return a function',function() {
      clues(Object.create(logic),'top.$nested_service',Object.create(global))
        .then(function($nested_service) {
          assert.equal(typeof $nested_service,'function');
          assert.equal($nested_service(20),30);
        });
      });
  });

  describe('in global',function() {
    it('should return a function',function() {
      clues(Object.create(logic),'$global_service',Object.create(global))
        .then(function($logic_service) {
          assert.equal(typeof $logic_service,'function');
          assert.equal($logic_service(20),20);
        });
    });
  });
});


