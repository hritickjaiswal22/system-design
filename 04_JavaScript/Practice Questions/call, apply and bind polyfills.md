```
Function.prototype.myCall = function (ctx, ...args) {

if (typeof this !== "function") {

throw new TypeError("myCall must be called on a function");

}

ctx = ctx == null ? globalThis : Object(ctx);

const fn = this;

const temp = Symbol();

  

ctx[temp] = fn;

  

try {

return ctx[temp](...args);

} finally {

delete ctx[temp];

}

};
```

```
Function.prototype.myApply = function (ctx, argsArr = []) {

if (typeof this !== "function") {

throw new TypeError("myApply must be called on a function");

}

ctx = ctx == null ? globalThis : Object(ctx);

const fn = this;

const temp = Symbol();

  

ctx[temp] = fn;

  

try {

return ctx[temp](...argsArr);

} finally {

delete ctx[temp];

}

};
```

```
Function.prototype.myBind = function (ctx, ...args1) {

if (typeof this !== "function") {

throw new TypeError("myBind must be called on a function");

}

ctx = ctx == null ? globalThis : Object(ctx);

const fn = this;

  

function boundFn(...args2) {

if (new.target) {

return fn.myCall(this, ...args1, ...args2);

} else {

return fn.myCall(ctx, ...args1, ...args2);

}

}

  

boundFn.prototype = Object.create(fn.prototype);

  

return boundFn;

};
```

