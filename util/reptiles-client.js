(function(self) {
  var clues,request;
  var reptile = {};

  if (typeof module !== 'undefined') {
    module.exports = reptile;
    clues = require('clues');
    request = require('request');
  } else {
    self.reptile = reptile;
    clues = self.clues;
  }

  var Promise = clues.Promise;

  function defer() {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
  }

  function fetch() {
    var self = this,
        buffer = '',
        queue = self.$queue;

    delete self.$queue;

    if (!queue || !Object.keys(queue).length)
      return;

    self.data = self.data || {};

    var r = new XMLHttpRequest(),
        last = 0;

    r.open('POST','/api/'+Object.keys(queue).join(','),true);
    r.setRequestHeader('Content-Type','application/json;charset=UTF-8');
    r.send(JSON.stringify(self.$input));
    r.onprogress = function() {
      processBuffer(r.responseText.slice(last));
      last = r.responseText.length;
    };
    r.onload =  function() {
      processBuffer(r.responseText.slice(last));
    };

    function processBuffer(d) {
      if (d) buffer += d;

      var items = buffer.split(',\t\n');
      buffer = items.slice(items.length-1)[0];

      if (items.length < 2) return;
      
      items.slice(0,items.length-1)
        .forEach(function(item) {
          var m = /\s*\"(.*?)\"\s*\:\s*(.*)/.exec(item);
          if (!m) return;

          var key = m[1],value;
          if (!self[key]) return;

          try {
            value = JSON.parse(m[2]);
          } catch(e) {
            value = {error:true,message:'JSON parse error: '+e};
          }
          if (value && value.error)
            queue[key].reject(value);
          else
            queue[key].resolve(value);
          self.data[key] = value;
        });
      if (typeof self.$applyFn === 'function')
        self.$applyFn();
    }
  }

  reptile.external = function(options) {
    options = options || {};
    return function (ref) {
      var defer = defer(),
          self = this;

      if (!self.$queue) {
        Promise.delay(options.delay || 30)
          .then(fetch.bind(self,options));
        self.$queue = {};    
      }

      self.$queue[ref] = defer;
      return defer.promise;
    };
  };
 
  reptile.render = function(obj,element,tiles) {
    var keys = element.dataset.reptile.split(','),
        key;

    tiles = tiles || (window && window.tiles);

    function renderKey() {
      key = keys.shift();
      return clues(obj,tiles[key],{element:element})
        .catch(function(e) {
          if (keys.length) return renderKey();
          element.innerHTML = 'Error: '+e.message+' ('+e.ref+')';
        })
        .then(function(d) {
          obj.data[key] = d;
          return d;
        });
    }
    return renderKey();
  };

  reptile.renderAll = function(obj,element,tiles) {
    if (!element && !window) throw 'Not in a browser - element must be provided';
    tiles = tiles || (window && window.tiles);
    var selection = (element || window.document).querySelectorAll('[data-reptile]'),
        items = [].map.call(selection,function(d) {
          return reptile.render(obj,d,tiles);
        });
    return Promise.settle(items);
  };

  // Very hacky - needs to be addressed
  reptile.api = function(obj,options) {
    obj = obj || {};
    obj.api = obj.api || {};
    obj.api.data = obj.data =  obj.data || {};
    obj.api.$input = obj.$input;
    obj.api.$applyFn = obj.$applyFn;
    obj.api.$external = reptile.external(options);
    obj.$render = reptile.render.bind(obj,obj);
    obj.$renderAll = reptile.renderAll.bind(obj,obj);
    return obj;
  };

})(this);