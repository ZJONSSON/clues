// See optimization killers https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#1-tooling
const Promise = require('bluebird');
const execAsync = Promise.promisify(require('child_process').exec);
const t = require('tap');

const statusCodes = {
  1: ['OK','Clues Optimized'],
  2: ['ERR','Clues Not Optimized'],
  3: ['OK','Clues Always Optimized'],
  4: ['ERR','Clues Never Optimized'],
  6: ['ERR','Clues Maybe Optimized'],
  7: ['ERR','Clues Optimized by TurboFan']
};

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

t.test('V8 compiler', async t => {code
  const d = await execAsync('echo "'++'" | node  --allow-natives-syntax');
  console.log(d);
  t.same(!!((d & 4) || (d & 16)), true);
});