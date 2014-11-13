#### Breaking changes in version 2.0:
* [Bluebird](https://www.npmjs.org/package/bluebird) is now the core promises library and the latest [Mocha](https://www.npmjs.org/package/mocha) is used for testing
* Logic functions have to return either value or promise, the `resolve` and `reject` methods have been removed
* Text errors are now returned as the `message` property of the thrown object, not as `err`
* Methods `all`, `as` and `wrapper` removed and methods `solver` and `fork` added for better flow control.

# clues.js
[Promises](https://github.com/promises-aplus) provide a very effective mechanism to construct complex interactions between asynchronous functions.  Most promise libraries focus on the promise object itself, and leave the actual structuring of complex logic up to the user.

**clues.js** simplifies structuring of long complex chains of logic by recursively and automatically solving dependencies for any given logical operation.  Output of any logic is memoized in a fact table, for a quick reuse

The first secret ingredient of clues.js is the inspection of function signatures. Argument names of supplied functions are parsed and matched to corresponding facts and logic functions (by name).   The second secret ingredient is the use of promises for all resolutions, callbacks and returns (using the engine/adapter of your choice).

Each argument of a logic function needs to have either a fact with the same name or a logic function with that name (if fact hasn't been determined yet).   If a `fact` with the same name as a function argument already exists (either previously resolved, or supplied directly), it is simply passed on as an argument value to the function.  If a fact is unresolved (i.e. undefined), a logic function with same name is executed to resolve the fact value, before passing it on to the original function for execution.  If neither a fact nor logic can be found with a given reference, a final check is made to see if this reference can be found in the local variables supplied or the clues object itself, before returning an error.

Each logic function will only execute when it's input arguments values are known (as a `fact`).  Each unknown input value will start off a `logic` function (by same name).  When a named logic function is executed, a corresponding fact is created as a promise on the results.   When the function has been resolved, the fact table is updated and the promise is fulfilled, allowing any derived functions to proceed.

Each logic function will execute only once (if at all) in an clues object. Multiple requests for the same logic will simply attach to the initial promise, and once the output is known, any further requests will simply return the resolved `fact` (or an error, respectively)

A clues object can be long-running, building up/memoizing all the facts as required or a quick temporary scaffold that is discarded once a particular answer has been recursively solved from given inputs.

##### Minification

Logic function can be defined in array form, where the function itself is placed in the last element, with the other elements representing argument names required for the function.  This allows for minification of code that uses clues.js.

In the following example, the local variable `a` stands for the `input1` fact and `b` is the `input2` fact
```
api.test = ['input1','input2',function(a,b) {
  ... function body ...
}]
```

##### Nesting
Logic trees can contain clues objects that provide a separate fact/logic space for any sub-components.  This allows for example person1 and person2 to have identical logic trees without sharing the same facts.   Trees can be traversed using dot notation, either when solving by string or using the minification definition above.   See `recursive-test.js` in the test directory for examples.  (todo: more docs).  Nesting can be turned off by defining the `ignoreDots` option when the clues object is created.

## API Reference

### `clues([logic],[facts],[options])`
Creates a new clues object based on a particular logic (set of functions and values by reference) and facts (associative arrays of known values).  Logic and fact objects can be defined/modified later as they are public variables of the clues object.

The logic object is used as read-only (i.e. any results will **only** alter fact object, not the logic object), allowing the same logic definition to be reused for multiple clues objects (each with a separate fact space).  Clues object can furthermore be chained by requiring any logic function of one clues object to use .exec() function of another.

If no logic is provided to clues in a browser environment, it will use the global object (Window)

An optional `fallback` function can be defined in the options object.  This function will be called whenever a reference can not be found in current fact/logic space and must return a promise.  To turn off nesting (see below) define the `ignoreDots` option as `true`.

### `clues.logic = {}`
Key/value dictionary of logic functions and/or values.   Functions in the logic object must only contain arguments names that correspond to either facts or as other logic functions/values.    Each logic function must either return a value or a promise.

Any logic property that is not a function will be assumed to be a default value for the same fact. This is only recommended for Global Constants, as the logic elements can be asynchronously used by different clues objects under asymmetric information (facts).

### `clues.facts = {}`
Key value dictionary of facts.  Facts can be user supplied, determined by logic functions or both.   Any fact that exists will prevent execution of logic by same name.  

### `clues.solve(function(arg1,arg2...) { ... } ,[local_vars])`
##### Supplied Function
This schedules an execution of the supplied function.  The argument names of the function will be parsed and matched to facts and logic (and `local` and `self`) within the instance object by argument name.  Any arguments that point to neither a fact nor logic (nor locals or properties of the clues object itself) will result in an error (unless prefixed with an underscore, making it optional).  The supplied function is essentially a callback function that is executed when the inputs are known.  This function returns a promise on its results.

Properties of the clues object (except functions) can be injected into the function arguments when referenced by name. Those include: `self`, `facts`, `logic`.  Additionaly the `local` keyword can be injected to get any local variables submitted, or the local variable can be injected by name (if defined in the local object).  Function of the clues object can be accessed through top level `this` or the injected `self` which retains the right reference inside nested function.  For example, `self.solve`, `self.solver` and `self.fork` provide functionality linked to the respective clues object that called the function.  Finally the Promise adaptor can be referenced through `self.Promise`.

 This properties are also available through the `this` context supplied to the logic function.

##### Local Variables
The second argument (optional) allows local variables that will be used, and have priority, against facts and logic.  The is to provide the flexibility to have functions respond to request specific variables, such as a response stream or to override any previously determined facts.  Please note however, that locals should really be used at end-points in logic, to ensure that locals do not contaminate derived facts.

##### Optional facts
By default all arguments have to be resolved for a function to be evaluated.  Any fact (i.e. argument name) can however be made optional by prefixing it with an underscore.  Any unresolved fact that is optional (either missing or an error) will show as `undefined` inside the function.  The following function will fail if fact `A` can not be resolved, but return `[fact_A,null]` if fact A exists but fact B can not be resolved (or returns an error):

```js
clues.solve(A,_B) {
  return [A,_B]
}
```

Please keep in mind that any variable that is referred to as optional will look for the un-prefixed name in the fact/logic tables.  A fact can therefore be optional in one function (name prefixed with underscore) and required in another (no prefix).  

##### Return = promise
The solve function always returns a promise.  As the main operations take place in the user supplied function, the subsequent promise might be of less interest, except for error handling.

##### Errors
Errors will include a `ref` property showing which logic function (by name) is raising the error.  If the thrown error is not an object (i.e. a string), the resulting error will be a (generic) object with `message` showing the thrown message and `ref` the logic function.  If the erroring function was called by a named logic function, the name of that function will show up in the `caller` property of the response.  This error handling will not force errors into Error Objects, which can be useful to distinguish between javascript errors (which are Error Object with `.stack`) and customer 'string' error messages (which do not have `.stack`).

Example: if any string errors should be passed on to the client, but javascript error messages should be masked you could for example do:
```
  .then(null,function(e) {
    if (e.stack) res.end(500,'Internal Error');
    else res.end(e.message);
  });
```
### `clues.solve("name",[local_vars])`
The `solve` function can also be called with a string name as first parameter and an optional locals object as the second parameter.  This is essentially the same as calling clues solve with a function with only one variable (i.e. name) and is ideal if you need to only work with one fact variable at a time.  As before if the name if prefixed with an underscore it is considered optional and returns `null` if unresolved.

### `clues.solver("name",[local_vars])`
Creates a wrapper around the `solve` method, making it easier to define new solution routes inside `.then()`.  

For example, if we first solve for `A` but want to solve for `B` only after and if `A` fails in a logic function:
```
logic.data = function() {
  return this.solve('A')
    .then(null,function() {
      return self.solve('B')
    });
}
```
or use the solver:
```
logic.data = function(solver) {
  return this.solve('A')
    .then(null,solver('B'))
}
```
### `clues.fork([update])`
This function creates a new `clues` object that uses the same logic as the parent, but creates a new fact space inherited from the parent.  Any changes to the new fact space will not affect the parent. 

Example: If we start with the following `clues` object and fork it:
```
var facts = {a: 1, b: 2},
    logic = {c : function(a,b) { return a + 1;},
  c = clues(logic,facts),
    f = c.fork({a: 10});

f.solve('c')
  .then(...)

```
The fork (`f`) will end up with the fact space: `{a: 10, b: 2, c: 11}` while parent facts remain unchanged:

###  `clues.prototype.Promise`
Clues.js is designed to work with any Promise library that supports the [Promises/A+](https://github.com/promises-aplus/promises-spec) specification through adaptors.  By default we use [bluebird](https://www.npmjs.org/package/bluebird) as it's super-fast, supports cancellation and works well in the browser well as node.js.   By overwriting the prototype object (or instance property) other libraries can be easily applied.   The Promise prototype is available as an injected parameter in any logic function, eliminating the need to specifically require the underlying promise library in the logic functions.

### Cancellability
Each `solve`-promise is cancellable, but the ability to cancel only reaches those logic functions that return cancellable promises. Any facts already established before a cancel is issued, will not be affected.  Here is a pseudo example of how such cancellation could be incorporated:
```js
locic.transactions = function(userid,Promise) {
  var connection = db.connect({host:...,});

  return new Promise(function(resolve,reject) {
    connection.get({'userid':'userid}, function(err,d) {
      if (err) return reject(err);
      return resolve(d);
    });
  })
  .cancellable()
  .catch(Promise.CancellationError,function() {
    connection.close();
  });
}
```

## Hints and tips
* Check the test folder for usage examples

* Helper modules are provided in the util directory.  Use `app.use(require('clues/util/express-clues'))(api)` to provide access to clues through an express route.

* By defining logic object as the `Window` object, all global functions and variables are made available.

* Complex tree of "knowledge spaces" can be created with multiple clues object that refer to one another inside respective logic functions


* Whenever there is high likelihood of particular information required shortly at some point, the easiest way is to execute an empty user function, with expected requirements as arguments.   The logic will appear to have a "clue" for what might happen next.

* If you want `A` executed before `B`, regardless of the results, simply include `A` as one of the function arguments to `B`, i.e. ```logic.B = function(A,Z,callback) { callback(..do something with Z...)}``` 