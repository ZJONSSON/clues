// See optimization killers https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#1-tooling

var child_process = require('child_process');

var statusCodes = {
  1: ['OK','Clues Optimized'],
  2: ['ERR','Clues Not Optimized'],
  3: ['OK','Clues Always Optimized'],
  4: ['ERR','Clues Never Optimized'],
  6: ['ERR','Clues Maybe Optimized'],
  7: ['ERR','Clues Optimized by TurboFan']
};

var code = `
  var clues = require('../clues');

  clues();
  // 2 calls are needed to go from uninitialized -> pre-monomorphic -> monomorphic

  clues();
  %OptimizeFunctionOnNextCall(clues);

  //The next call
  clues()
  process.stdout.write(String(%GetOptimizationStatus(clues)));
`;

describe('V8 compiler',function() {
  it('optimize the clues function',function(cb) {
    child_process.exec('echo "'+code+'" | node  --allow-natives-syntax',function(err,stdout,stderr) {
      var status = statusCodes[stdout];
      cb(err || stderr || (status[0] === 'ERR' && status[1]),status);
    });
  });
});