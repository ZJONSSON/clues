const clues = require('../clues');
const Promise = require('bluebird');
const inject = require('../util/inject');
const t = require('tap');

const shouldErr = () => { throw 'Should Error'; };

const Db = {
  user : (userid) => undefined // database.query('users where usedid = ?',[userid]);
};

const Logic = {
  db : function(userid) {
    return Object.create(Db,{
      userid: {value: userid}
    });
  },
  userid : ['input.userid',String],
  never_traversed : {},
  $transform : function $prep(possibleᐅvalue) {
    return function $service(d) {
      return d + possibleᐅvalue;
    };
  }
};


const injected = $global => inject(Object.create(Logic), {
  'userid': function(original_userid) {
    return 'test_'+original_userid;
  },
  'db.user' : function(userid) {
    return { desc: 'this is an injected response', userid: userid};
  },
  'impossible.to.reach' : 43,
  'possible' : {},
  'possible.value': 42,
  'never_traversed.value' : 11,
  '$transform': function $prep($original_transform) {
    return function $service(d) {
      return $original_transform(d)+10;
    };
  }

},$global);

t.test('inject', {autoend: true}, t => {
  t.test('simple example', {autoend: true}, t => {
    t.test('modified api tree', async t => {
      const d = await clues(injected,'db.user',{input:{userid:'johndoe'}});
      t.same(d.userid,'test_johndoe','username is now available');
    });

    t.test('sequential injection into a nested value', async t => {
      const d = await clues(injected,'possible.value',{});
      t.same(d,42,'resolves to injected value');
    });

    t.test('injecting base paths that do not exist', async t => {
      const d = await clues(injected,'impossible.to.reach',{});
      t.same(d,43,'resolves to injected value');
    });

    t.test('injected paths that are not traversed', async t => {
      const d = await clues({},injected);
      t.same(typeof d.never_traversed,'function','are not executed');
    });

    t.test('injecting a $service', async t => {
      const $transform = await clues(injected,'$transform',{});
      t.same($transform(10),62);
    });
  });

  t.test('injecting without $global', async t => {
    const d = await Promise.try(() =>inject(Object.create(Logic),{'possible.value': 42})).then(shouldErr,Object);
    t.same(d.message,'$global not supplied to inject','throws');
  });

  t.test('injecting a non-object', async t => {
    const d = await Promise.try(() =>inject(Object.create(Logic),42,{})).then(shouldErr,Object);
    t.same(d.message,'Invalid properties passed to inject','throws');
  });
});