var clues = require('../clues'),
    Promise = require('bluebird');

function stringifyError(e) {
  return {
    message : e.message,
    ref : e.ref,
    caller : e.caller,
    stack : e.stack,
    error : true
  };
}

function multi(data,self,res,req) {
  res.setHeader('content-type','application/ocetstream');
  res.write('{\n\t"multi":true\t\n');

  data = data.split(',')
    .map(function(ref) {
      return self.solve(ref)
        .catch(stringifyError)
        .then(function(d) {
          res.write(',  "'+ref+'" : '+JSON.stringify(d)+'\t\n');
        });
    });

  req.on('close',function() {
    data.forEach(function(d) {
      d.cancel();
    });
  });

  return Promise.all(data)
    .then(function(d) {
      res.end('}');
    });
}

function help(self) {
  return Object.keys(self.logic);
}

module.exports = function(api) {
  api = api || {};
  api.multi = multi;
  api.help = help;

  return function(req,res) {
    res.set('Content-Type','application/json');
    clues(api,req.query)
      .solve(req.param("fn"),{req:req,res:res})
      .catch(stringifyError)
      .then(function(d) {
        if (d && !d.error && req.param('select')) {
          req.param('select')
            .split('.')
            .forEach(function(key) {
              d = d && d[key];
            });
        }
        
        res.end(JSON.stringify(d,null,2));
      });
  };
};