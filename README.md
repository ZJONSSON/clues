# clues.js
If you haven't got a clue, then this library might be exactly what you need!

Promises provide a very effective mechanism to construct complex interactions between asynchronous functions.  However the specifications and current implementations focus on the promises themselves, not how they might be structured and efficiently linked together.  **clues.js** is a promising lightweight asynchronous library with a twist.  Inspired by [queue.js](https://github.com/mbostock/queue),   [require.js](http://requirejs.org/) and [async.js](https://github.com/caolan/async), this library resolves dependencies, as needed, between asynchronous functions, memoizing the output in a "fact table" along with any static inputs supplied. 

The first secret ingredient of clues.js is the inspection of function signatures, where argument names are parsed and matched to corresponding facts and logic functions (or local object variables).   The second secret ingredient is the use of promises for all resolutions, callbacks and returns are (using the engine/adaptor of your choice).

Each argument to a logic function needs to have a fact with the same name or a logic function if that fact hasn't been determined yet.   If a `fact` with the same name as a function argument already exists (either previously resolved, or supplied directly), it is simply passed on as an argument value to the function.  If a fact is unresolved (i.e. undefined), a logic function with same name is executed to resolve the fact value, before passing it on to the original function for execution.   If an argument name can neither be matched with a fact nor a logic function/value an error is raised.

Each logic function will only execute when it's input arguments values are known (as a `fact`).  Each unknown input value will start off a `logic` function (by same name).  When a named logic function is executed, a corresponding fact is created as a promise on the results.   When the function has been resolved, the fact table is updated and the promise is fulfilled, allowing any derived functions to proceed.

Each logic function will execute only once (if at all) in an clues object. Multiple requests for the same logic will simply attach to the original request callback and once the output is known, any further requests will simply return the resolved `fact` (or an error, respectively)

## API Reference

### `clues([logic],[facts])`
Creates a new clues object based on a particular logic (set of functions and values by reference) and facts (ref: value).  Logic and fact objects can be defined/modified later as they are public variables of the clues object.

The logic object is used as read-only (i.e. any results will only alter fact object, not the logic object), allowing the same logic definitions to be reused for multiple clues objects (each with a separate fact space).  Clues object can furthermore be chained by requiring any logic function of one clues object to use .exec() function of another.

If no logic is provided to clues in a browser environment, it will use the global object (Window)

### `clues.solve(function(arg1,arg2...) { .... } ,[local_vars])`
This schedules an execution of the supplied function.  The argument names of the function will be parsed and matched to facts and logic within the instance object by argument name.  Any arguments that point to neither a fact nor logic will result in an error.  The supplied function is essentially a callback function that is executed when the inputs are known.  

The second argument (optional) allows local variables that will be used, and have priority, against facts and logic.  The is to provide the flexibility to have functions respond to request specific variables, such as a response stream or to override any previously detemined facts.  Please note however, that locals should really be used at end-points in logic, to ensure that locals do not contaminate derived facts.

The solve function returns a promise.  As the main operations take place in the user supplied function, the subsequent promise might be of less interest, except for error handling.

### `clues.solve("name",[local_vars])`
The exec function can also be called with a string name as first parameter and an optional locals object as the second parameter.  This is essentially the same as calling clues exec with a function with only one variable (i.e. name) and is ideal if you need to only work with one fact object.  

As before the solve function returns a promise on the results and a natural step would be to chain into .then(resolveCb,ErrorCb) for further processing.

### `clues.logic = {}`
Key/value dictionary of logic functions and/or values.   Functions in the logic object must only contain arguments names that correspond to either facts or as other logic functions/values.    Each logic function must execute a callback at some point with the resolved value or an error. The typical way to execute the callback is to call `this.callback(err,value)` ensuring that the `this` object passed at the top is stored as a local variable if the results are returned from a deeper scope.

##### `this` context for logic functions

There are multiple ways to initiate callbacks from a logic function, using `this` object.  The context of `this` object is not the clues object itself, but an artificial context, specific to the function itself, containing the following references:

`this.facts` is a reference to the current facts object of the clues instance (should not be used really, except to overwrite other facts)

`this.all` is same as `this.facts` except it forces a complete exec() of all unresolved definitions in the logic object.  

`this.callback` is the standard callback that requires `(err,value)` as parameters

`this.success` is syntax sugar for `this.callback(null,value)`

`this.error` is syntax sugar for `this.callback(error,null)`

Additionally we have `this.resolve` and `this.reject` for those who like jquery promises way of resolving outstanding requests.


##### Bonus level - this properties as reserved argument names
Most asynchronous functions lose the context of the original `this` object requiring the programmer to store `this` as a local `that` or `self` at the top of the function.  In an attempt to eliminate this tedious requirement, all properties of `this` object are injected as function arguments if/when their names appear as arguments in the function signature.  This obviously means that those names are reserved and cannot be used as names of facts or custom logic.

Example:

```js
function(name,db) {
  var that = this;
  async.function(db,function(d) {
    another_async(name,function(e,f,g,h) {
       that.resolve(g)
    })
  })
}
```
can be simplified to the following:

```js
function(name,db,resolve) {
  async.function(db,function(d) {
    another_async(name,function(e,f,g,h) {
       resolve(g)
    })
  })
}
```

##### Non-functions = default values
Any logic element that is not a function will be assumed to be a default value for the same fact. This is only recommended for Global Constants, as the logic elements can be asynchronously used by different clues objects under asymmetric information (facts).

### `clues.as(name)`
Helper that returns a node callback function  and registers the corresponding promise in the fact table (by name).   This helper eliminates the need to write wrappers around independent functions that can execute immediately.  The execution of the `clues.as()` itself should not be delayed inside higher callbacks, as it registers the name within the instance object, allowing other functions to queue up for the results.

We can for example write this:

```js
I.logic.dat = function(cb) {
  $.ajax("./somefile.txt")
    .done(cb)
}
```
simply .as this:

```js
$.ajax("./somefile.txt")
  .done(I.as("dat"))
```

### `clues.facts = {}`
Key value dictionary of facts.  Facts can be user supplied, determined by logic functions or both.   Any fact that exists will prevent execution of logic by same name.  

###  `clues.prototype.adaptor`
Clues.js is designed to work with any Promise library that supports the [Promises/A+](https://github.com/promises-aplus/promises-spec) specification through adaptors.  By default we use [Q](https://github.com/kriskowal/q) as it works well in the browser as well as node.js.   By overwriting the prototype object (or instance property) other libraries can be easily applied.

## Hints and tips
* Asynchronous functions must return nothing (i.e. return undefined) and call callback, resolve or reject at some point.   Any function with a return value will be assumed to be synchronous (promise is fulfilled on that returned value), regardless of any subsequent calls to a callback.

* By defining logic object as the `Window` object, all global functions and variables are made available.

* Complex tree of "knowledge spaces" can be created with multiple clues object that refer to one another inside respective logic functions

* Whenever there is high likelihood of particular information required shortly at some point, the easiest way is to execute an empty user function, with expected requirements as arguments.   The logic will appear to have an clues.js for what might happen next.

* If you want `A` executed before `B`, regardless of the results, simply include `A` as one of the function arguments to `B`, i.e. ```logic.B = function(A,Z,callback) { callback(..do something with Z...)}```

* clues.js does not handle multiple asynchronous requests for of a single fact (such as an an array that depends on result of multiple request).  Separate counter within a logic function should be used (executing `callback` when outstanding requests zero) or (better yet) use queue.js to control the sub-logic.

*  This README file is now about 6 times larger than the minified library itself. 