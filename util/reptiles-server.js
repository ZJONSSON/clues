var clues = require('../clues'),
    Promise = require('bluebird');

// We need to remove the default toJSON to see if a promise is private or not
delete Promise.prototype.toJSON;

function defaultStringify(obj, pretty, debug) {
  var cache = [];

  function jsonReplacer(key, value) {
    if (!value || value instanceof Date) return value;
    if (typeof value === 'function' && (value.name === 'private' || value.name === '$private')) return undefined;
    if (typeof value === 'function' || value.length && typeof value[value.length-1] === 'function')
      return debug ? '[Function]' : undefined;
    if (typeof value.then === 'function' || value.isFulfilled !== undefined)
      return (!value.private && debug) ? '[Promise]' : undefined;

    if (typeof value === 'object') {
      if (cache.indexOf(value) !== -1)
        return '[Circular]';

      var p = Object.getPrototypeOf(value);
      if (p !== Object.prototype && p !== Array.prototype)
        for (key in value)
          value[key] = value[key];

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
  options.$global = options.$global || {};
  var stringify = typeof options.stringify === 'function' ? options.stringify : defaultStringify;

  function stringifyError(e,debug) {
    var err = {error: true};
    Object.getOwnPropertyNames(e)
      .forEach(function(key) {
        err[key] = e[key];
      });
    if (e.stack) {
      err.status = 500;
      if (typeof options.logger === 'function')
        options.logger(err);
      
      if (!debug) {
        err = {
          error : true,
          message : 'Internal Error',
          status : 500
        };
      }
    }
    if (options.single)
      return {
        error : true,
        message : err.message,
        status : err.status,
        xflash : err.xflash
      };
    return err;
  }

  if (typeof(options.select) === 'string')
  options.select = options.select.split(',');

  return function(req,res) {
    var _res = (!options.quiet) ? res : {set: noop, write: noop, flush: noop},
        _end = _res.end,
        pretty = (options.pretty || req.query.pretty) && 2,
        first = '{                                     \t\n\n';
    req.body = req.body || {};
    _res.set('Transfer-Encoding','chunked');
    _res.set('Content-Type', 'application/json; charset=UTF-8');
    _res.set('Cache-Control', 'no-cache, no-store, max-age=0');
    
    _res.end = function() {
      _end.apply(_res,arguments);
      _res.end = _res.write = _res.flush = noop;
    };

    Object.keys(req.query || {})
      .forEach(function(key) {
        req.body[key] = req.query[key];
      });

    Object.keys(req.params || {})
      .forEach(function(key) {
        req.body[key] = req.params[key];
      });

    var $global = Object.create(options.$global,{
      res : {value: res},
      req : {value: req},
      input: {value: req.body},
      $duration_stats: {value: {}},
      $duration : {value: options.$global.$duration || function(ref,time) {
        $global.$duration_stats[ref] = time;
      }}
    });

    var facts;
    if (typeof(api) === 'object' && !api.length)
      facts = Object.create(api);
    else
      facts = clues({},api,$global,'__user__');

    $global.root = facts;

    function emit_property(ref,d,debug) {
      var txt = {};
      txt[ref] = d;
      txt = first+stringify(txt,pretty,debug,req);
      first = '';
      _res.write(txt.slice(1,txt.length-1)+',\t\n');
      if (typeof(res.flush) == 'function') _res.flush();
    }

    $global.$emit_property = emit_property;
    
    // The api request is either determined by options.select, req.param.fn or by remaining url
    var data = (options.select || decodeURIComponent((req.params && req.params.fn) || req.url.slice(1).replace(/\//g,'.').replace(/\?.*/,'')).split(','))
      .map(function(ref) {
        var debug;
        if (ref === '' && options.debug) ref = facts;
        return clues(facts,ref,$global,'__user__')
          .finally(function() {
            debug = options.debug !== undefined ? options.debug : $global.reptileDebug;
          })
          .catch(function(e) {
            return stringifyError(e,debug);
          })
          .then(function(d) {
            if (options.single) {
              _res.status(d.error ? (d.status||400) : 200)
                .end(stringify(d,pretty,debug,req));
              _res.write = noop;
              _res.end = noop;
              return;
            }
            if (d === undefined)
              d = null;

            emit_property(ref,d,debug);
          });
      });

    req.on('close',function() {
      data.forEach(function(d) {
        d.cancel();
      });
    });

    return Promise.all(data)
      .then(function() {
        if (options.debug !== undefined ? options.debug : $global.reptileDebug) {
        var stats = $global.$duration_stats;
        stats = Object.keys(stats)
          .map(function(key) {
            var val = stats[key];
            return {key: key, count:val.count, time: val.time, wait: val.wait};
          })
          .sort(function(a,b) {
            return b.time - a.time;
          });
          emit_property('$debug',stats);
        }
        _res.write('"__end__" : true\t\n}');
        res.end();
      });
  };
};