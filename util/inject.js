// This function sets given properties (each key is a full path) in a provided base object
// using clues to find the right location for each property before injecting.

var clues = require('../clues');

function inject(obj, prop, $global) {
  var keys = Object.keys(prop);

  return clues.Promise.mapSeries(keys, function(key) {
    var path = key.split('.'),
      base = path.length === 1 ? obj : path.slice(0, path.length - 1).join('.'),
      item = path[path.length - 1],
      value = prop[key];

    return clues(obj, base, $global, 'inject')
      .then(function(base) {
        var original = base[item];
        if (original !== undefined)
          base['original_'+item] = function private() {
            return original;
          };
        if (value.error)
          value = clues.Promise.reject(value);
        if (base[item] && base[item]._fulfill && base[item].isPending())
          base[item]._fulfill(value);
        else
          base[item] = value;
      })
      .catch(Object);
  })
  .then(function() {
    return obj;
  });
}

module.exports = inject;