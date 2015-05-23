**clues.js** is a lean-mean-promisified-getter-machine that crunches through any javascript objects, including complex trees,  functions, values and promises.  Clues consists of a single getter function (just over 100 loc) that dynamically resolves dependency trees and memoizes resolutions (lets call them derived facts) along the way.   

*Prior versions of clues were based on internal scaffolding holding separate logic and fact spaces within a `clues` object.  Clues 3.x is a major rewrite into a simple  superpowered getter function.  Clues apis might be backwards compatible - as long as you merge logic and facts into a single facts/logic object and use the new getter function directly for any resolutions*

The basic function signature is simple and **always** returns a promise:
#### `clues(obj,fn,[$global])`
##### logic/facts (first argument)
The first argument of the clues function should be the object containing the logic/facts requested (or a function that delivers this object).    The logic/facts object is any Javascript object, containing any mix of the following properties (directly and/or through prototype chains):

* Static values (strings, numbers, booleans, etc)
* Functions (i.e. logic) returning anything else in this list 
* Promises returning anything else in this list
* Other javascript objects (child scopes)
* Functions returning a functions that returns anything in this list....
* ....etc

 
##### fn (second argument)
The second argument is a reference to the property/function requested, defined as any of the following:

* Name of the property to be resolved (or a path to the property, using dot notation)
* A custom function whose argument names will be resolved from the logic/facts prior to execution
* Array defined function (see below)

Here are a few examples:
```
clues(obj,'person').then(console.log);              // by name
clues(obj,function(person) { console.log(person); }) // by function
clues(obj,['person',console.log]);                  // by array defined function
```
##### global (optional third argument)
The third argument is an optional global object, whose properties are available from any scope.  The global object itself is handled as a logic/facts object and will be traversed as required.
`clues(obj,'person',{userid:'admin',res:res}).then(console.log);`

##### caller and fullref (internal)
As clues traverses an object by recursively calling itself each step of the way it passes information about `caller`,  i.e. which reference is requesting each property and `fullref` a dot delimited list of the traversed dependency path so far.

The full function signature (with the internal arguments)  is therefore:
`function clues(obj,fn,[$global],[caller],[fullref]) {...`

and here is an advanced example:
`clues(obj,'person',{userid:'admin',res:res},'__user__','top.child') `
### the mean function resolution machine
Whenever `clues` hits a property that is an unresolved function it will parse the argument names (if any) and attempt to resolve the argument values (from properties within same scope that have the same name as each argument).  Any property requested, either directly or indirectly, will be immediately morphed into a promise on its own resolution.   If any requested unresolved function requires other properties as inputs, those required properties will also be replaced with promises on their resolution etc..   Once all dependencies of any given function have been resolved, the function will be evaluated and the corresponding promise resolved (or rejected) by the outcome.   

```
var obj = {
  miles : 220,
  hours : Promise.fulfilled(2.3),  // we can also define as promise
  minutes : function(hours) {
    return hours * 60;
  },
  mph : function(miles,hours) {
    return miles / hours;
  }
};

// get mph directly
clues(obj,'mph').then(console.log);

// get multiple properties through a function call
clues(obj,function(minutes,mph) {
  console.log('Drove for '+minutes+' min at '+mph+' mph');
});
```
There are only a few restrictions and conventions you must into account when defining property names.

* Any property name starting with a $ bypasses the main function cruncher (great for services)
* `$property` and `$external` are special handlers for missing properties  (if they are functions)
* Property names really should never start with an underscore (see optional variables)
* Any array whose last element is a function will be evaluated as a function... Angular style

That's pretty much it.

### reusing logic through prototypes 
Since `clues` modifies any functional property from being a reference to the function to a reference to the promise of their outcome, a logic/facts object lazily transforms from containing mostly logic functions to containing resolved set of facts (in the form of resolved promises).

An entirely fresh logic/facts object is required for a different context (i.e. different set known initial facts).  A common pattern is to define all logic in a static object (as the prototype) and then only provide instances of this logic/facts object to the `clues` function, each time a new context is required.   This way, the original logic functions themselves are never "overwritten", as the references in the clones switch from pointing to a function in the prototype to a promise on its resolution as each property is lazily resolved on demand.

Here is a simple example:

```
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
  mph : function(miles,hours) {
    return miles / hours;
  }
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
Errors (i.e. rejected promises in `clues`) will include a `ref` property showing which logic function (by property name) is raising the error.  If the thrown error is not an object (i.e. a string), the resulting error will be a (generic) object with `message` showing the thrown message and `ref` the logic function.  If the erroring function was called by a named logic function, the name of that function will show up in the `caller` property of the response.  The rejection object will also contain `fullref` a property that shows the full path of traversal (through arguments and dots) to the function that raised the error.  The rejection handling by `clues` will not force errors into formal Error Objects, which can be useful to distinguish between javascript errors (which are Error Object with `.stack`) and customer 'string' error messages (which may not have `.stack`).

Example: passing thrown string errors to the client while masking javascript error messages
```
  .then(null,function(e) {
    if (e.stack) res.send(500,'Internal Error');
    else res.send(e.message);
  });
```

### making arguments optional with the underscore prefix
If any argument to a function resolves as a rejected promise (i.e. errored) then the function will not run and simply be rejected as well.  But sometimes we want to continue nevertheless.  Any argument to any function can be made optional by prefixing the argument name with an underscore.   If the resolution of the optional argument returns a rejected promise (or the optional argument does not exist), then the value of this argument to the function will simply be `undefined`.   
```
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
Functions can be defined in array form, where the function itself is placed in the last element, with the prior elements representing the full argument names required for the function to run.  This allows the definition of more complex arguments (including argument names with dots in them) and also allows for code minification (angular style)

In the following example, the local variable `a` stands for the `input1` fact and `b` is the `input2` fact

```
var Logic = {
  test : ['input1','input2',function(a,b) {
    ... function body ...
  }]
};
```
Warning: Any array whose last element is a function, will be handled like an array-defined function, like it or not. 

### nesting and parenthood
Logic object can contain objects (or functions that return objects) providing separate children scopes.  Trees of child scopes can be traversed using dot notation, either by requesting a string path directly from the `clues` function or using dot notation for argument names in any array-defined function (see above).   

Example:
```
var Cabinet = {
  drawer : {
    items : ['A','B','C','D' ]
  },
  fourthItem : ['drawer.items.3',String]
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
It is worth noting that children do not inherit anything from parents.   If you really want your children to listen to their parents (or their cousins) you have to get creative, passing variables down explicitly or providing a root reference in the globals (see appendix)

### complex nesting? no problem!
In the previous example all the values of the nested tree were already determined.  But `clues` makes no distinction between resolved structures and unresolved when traversing down the tree. It crunches through any functions and promises along the way,  without mercy. 

The following logic supports the same outcomes as the previous example:

```
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
The third parameter to the `clues` function is an optional global object, whose properties are accessible n any scope (as a fallback).  This makes it particularly easy to provide services or general inputs (from the user) without having to 'drag those properties manually' through the tree to ensure they exist in each scope where they are needed.

```
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

```
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


### $property - lazily create children by missing reference
If a particular property can not be found in a given object, clues will try to locate a `$property` function.  If that function exists, it is executed with the missing property name as the first argument and the missing value is set to be the function outcome.

```
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
```
 {
   users : [resolved promise on the list of users],
   $property : [function],
   3 : [resolved promise on the database record for userid 3]
 }
```

### $external property for undefined paths
If an undefined property can not locate a `$property` function it will look for an `$external` function.   The purpose of the `$external` function is similar except that the argument passed to the function will be the full remaining reference (in dot notation), not just the next reference in the chain.

Here is an example of how the clues tree can be seamlessly extended to an external api using the `$external` property: 
```
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
### function that returns a function that returns a...
If the resolved value of any function is itself a function, that returned function will also be resolved (within the same scope).  This allows for very powerful 'gateways' that constrains the tree traversal only to segments that are relevant for a particular solutions.
```
Logic = {
  tree_a : {....},
  tree_b : {....},
  next_step: function(step) {
    if (step === 'a')
      return ['tree_a',Object]
    else
      return ['tree_b',Object];
    }
  }
}

clues(Logic,'continue',{step:'a'})
```

### Cancellability
Each promise chain is cancellable, but the ability to cancel only reaches those logic functions that explicitly return cancellable promises. Any logic already resolved before a cancel is issued, will not be affected.  Here is a pseudo example of how such cancellation could be incorporated with an expensive database query:
```js
logic.transactions = function(userid) {
  var connection = db.connect({host:...,});
  return new Promise(function(resolve,reject) {
    connection.get({'userid':userid}, function(err,d) {
      if (err) return reject(err);
      else resolve(JSON.stringify(d));
    });
  })
  .cancellable()
  .catch(Promise.CancellationError,function() {
    connection.close();
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
```
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
```
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
```
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