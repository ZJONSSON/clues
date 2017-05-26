const clues = require('../clues');
const Promise = require('bluebird');
const t = require('tap');

const facts = {
  a: Promise.delay(100,2),
  b: a => Promise.delay(100,a+40)
};

let duration;

const $global = {
  $duration : (name, time) => duration = {name, time}
};

t.test('optional $duration in global', async t => {
  await clues(facts,'b',$global);
  t.ok(duration.time[0] > 100 && duration.time[0] < 200,'wait time correct');
  t.ok(duration.time[1] > 200,'total time correct');
});