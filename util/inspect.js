const clues = require('../clues');
const matchArgs = clues.matchArgs;

// Allow inspection of dependency trees within the api

module.exports = function(app) {
  return $external => {
    return [{ app: app }, $external, d => (res, req, _inputᐅinspect_ignore) => {
      let deps = '';
      const url = req.originalUrl.replace(/&/g, '&amp;').split('?');
      const setUrl = path => url[0] + '.' + path + '?' + url[1];

      function process(fn, key) {
        let args;

        // Parse arguments from a function (or array defined function)
        if (typeof fn === 'function')
          args = matchArgs(fn);
        else if (fn && fn.length && typeof fn[fn.length - 1] === 'function')
          args = fn.slice(0, fn.length - 1);

        const seen = new Set();

        (args || [])
        .forEach(label => {
          if (typeof label !== 'string')
            return;

          label = label.split(/ᐅ|\./)[0];

          if (_inputᐅinspect_ignore) {
            const re = new RegExp(_inputᐅinspect_ignore);
            if (re.exec(d))
              return;
          }

          let optional;
          if ((optional = (label[0] === '_'))) label = label.slice(1);
          if ((label[0] === '_')) label = label.slice(1);

          if (label[0] === '$') {
            deps += `subgraph "cluster${label[0]}" {  style=dashed;  "${label}"[URL="${setUrl(label)}"];  label="Services";  }  `;
          } else if (typeof d[label] !== 'function') {
            deps += `subgraph "cluster_objects" {  style=double;  "${label}"[URL="${setUrl(label)}"];  label="Resolved values";  }  `;
          }
          if (!seen.has(label)) {
            deps += `"${label}"[URL="${setUrl(label)}"];  `;
            deps += `"${label}" -> "${key}"[style=${optional ? 'dotted' : 'solid'}];  `;
            seen.add(label);
          }
        });
      }

      if (typeof d === 'object') {
        // Ensure all keys are brought from prototype chain to the object
        let proto = d;
        while ((proto = Object.getPrototypeOf(proto)) && proto !== Object.prototype && proto !== Array.prototype) {
          Object.getOwnPropertyNames(proto).forEach(key => {
            if (key !== 'constructor') d[key] = d[key] || proto[key];
          });
        }

        // Register all the main keys inside "Current Object" cluster
        deps += 'subgraph "clusterMain" {label="Current Object";  ';
        deps += Object.keys(d).map(key => `"${key}"[URL="${setUrl(key)}"]`).join('  ');
        deps += '}  ';

        Object.keys(d).forEach(key => process(d[key], key));
      } else {
        deps += 'Value;  ';
      }

      res.set('content-type', 'text/html');
      res.end(`<html>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.0.0/viz.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.0.0/full.render.js"></script>
        <body></body>
        <script>
        var viz = new Viz();
        viz.renderSVGElement('digraph { rankdir = LR; ${deps} }')
        .then(function(element) {
          document.body.appendChild(element);
        })
        .catch(error => {
          // Create a new Viz instance (@see Caveats page for more info)
          viz = new Viz();

          // Possibly display the error
          console.error(error);
        });
      </script></html>
      `);
    }];
  };
};