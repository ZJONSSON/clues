var clues = require('../clues'),
    Promise = require('bluebird');

// We need to remove the default toJSON to see if a promise is private or not
delete Promise.prototype.toJSON;

function stringify(obj,pretty) {
  var cache = [];

  function jsonReplacer(key, value) {
    if (!value || value instanceof Date) return value;
    if (typeof value === 'function' && value.name === 'private') return undefined;
    if (typeof value === 'function' || value.length && typeof value[value.length-1] === 'function')
      return '[Function]';
    if (typeof value.then === 'function' || value.isFulfilled !== undefined)
      return (!value.private) ? '[Promise]' : undefined;

    if (typeof value === 'object') {
      if (cache.indexOf(value) !== -1)
        return '[Circular]';
      cache.push(value);
    }
    return value;
  }

  return JSON.stringify(obj,jsonReplacer,pretty);
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
        pretty = (options.pretty || req.query.pretty) && 2,
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

    var $global = Object.create(options.$global || {},{
      res : {value: res},
      req : {value: req},
      input: {value: req.body}
    });

    var facts;
    if (typeof(api) === 'object' && !api.length)
      facts = Object.create(api);
    else
      facts = clues({},api,$global,'reptiles');

    $global.root = facts;
    
    // The api request is either determined by options.select, req.param.fn or by remaining url
    var data = (options.select || decodeURI((req.params && req.params.fn) || req.url.slice(1).replace(/\//g,'.').replace(/\?.*/,'')).split(','))
      .map(function(ref) {
        ref = ref.replace(/\//g,'.');
        if (ref === '' && options.debug) ref = facts;
        return clues(facts,ref,$global,'__user__')
          .catch(stringifyError)
          .then(function(d) {
            if (options.single) {
              _res.end(stringify(d,pretty));
              _res.write = noop;
              _res.end = noop;
              return;
            }
            if (d === undefined)
              d = null;
            for (var key in d) d[key] = d[key];
            var txt = {};
            txt[ref] = d;
            txt = first+stringify(txt,pretty);
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