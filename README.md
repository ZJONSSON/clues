[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Coverage](https://zjonsson.github.io/clues/badge.svg)](https://zjonsson.github.io/clues/)

**clues.js** is a lean-mean-promisified-getter-machine that crunches through nested javascript objects, resolving functions (including ES6 arrow functions), values and promises.  Clues consists of a single getter function (~300 loc) that dynamically resolves dependency trees and memoizes resolutions (derived facts) along the way.   It handles the ordering of execution and allows you to think more about the logic of determining the result of a calculation, whether the inputs to those calculations are known values, functions, or asynchronous calls. 

[Intro presentation](http://zjonsson.github.io/clues)

Example:

```js
var obj = {
  miles : 220,
  hours : Promise.delay(100).then(d => 2.3),
  minutes : hours => hours * 60,
  mph : (miles,hours) => miles / hours,
  car : {
    model: 'Tesla'
  }
};

// get mph directly (second argument references what we want to solve for)
clues(obj,'mph')
  .then(console.log);

// get multiple properties through a function as second argument
// - the fn is only executed when all the arguments have been resolved
clues(obj,function(minutes,mph,carᐅmodel) {
  console.log(`Drove for ${minutes} at ${mph} miles/hour in a ${carᐅmodel}`);
});
```

Clues recursively solves for properties of nested object.  Whenever `clues` hits a property that is an unresolved function it will parse the argument names (if any) and attempt to resolve the argument values (from properties within same scope that have the same name as each argument).  Any property requested, either directly or indirectly, will be immediately morphed into a promise on its own resolution or the solved value (in the case where it was not asynchronous).  If any requested unresolved function requires other properties as inputs, those required properties will also be replaced with promises on their resolution etc..   Once all dependencies of any given function have been resolved, the function will be evaluated and the corresponding promise resolved (or rejected) by the outcome.   

#### Updates in 4.0
Clues 4.0 contains a number of significant changes:

* Internal value resolution only uses promises when it absolutely has to.
* If previously resolved or reject Bluebird promises are used, their values are introspected and used immediately rather than deferred.  This eases a lot of pressure on `nextTick` promise resolution.
* As a result, `{ k: () => 5 }` will be turned into `{ k: 5 }` if you ask Clues to solve for `k`
* For performance reasons, throwing an object (e.g. `throw { message: 'ERROR_OCCURRED', details: 5 }`) will now only retain the keys `message` and `value`.  `value` can contain any object with whatever details you want bubbled all the way up.

#### Function signature
The basic function signature is simple and **always** returns a promise:

#### `clues(obj,fn,[$global])`

##### logic/facts (first argument)
The first argument of the clues function should be the object containing the logic/facts requested (or a function/promise that delivers this object).    The logic/facts object is any Javascript object, containing any mix of the following properties (directly and/or through prototype chains):

* Static values (strings, numbers, booleans, etc)
* Functions (i.e. logic) returning anything else in this list (supports async/await)
* Promises returning anything else in this list
* Other javascript objects (child scopes)
* Functions returning a function that returns anything in this list....
* ....etc

 
##### fn (second argument)
The second argument is a reference to the property/function requested, defined as any of the following:

* Name of the property to be resolved (or a path to the property, using dot notation)
* A custom function whose argument names will be resolved from the logic/facts prior to execution
* Array defined function (see [below](#using-special-arrays-to-define-functions))

Here are a few examples:
```js
clues(obj,'person').then(console.log);              // by name
clues(obj,function(person) { console.log(person); }) // by function
clues(obj,['person',console.log]);                  // by array defined function
var person = await clues(obj,'person')               // Using await inside async function
```

There are only a few restrictions and conventions you must into account when defining property names:

* Any property name starting with a [$](#-at-your-service) bypasses the main function cruncher (great for services)
* [`$property`](#property---lazily-create-children-by-missing-reference) and [`$external`](#external-property-for-undefined-paths) are special handlers for missing properties  (if they are functions)
* Any function named in-line as `$property` or `$external` (or as only argument name of a function) will act as shorthands
* `$global` will always return the full global object provided, in any context.
* `$caller` and `$fullref` are reserved to provide access to the current state of the clues solver when it hits a function for the first time.
* Property names really should never start with an underscore (see [optional variables](#making-arguments-optional-with-the-underscore-prefix))
* Any [array whose last element is a function](#using-special-arrays-to-define-functions) will be evaluated as a function... Angular style
* Any function explicitly named [`$private`](#making-anonymous-functions-private) (regardless of the property name) will not be accessible directly 
* ES6 arrow functions will be resoleved as regular functions with same `this` context

That's pretty much it.

##### global (optional third argument)
The third argument is an optional [global object](#global-variables), whose properties are available from any scope.  The global object itself is handled as a logic/facts object and will be traversed as required.  Examples of variables suited for global scope are user inputs and services.

`clues(obj,'person',{userid:'admin',res:res}).then(console.log);`

##### caller and fullref (internal)
As clues traverses an object by recursively calling itself each step of the way it passes information about `caller`,  i.e. which reference is requesting each property and `fullref` a delimited list of the traversed dependency path so far. A caret (`^`) in the fullref path  denotes a dependency relationship (through function argument) whereas a dot (`.`) signals parent-child traversal.

The full function signature (with the internal arguments)  is therefore:
`function clues(obj,fn,[$global],[caller],[fullref]) {...`

and here is an advanced example:
`clues(obj,'person',{userid:'admin',res:res},'__user__','top.child') `


### reusing logic through prototypes 
Since `clues` modifies any object property referencing a function to the promise of the outcome, a logic/facts object lazily transforms from containing mostly logic functions to containing resolved set of facts (possibly in the form of resolved promises).

An entirely fresh logic/facts object is required for a different context (i.e. different set known initial facts).  A common pattern is to define all logic in a static object (as the prototype) and then only provide instances of this logic/facts object to the `clues` function, each time a new context is required.   This way, the original logic functions themselves are never "overwritten", as the references in the clones switch from pointing to a function in the prototype to a promise on its resolution as each property is lazily resolved on demand.

Here is a simple example:

```js
// First we define a prototype of the logic/facts, which can be a
// blend of constants and functions:

var Logic = {
  miles : function() {
    // simulating async (could be a db call, API request etc..)
    return Promise.delay(2000)
    .then(function() {
      return 2.3;
    });
  },
  mph : (miles,hours) => miles / hours
};

// Create a facts/logic object from the prototype
var obj = Object.create(Logic);

clues(obj,'mph')
  .then(console.log,console.log); // Rejected - hours not defined

// So we really new a new context when we have new information (different facts)
// How about a fresh clone?
var obj2 = Object.create(Logic);
obj2.hours = 3;

clues(obj2,'mph')
  .then(console.log,console.log);   // ok this works

// properties can also be defined directly in Object create
obj = Object.create(Logic,{
  hours : { value : 3 }
});
...

```
### handling rejection
Errors (i.e. rejected promises in `clues`) will include a `ref` property showing which logic function (by property name) is raising the error.  If the thrown error is not an object (i.e. a string), the resulting error will be a (generic) object with `message` showing the thrown message and `ref`, the name of the logic function.  If the erroring function was called by a named logic function, the name of that function will show up in the `caller` property of the response.  The rejection object will also contain `fullref`, a property that shows the full path of traversal (through arguments and dots) to the function that raised the error.  The rejection handling by `clues` will not force errors into formal Error Objects, which can be useful to distinguish between javascript errors (which are Error Objects with a defined `.stack` property) and customer 'string' error messages (which may not have `.stack`).  You can pass more information on the error by rejecting with an object with both `.message` and `.value` in it - `.value` can contain an object with whatever information you like in it.

Example: passing thrown string errors to the client while masking javascript error messages
```js
  .then(null,function(e) {
    if (e.stack) res.send(500,'Internal Error');
    else res.send(e.message);
  });
```

You can provide a function called `$logError` in the `$global` object to record any true javascript errors (with `.stack`) when they occur. The `$logError` function will be called with the error object as first argument and `fullref` as the second argument.  For proper logging it is important to capture the error at source, as the dependencies might be optional - in which case the error never reaches the original request.

### making arguments optional with the underscore prefix
If any argument to a function resolves as a rejected promise (i.e. errored) then the function will not run and will also be rejected.  But sometimes we want to continue nevertheless (example: user input that is optional).  Any argument to any function can be made optional by prefixing the argument name with an underscore.   If the resolution of the optional argument returns a rejected promise (or the optional argument does not exist), then the value of this argument to the function will simply be `undefined`.   

In the following example we include a property `badCall` that returns a rejection.  Adding underscores to any reference to `badCall` will make the dependency optional:

```js
var obj = {
  value : 42,
  badCall : function() { throw 'This is an error'; }
};

// Here the function never gets run as the input 'bad' is required.  Rejected.
clues(obj,function(badCall,value) { console.log(badCall,value); })
  .catch(console.log);

// Here the function prints "undefined 42". No rejection
clues(obj,function(_badCall,value) { console.log(_badCall,value); });

// Here the function prints " the error object in JSON  42"
clues(obj,function(__badCall,value) { console.log(JSON.stringify(__badCall),value); });
```
Please keep in mind that any variable that is referred to as optional in a function will look for the un-prefixed name in the logic object.  A fact can therefore be optional in one function (name prefixed with underscore) and required in another (no prefix).  

**Bonus**:  If an argument is prefixed with a double underscore, the value of the argument will not be `undefined`, but contain object representation of the error.  In this case you'd better check if `error === true` of any double-underscored argument to understand whether it's a value or an objectified error.  The double underscore allows you to roll your own quasi- `catch` inside a logic function to any of the input arguments.

**Caveat**: You should probably never define a property name that starts with an underscore.  The only way to reach that argument is to request it with three prefixed underscores (as the first two are shaved off by the optional machinery), and even then it doesn't really make sense.

### using special arrays to define functions
Users of Angular might be familiar with the array definition of function dependencies.  Clues accepts a similar construct with  functions defined in array form, where the function itself is placed in the last element and prior elements represent the full argument names required for the function to run.  This allows the definition of more complex arguments (including argument names with dots in them) and also allows for code minification (angular style)

In the following example, the local variable `a` stands for the `input1` fact and `b` is the `input2` fact

```js
var Logic = {
  test : ['input1','input2',function(a,b) {
    ... function body ...
  }]
};
```
Warning: Any array whose **last element** is a function, will be handled like an array-defined function, like it or not.   Additionally, if the **first element** of the array is an (i) object or a (ii) function, the first element will be used as the context (fact/logic object) the function executes in (see [private parts](#private-parts))

### nesting and parenthood
Logic object can contain objects (or functions that return objects) providing separate children scopes.  Trees of child scopes can be traversed using dot notation, either by requesting a string path directly from the `clues` function or using dot notation for argument names in any array-defined function (see [above](#using-special-arrays-to-define-functions)).   

Example:
```js
var Cabinet = {
  drawer : {
    items : ['A','B','C','D' ]
  },
  fourthItem : ['drawer.items.3',String]  // `String` is a native js function that converts the first argument to string
};

// Create a clone
var obj = Object.create(Cabinet);

// Prints A
clues(obj,'drawer.items.0')
  .then(console.log);             

// Prints B C
clues(obj,['drawer.items.1','drawer.items.2',function(a,b) {
  console.log(a,b);
}]);

// Prints D
clues(obj,function(fourthItem) {
  console.log(fourthItem);
});
```
It is worth noting that children do not inherit anything from parents.   If you really want your children to listen to their parents (or their cousins) you have to get creative, passing variables down explicitly or providing a root reference in the globals (see [appendix](#moar-stuff-a-listening-to-your-parents)).   

### ᐅ as an alias for a dot
Clues provides an alias for dots (ᐅ - unicode U+1405) in nested paths.  Using this alias, nested arguments can be defined directly in the function signature.  The downside to this approach is that argument names can become more cumbersome.

Here is the second example using the alias

```js
clues(obj,function(drawerᐅitemsᐅ1,drawerᐅitemsᐅ2) {
  console.log(drawerᐅitemsᐅ1,drawerᐅitemsᐅ2);
});
```

### complex nesting? no problem!
In the previous example all the values of the nested tree were already determined.  But `clues` makes no distinction between resolved structures and unresolved when traversing down the tree. It crunches through any functions and promises along the way,  without mercy. 

The following logic supports the same outcomes as the previous example:

```js
function obj() {
  return {
    drawer : function() {
      return Promise.delay(2000)
        .then(function() {
          return {
            items : [
              'A','B','C',Promise.delay(1000).then(function() { return 'D';})
            ]
          };
        });
    },
    fourthItem : ['drawer.items.3',String]
  };
}
```
Keep in mind that since the provided logic in this example is a function (creating an object), a new (fresh) object is generated each time clues is called.


### global variables
The third parameter to the `clues` function is an optional global object, whose properties are accessible in any scope (as a fallback if a property name is not found in current object).  This makes it particularly easy to provide services or general inputs (from the user) without having to 'drag those properties manually' through the tree to ensure they exist in each scope where they are needed.

The following example requires `input` object to be defined in `$global`:

```js
var Logic = {
  repeat : ['input.verb',function(verb) { return 'I am '+verb; }],
  parent : {
    child : {
      activity : ['input.childVerb',function(verb) {return 'Child is '+verb; }]
    }
 }
};

var obj = Object.create(Logic);

clues(obj,'repeat',{input:{verb:'coding'}})
  .then(console.log) ; // Prints "I am coding"

clues(obj,'parent.child.activity',{input:{childVerb:'sleeping'}})
  .then(console.log); // Prints "Child is sleeping"
```
A bit of care is required if the same logic/facts object (not fresh new clone) is used to answer questions with different globals each time.  As any function that uses a global value will be converted to a promise, a subsequent request for the same property and a different global variable will still result in the original answer.   You need to determine when you need a new clone (i.e. new context) and when you can remain within the original context.

### $ at your service
Any function whose property name starts with a `$` will simply be resolved as the function itself, not the result of the function execution machine.  This is a great method to pass global functions into any scope (as they won't be morphed into a promise on their value).

```js
var Global = {
  $emit : function(d) {
    console.log('emitting ',d);
  }
};

var Cabinet = {
  drawer : {
    open : function($emit) {
      $emit('opened drawer');
      return 'ok';
    },
    close : function($emit) {
      $emit('closed drawer');
      return 'ok';
    }
  }
};

var obj = Object.create(Cabinet);
clues(obj,['drawer.open','drawer.close',Object],Global);
```

It is worth noting that this functionality only applies to functions.  If an object has a $ prefix, then any functions inside that object will be crunched by `clues` as usual.  

If you would like to have a service method that is partially fed by the rest of the `facts`, you can name your function `$prep`.  If you want to make a `$prep` for your service, you must eventually return a `$service` method.  For example:

```js
var Cabinet = {
  
  something: () => 5,
  complicated: () => 6,

  $adder: function $prep(something, complicated) {
    let work = something + complicated;
    return function $service(number) {
      return work * number;
    }
  }
};
```

You can also define a function as a `$prep` function by including an argument name `$prep`, which in a class definition would be something like this:
```js
class Cabinet {
  something() {
    return 5;
  }

  complicated() {
    return 6
  }

  $adder ($prep, something, complicated) {
    let work = something + complicated;
    return function $service(number) {
      return work * number;
    }
  }
}
```

### $property - lazily create children by missing reference
If a particular property can not be found in a given object, clues will try to locate a `$property` function.  If that function exists, it is executed with the missing property name as the first argument and the missing value is set to be the function outcome.

```js
obj = {
  users : {
    all : function() {
      return db.collection('users.all')
        .find({},{user_id:true});
    },
    $property : function(ref) {
      return db.collection('users')
        .find({user_id:ref})
        .then(function(user) {
          if (!user) throw 'USER_NOT_FOUND';
          else return user;
        })
    }
  }
};

clues(obj,'users').then(console.log)  // lets say we get [1,3,5];

clues(obj,'user.3.name')
  .then(console.log)  // would print the property 'name' for user 3
```
 After 'user3.name' has been resolved, the `obj` has three properties: 
```js
 {
   users : [resolved promise on the list of users],
   $property : [function],
   3 : [resolved promise on the database record for userid 3]
 }
```

Another example of the memoization with `$property` is a simple Fibonacci solver:
```js
var fib = {
  0: 0,
  1: 1,
  $property : function(n) {
    return [''+(n-1),''+(n-2),function(a,b) {
      return a+b;
    }];
  }
};

clues(fib,['12','14','25','1000',Array])
  .then(console.log)
```

###### Shorthand for `$property`
Naming a function as `$property` (i.e. setting `Function.name`) acts as a shorthand for creating an empty object with the `$property` defined as the supplied function. The Fibonacci example could be rewritten as follows:

```js
var fib = function $property(n) {
  if(n<=1) return +n;
  return [''+(n-1),''+(n-2),function(a,b) {
    return a+b;
  }];
};

clues(fib,['12','14','25','1000',Array])
  .then(console.log);
```

Another way to create this shortcut is to have a function where only argument name is `$property`

```js
var fib = $property => ($property <= 1) ? +$property : [''+($property-1),''+($property-2), (a,b) => a+b];
```


### $external property for undefined paths
If an undefined property can not locate a `$property` function it will look for an `$external` function.   The purpose of the `$external` function is similar except that the argument passed to the function will be the full remaining reference (in dot notation), not just the next reference in the chain.

Here is an example of how the clues tree can be seamlessly extended to an external api using the `$external` property: 
```js
var request = Promise.promisifyall(require('request'));

var Logic = {
  myinfo : ['externalApi.user.info',Object],
  externalApi : function(userid) {
    return {
      $external : function(ref) {
        ref = ref.replace(/\./g,'/');
        return request.getAsync({
          url : 'http://api.vendor.com/api/'+ref,
          json : {user_id : userid}
        });
      }
    };
  }
};

var obj = Object.create(Logic,{userid:{value:'admin'}});

// This clues command sends off an http request to
// http://api.vendor.com/api/user/info with {"user_id" : "admin"} as the body
// and resolves 'externalApi['user.info']' and 'myinfo' with the results
clues(obj,['myinfo',console.log))

```

###### Shorthand for `$external`
Naming a function as `$external` (i.e. setting `Function.name`) acts as a shorthand for creating an empty object with the `$external` defined as the supplied function.  The `externalApi` function in the previous example could be written as follows:

```js
...
   externalApi : function(userid) {
     return function $external(ref) {
      return request.getAsync({
        url : 'http://api.vendor.com/api/'+ref.replace(/\./g,'/'),
        json : {user_id : userid}
      }); 
 ....
```

A function with a sole argument of `$external` will behave the same:

```js
...
   externalApi : userid => $external => request.getAsync({
    url: 'http://api.vendor.com/api/'+$external.replace(/\./g,'/').
    json: {user_id: userid}
  });
```


### function that returns a function that returns a...
If the resolved value of any function is itself a function, that returned function will also be resolved (within the same scope).  This allows for very powerful 'gateways' that constrains the tree traversal only to segments that are relevant for a particular solutions.
```js
Logic = {
  tree_a : {....},
  tree_b : {....},
  next_step: step => (step === 'a') ? ['tree_a',Object] : ['tree_b',Object]
}

clues(Logic,'next_step',{step:'a'})
```
### private parts
#### access control
Access to certain sub-trees of a fact/logic can be controlled through closures that evaluate user privileges before handing over the privileged parts.  

Example, assuming a global object `res` that has a `user` record that defines whether a user has admin privileges  or not:

```js
var User = {
  info : function(userid) {.....},
  changePassword : [input.password,input.confirm,function() {.....},
  admin : ['req.user.admin',function(admin) {
    if (!admin) throw 'NO_ACCESS';
    return {
      delete : function() {...},
      logs : function () {...}
    }
```
Unauthorized users will get an error if they try to query any of the admin functions, while admins have unlimited access.

#### using first element to define private scope
But what if we want to hide certain parts of the tree from direct traversal, but still be able to use those hidden parts for logic?   Array defined functions can be used to form gateways from one tree into a subtree of another.  If the first element of an array-defined function is an object (and not an array) or a function, that object provides a separate scope the function will be evaluated in.  The function can therefore act as a selector from this private scope.

Public/private Example:
```js
var PrivateLogic  = {
  secret : 'Hidden secret',

  hash : function(secret,password) {
    return crypto.createHash('sha1').update(secret).update(password).digest('hex');
  },

  public : function(userid,hash) {
    return db.find({user_id:user_id,password:hash})
      .then(function(d) {
        return {name:d.name,email:d.email};
      });
  }
};

var Logic = {
  user : function(_userid,_password) {
    var privateObj = Object.create(PrivateLogic);
    privateObj.userid = _userid;
    privateObj.password = _password;
    return [privateObj,'public',Object];
  }
};

var obj = Object.create(Logic,{
  userid : {value: 'user123'},
  password : {value: 'abc123'}
});

clues(obj,'user.name')
  .then(console.log,console.log);  // Prints  name
```

In this example `user.info` points to an instance of `PrivateLogic.public` without providing any access to the other properties or the private object, `secret` or `hash`.    It is worth noting that names of private properties might still be exposed under `fullref` of an error.  For example if password is not provided above, the fullref of the error will be `user.public.hash.password` with the message `password not defined`

The gateway function could have been with argument names inside or outside the function, even extra arguments.  What really matters is what the gateway function returns:
```js
return [privateObj,function(public) { return public;}];
return [privateObj,function(public,hash,secret) { return public;}];
return [privateObj,'public','hash',function(a,b) { return a;}];

```

Similarly, a private scope can be generated in-line using a function:
```js
{ answer: [function() { return { a : function(b) { return b+1;}, b:41};},'a',Number])}
```
where `answer.a` = 42, but `b` is unreachable

#### making anonymous functions private
An even easier way to declare functions as private is simply [naming](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) them `$private` (or `private`).  Any functions named `$private` will not be accessible directly, only indirectly through a different function, as an input argument.  Specifically the  `caller` has to be a defined value and not equal to `__user__`).  Any function or class function that has an argument `$private` will also be defined as private. Here is a quick example:

```js
var facts = {
  a : function $private() { return 2; },
  b : function($private, a) { return a + 1; },
  sum : function(a,b) { return a + b; }
};

clues(facts,'sum').then(console.log) // prints 5
clues(facts,'a').catch(console.log)  // prints error
clues(facts,'b').catch(console.log)  // prints error
```

### Cancellability
Each promise chain is cancellable when cancellation is turned on in the [Bluebird config](http://bluebirdjs.com/docs/api/promise.config.html).  Here is a pseudo example of how cancellation can be incorporated into an expensive database query:
```js
clues.Promise.config({cancellable: true});

logic.transactions = function(userid) {
  var connection = db.connect({host:...,});
  return new Promise(function(resolve,reject,onCancel) {
    connection.get({'userid':userid}, function(err,d) {
      if (err) return reject(err);
      else resolve(JSON.stringify(d));
    });

    onCancel && onCancel(function() {
      connection.close();
    })
  });
}
...
express()
  .get('/transactions/:userid',function(req,res) {
    var facts = Object.create(logic);
    facts.userid = req.param.userid;
    var transactions = clues(facts,'transactions')
      .then(res.end.bind(res));
    req.on('abort',function() { 
      transactions.cancel();
    });
```
### moar stuff A: listening to your parents

The dot notation only works downwards from current scope.  But what if you require variables from the parent scopes?   There are few ways to accomplish this.  One is to simply pass the required value through the functional scope of a peer or the required input:
```js
var Logic = {
  Charlie : ['Andy.mood',function(andyMood) {
    return {
      John : function() {
        return 'John knows Andy is '+andyMood;
      }
    };
  }],
  Andy : { mood: 'happy' }
};

clues(Object.create(Logic),'Charlie.John')
  .then(console.log);
```

Another way is to have the parent set property of the child to whatever should be passed down:
```js
var ChildLogic = {
  John : ['Andy.mood',function(andyMood) {
    return 'John knows Andy is '+andyMood;
  }]
};

var Logic = {
  Charlie : function(Andy) {
    return Object.create(ChildLogic, {Andy : {value: Andy}});
  },
  Andy : { mood : 'happy'}
};

clues(Object.create(Logic),'Charlie.John')
  .then(console.log);
```

Yet another example, is to define global variable `$root` pointing to the top parent, which allows us to navigate very easily from any child:
```js
var Logic = {
  Charlie : {
    John : ['$root.Andy.mood',function(d) {
      return 'John knows Andy is '+d;
    }]
  },
  Andy : { mood: 23 }
};

var facts = Object.create(Logic);

clues(facts,'Charlie.John',{$root:facts})
  .then(console.log);
```
The main reason why a `$root` is not set automatically by `clues` is that there is no real concept of a top-level object.  You can run `clues` on any subsection of a tree without knowing anything about possible parents (which could be multiple)

[npm-image]: https://img.shields.io/npm/v/clues.svg
[npm-url]: https://npmjs.org/package/clues
[circle-image]: https://circleci.com/gh/ZJONSSON/clues.png?style=shield
[circle-url]: https://circleci.com/gh/ZJONSSON/clues/tree/master
[downloads-image]: https://img.shields.io/npm/dm/clues.svg
[downloads-url]: https://npmjs.org/package/clues
[coverage-image]: https://3tjjj5abqi.execute-api.us-east-1.amazonaws.com/prod/clues/badge
[coverage-url]: https://3tjjj5abqi.execute-api.us-east-1.amazonaws.com/prod/clues/url
