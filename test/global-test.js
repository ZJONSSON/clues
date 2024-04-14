const clues = require('../clues');
const t = require('tap');

const shouldErr = () => { throw 'Should error'; };

t.test('Global variable', async t => {
  const Logic = {
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

  const facts = Object.create(Logic);

  const global = {
    $input : {
      test: 10,
      test2: function(test) {
        return test+10;
      }
    }
  };

  t.test('when referenced as a dependency of a function', async t => {
    t.same(await clues(facts,'b.c',global), 133, 'uses the global variable');
    t.same(facts.b.count,1,'fn called once');
  });

  t.test('when referenced directly', async t => {
    const e = await clues(facts,'$input',global).then(shouldErr,Object);
    t.same(e.message,'$input not defined','should error');
  });

  t.test('inside a nested structure', async t => {
    t.same(await clues(facts,'d.c',global),29,'uses the global variable');
  });

  t.test('$global object as dependency', async t => {
    t.same(await clues(facts,'e.f.g',global), 4, 'uses the $global object');
  });
});