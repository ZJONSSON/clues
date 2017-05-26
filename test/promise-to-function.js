const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const Logic = {
  a : 41,
  test : Promise.resolve(function(a) {
    return Promise.resolve(Promise.resolve(function() {
      return Promise.resolve(function() {
        return a+1;
      });
    }));
  }),

};

t.test('when promise resolve to a function', async t => {
  t.same(await clues(Logic,'test'),42,'function is evaluated');
});
