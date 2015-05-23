var clues = require('../clues'),
    Promise = require('bluebird');

function jsonReplacer(key, value) {
  if (value && typeof value === 'object') {
    var tmp = Array.isArray(value) ? [] : {};
    for (key in value)
      tmp[key] = value[key];
    value = tmp;
  }
  if (typeof value === 'function' || (value && value.length && typeof value[value.length-1] === 'function'))
    return '[Function]';
  return value;
}

function noop() {}

module.exports = function(api,options) {
  api = api || {};
  options = options || {};

  function stringifyError(e) {
    var err = {error: true};
    Object.getOwnPropertyNames(e)
      .forEach(function(key) {
        err[key] = e[key];
      });
    if (e.stack && !options.debug) {
      err.message = 'Internal Error';
      delete e.stack;
    }
    return err;
  }

  if (typeof(options.select) === 'string')
  options.select = options.select.split(',');

  return function(req,res) {
    var _res = (!options.quiet) ? res : {set: noop, write: noop, flush: noop},
        pretty = req.query.pretty && 2,
        first = '{                                     \t\n\n';
    req.body = req.body || {};
    _res.set('Transfer-Encoding','chunked');
    _res.set('Content-Type', 'application/json; charset=UTF-8');
    _res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    
    if (typeof(res.flush) == 'function') _res.flush();

    Object.keys(req.query || {})
      .forEach(function(key) {
        req.body[key] = req.query[key];
      });

    Object.keys(req.params || {})
      .forEach(function(key) {
        req.body[key] = req.params[key];
      });
    
    var data = (options.select || req.params.fn.split(','))
      .map(function(ref) {
        ref = ref.replace(/\//g,'.');
        var facts = Object.create(api);
        return clues(facts,ref,{res:res,req:req,input:req.body,$root:facts},'__user__')
          .catch(stringifyError)
          .then(function(d) {
            if (d === undefined) d = null;
            var txt = {};
            txt[ref] = d;
            txt = first+JSON.stringify(txt,jsonReplacer,pretty);
            first = '';
            _res.write(txt.slice(1,txt.length-1)+',\t\n');
            if (typeof(res.flush) == 'function') _res.flush();
          });
      });

    req.on('close',function() {
      data.forEach(function(d) {
        d.cancel();
      });
    });

    return Promise.all(data)
      .then(function() {
        _res.write('"__end__" : true\t\n}');
        res.end();
      });
  };
};