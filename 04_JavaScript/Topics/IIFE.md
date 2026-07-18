This is a **very common JavaScript interview topic**. For SDE1/SDE2 interviews, the important part is understanding **why IIFEs existed**, **why they're much less common today**, and **the few places where they're still useful**.

---

# What is an IIFE?

An **Immediately Invoked Function Expression** is a function that is:

1. Created
    
2. Executed immediately
    

```javascript
(function () {
    console.log("Hello");
})();
```

or

```javascript
(() => {
    console.log("Hello");
})();
```

Notice there is **no function name** that you call later.

---

# Why were IIFEs invented?

Before ES6, JavaScript only had

- global scope
    
- function scope
    

There was **no block scope**.

Example:

```javascript
for (var i = 0; i < 5; i++) {
    // ...
}

console.log(i); // 5
```

Everything declared with `var` leaked outside the block.

Developers needed a way to create a new scope.

---

## IIFE creates a new scope

```javascript
(function () {

    var secret = 42;

    console.log(secret);

})();

console.log(secret); // ReferenceError
```

Memory:

```
Global

    immediate() EC

        secret = 42
```

After the IIFE finishes,

```
Global
```

`secret` disappears because the execution context is destroyed.

---

# Primary Use #1 — Avoid polluting global scope

Without IIFE

```javascript
var counter = 0;
var cache = {};
var config = {};
```

Everything becomes global.

With IIFE

```javascript
(function () {

    var counter = 0;
    var cache = {};
    var config = {};

})();
```

Nothing leaks.

---

# Primary Use #2 — Encapsulation

You can expose only what you want.

```javascript
const Counter = (function () {

    let count = 0;

    return {
        increment() {
            count++;
        },

        getCount() {
            return count;
        }
    };

})();
```

Usage

```javascript
Counter.increment();

console.log(Counter.getCount());

console.log(Counter.count); // undefined
```

Here

```
count
```

is private.

This pattern is called the **Module Pattern**, and it relies on **closures**.

---

# Primary Use #3 — One-time initialization

Suppose you want some setup code to execute exactly once.

```javascript
const app = (function () {

    console.log("Initializing...");

    return {
        start() {
            console.log("Started");
        }
    };

})();
```

Output

```
Initializing...
```

Only once.

Later

```javascript
app.start();
app.start();
```

No more initialization.

---

# Primary Use #4 — Capture values (before `let`)

One of the classic interview questions.

Without IIFE

```javascript
for (var i = 0; i < 3; i++) {

    setTimeout(() => {
        console.log(i);
    }, 1000);

}
```

Output

```
3
3
3
```

Because every callback closes over the same `i`.

Old solution:

```javascript
for (var i = 0; i < 3; i++) {

    (function (j) {

        setTimeout(() => {
            console.log(j);
        }, 1000);

    })(i);

}
```

Output

```
0
1
2
```

Each IIFE creates a new scope with its own `j`.

Today we'd simply write:

```javascript
for (let i = 0; i < 3; i++) {

    setTimeout(() => {
        console.log(i);
    }, 1000);

}
```

because `let` creates a new binding for each iteration.

---

# Why the parentheses?

This is another favorite interview question.

This is **not allowed**:

```javascript
function () {

}();
```

because JavaScript expects a **function declaration**, and declarations require a name.

By wrapping it:

```javascript
(function () {

})();
```

the parser treats it as a **function expression**, and expressions can be invoked immediately.

---

# Do we still use IIFEs today?

**Far less often.**

ES6 introduced:

- `let`
    
- `const`
    
- block scope
    
- modules (`import`/`export`)
    

These features replaced most historical uses.

Instead of

```javascript
(function () {

    const config = {};

})();
```

you simply write

```javascript
{
    const config = {};
}
```

or place the code in its own module.

---

# Modern situations where IIFEs are still useful

### 1. One-time initialization with private state

```javascript
const logger = (() => {

    const logs = [];

    return {
        add(msg) {
            logs.push(msg);
        },

        get() {
            return [...logs];
        }
    };

})();
```

---

### 2. Executing setup code immediately

```javascript
(() => {

    initializeAnalytics();
    registerEvents();

})();
```

---

### 3. Isolating third-party scripts

If you're writing a script that will be included on arbitrary web pages:

```javascript
(() => {

    // avoids leaking variables globally

})();
```

This prevents accidental conflicts with the page's own JavaScript.

---

### 4. Creating an async context at the top level (when top-level `await` isn't available)

```javascript
(async () => {
    const data = await fetch("/api/data");
    console.log(await data.json());
})();
```

This pattern is still common in environments that don't support top-level `await`.

---

# Interview takeaway (SDE1/SDE2)

If asked **"Why do we use IIFEs?"**, a strong answer is:

> An IIFE (Immediately Invoked Function Expression) executes as soon as it's defined, creating its own function scope. Historically, it was used to avoid polluting the global namespace, encapsulate private variables using closures (the Module Pattern), perform one-time initialization, and work around the lack of block scope before ES6. Today, `let`, `const`, ES modules, and top-level `await` have replaced most of its use cases, though IIFEs are still useful for isolated initialization code and creating an async context where top-level `await` isn't available.

That answer demonstrates both historical context and modern JavaScript understanding, which is what interviewers typically look for.