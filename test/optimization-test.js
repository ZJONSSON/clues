// See optimization killers https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#1-tooling
// optimizationStatus codes https://github.com/v8/v8/blob/master/src/runtime/runtime.h#L773
const Promise = require('bluebird');
const execAsync = Promise.promisify(require('child_process').exec);
const t = require('tap');

const code = `
  var clues = require('../clues');

  clues();
  // 2 calls are needed to go from uninitialized -> pre-monomorphic -> monomorphic

  clues();
  %OptimizeFunctionOnNextCall(clues);

  //The next call
  clues()
  process.stdout.write(String(%GetOptimizationStatus(clues)));
`;

t.test('V8 compiler', async t => {
  const d = await execAsync('echo "'+code+'" | node  --allow-natives-syntax', { cwd: __dirname });
  t.same(!!((d & 4) || (d & 8) || (d & 16)), true);
});
