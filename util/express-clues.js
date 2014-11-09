var clues = require('../clues'),
    Promise = require('bluebird');

module.exports = function(api,options) {
  api = api || {};
  options = options || {};
  
  function stringifyError(e) {
    var message = {
      message : (!options.debug && e.stack) ? 'Internal Error' : e.message,
      ref : e.ref,
      error : true
    };

    if (options.debug) {
      message.stack = e.stack;
      message.caller = e.caller;
    }

    return message;
  }

  return function(req,res) {
    req.body = req.body || {};
    res.set('Transfer-Encoding','chunked');
    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    res.write('{                                     \t\n\n');
    if (typeof(res.flush) == 'function') res.flush();

    Object.keys(req.query || {})
      .forEach(function(key) {
        req.body[key] = req.query[key];
      });
    
    if (options.safe) {
      Object.keys(req.body).forEach(function(key) {
        if (api[key]) delete req.body[key];
      });
    }

    var c = clues(api,req.body);

    var data = req.param("fn")
      .split(',')
      .map(function(ref) {
        return c.solve(ref,{res:res,req:req},'__user__')
          .catch(stringifyError)
          .then(function(d) {
            res.write('  "'+ref+'" : '+JSON.stringify(d)+',\t\n');
            if (typeof(res.flush) == 'function') res.flush();
          });
      });

    req.on('close',function() {
      data.forEach(function(d) {
        d.cancel();
      });
    });

    return Promise.all(data)
      .then(function(d) {
        res.write('  "__end__" : true\t\n}');
        res.end();
      });
  };
};