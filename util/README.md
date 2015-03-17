A client/server wrapper around `clues.js`, providing client access to clues solving to a browser or node client with local fact/logic space.  

### `reptiles-server`
The server is initialized by providing base logic and optionally some options `function(logic,options)`

Available options are:
* `safe` : Disregards any input that would otherwise overwrite a logic function with same name
* `debug` Provide debug information with error messages

The initialized server is a function that can be placed into `express` paths.  If no arguments are given to the function, the API access is unrestricted, with requested variables (comma-delimited) in the `req.param.fn`.  If a specific array of values is given to the function, it will solve those variables only.  The user must provide all the inputs either as a JSON blob in the body and/or as querystring variables.

Example:
```
express()
  .use(bodyParser.json())
  .post('/api/:fn',reptilesServer(api))
```

### `reptiles-client`
The client can be loaded in a browser or required into node.js and inherits  `clues.js` .  A client is initialized by `reptile(logic,inputs,options)` and can subsequently be used to solve for facts / render widgets based on data.  The inputs should be a json array of known local facts.  The following options can be specified
* `url` The default base url for the reptiles-server, by default '/api/'
* `request` A list of options provided to the request object (if run on node)
* `delay` The client tries to aggregate multiple request for data into a single request. 
* `applyFn` An optional function run every time a fact has been resolved

In addition to providing all standard `clues.js` functions, the client also provides the following (browser only):
* `render(element)`  This function looks at the `data-reptile` attribute and solves for the logic function with the same name.   The logic function can use the argument `element` to gain access to the dom element itself.  If `data-reptile` is comma delimited the client will try to resolve the first value and then moving on to the next if the first resulted in an error, etc.
* `renderAll(element)` This function will call `render(element)` on all subnodes that have `data-reptile` defined.


