// This function sets given properties (each key is a full path) in a provided base object
// using clues to find the right location for each property before injecting.

var clues = require('../clues');

function inject(obj, prop, $global) {
  if (!$global)
    throw new Error('$global not supplied to inject');

  if (typeof prop !== 'object' || typeof obj !== 'object')
    throw new Error('Invalid properties passed to inject');

  var keys = [];
  for (var key in prop)
    keys.push(key);

  return clues.Promise.mapSeries(keys, function(key) {
    var path = key.split('.'),
      base = path.slice(0, path.length - 1),
      item = path[path.length - 1],
      value = prop[key];

    var o = obj;

    function nextLevel(o,base) {
      base = base.slice();
      var next = base.shift();
      var original = o[next];

      if (!next) {
        original = o[item];
        if (original !== undefined)
          Object.defineProperty(o,'original_'+item,{writable: true, value: function private() {
            return original;
          }});
        if (value.error)
          value = clues.Promise.reject(value);
        if (o[item] && o[item]._fulfill && o[item].isPending())
          o[item]._fulfill(value);
        else
          Object.defineProperty(o,item,{value: value, enumerable: true, writable: true});
      } else {
        var fn = function() {
          return clues(this,original || [],$global,'set','set')
            .then(d => {              
              return clues.Promise.resolve(d && nextLevel(d,base)).then( () => d);
            });
        };

        Object.defineProperty(o,next,{value: fn, enumerable: true, writable: true});
      }
    }

    return nextLevel(o,base);
  })
  .then(function() {
    return obj;
  });
}

module.exports = inject;