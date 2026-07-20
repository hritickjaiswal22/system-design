# `this` in JavaScript — Interview-Ready Model

==Before rules: **`this` is resolved by the call-site, not the definition-site** (arrow functions are the one exception — more below).== When you see `foo()` in an interview whiteboard, your first move is always: _"what's immediately to the left of the parentheses at the moment of invocation?"_

```
   obj.method()
   ^^^ ← this is what determines `this` inside method()
```

That single habit prevents 80% of `this`-bugs juniors write.

---

## 1. The Four Binding Rules — Precedence Order

```
┌─────────────────────────────────────────────┐
│  1. new binding        (new Foo())           │  ← highest priority
│  2. Explicit binding   (call/apply/bind)      │
│  3. Implicit binding   (obj.method())         │
│  4. Default binding    (foo())                │  ← lowest priority
└─────────────────────────────────────────────┘
```

### Rule 1 — Default Binding

Standalone invocation. No object, no `new`, no `call/apply/bind`.

```js
function whoAmI() {
  console.log(this);
}
whoAmI(); 
// non-strict: global object (window in browser, `global` in Node)
// strict mode / class body / ESM: undefined
```

**Node.js nuance interviewers like to probe:** at the _top level_ of a CommonJS file, `this` is not `global` — it's `module.exports`. In an ES module, top-level `this` is `undefined`. Different from browser `<script>` where top-level `this` is `window`. Know this cold if you mention Node experience.

### Rule 2 — Implicit Binding

Function called _as a property of an object_ — `this` = the object immediately left of the dot **at call time**.

```js
const user = {
  name: "Hritick",
  greet() { console.log(this.name); }
};
user.greet(); // "Hritick" — this = user
```

**The #1 interview trap — losing implicit binding:**

```js
const greetFn = user.greet;
greetFn(); // undefined (or throws in strict mode)
// Why: greetFn is now a bare reference. Call-site is `greetFn()`,
// no object to the left of the dot → default binding kicks in.
```

This is exactly the bug behind the classic pre-hooks React mistake:

```jsx
<button onClick={this.handleClick}>Click</button>
// You're passing a REFERENCE to handleClick, stripped of its `user`/`this` context.
// React calls it as handleClick(event) — plain call → default binding.
```

### Rule 3 — Explicit Binding (`call` / `apply` / `bind`)

```js
function greet() { console.log(this.name); }
const alice = { name: "Alice" };

greet.call(alice);        // this = alice, args passed individually
greet.apply(alice, []);   // this = alice, args passed as array
const bound = greet.bind(alice); // returns a NEW function, permanently bound
bound(); // "Alice" — no matter how you later call `bound`
```

**Hard-binding immunity (senior-level gotcha):** once you `bind`, you cannot re-bind.

```js
const bob = { name: "Bob" };
const reBound = bound.bind(bob);
reBound(); // still "Alice" — first bind wins permanently
```

### Rule 4 — `new` Binding

```js
function User(name) {
  this.name = name; // this = brand new object
}
const u = new User("Hritick");
```

`new` does 4 things under the hood: creates a new object → links its `[[Prototype]]` to the constructor's `.prototype` → sets `this` to that object inside the call → returns it implicitly (unless the constructor explicitly returns another object).

**The nuance that separates senior from mid-level answers:**

```js
function Foo(name) { this.name = name; }
const BoundFoo = Foo.bind({ fake: "context" });
const f = new BoundFoo("real");
console.log(f.name); // "real" — NOT { fake: "context" }
```

`new` overrides even a hard-bound `this`. `bind` still keeps its _partially applied arguments_, but the constructed object wins the `this` slot. This is a spec-level detail — dropping it in an interview signals you've gone past tutorials.

---

## 2. Arrow Functions — Lexical `this`

Arrow functions have **no `this` of their own.** They don't participate in any of the 4 rules above — they capture `this` from the enclosing _lexical_ scope at the point they're **defined**, permanently.

```js
const obj = {
  name: "Hritick",
  regular() {
    setTimeout(function () {
      console.log(this.name); // undefined — plain callback, default binding
    }, 100);
  },
  arrowFix() {
    setTimeout(() => {
      console.log(this.name); // "Hritick" — arrow inherits `this` from arrowFix()
    }, 100);
  }
};
```

Consequences you must be able to state out loud:

- `call`, `apply`, `bind` **cannot change** an arrow function's `this` (the `thisArg` is silently ignored).
- Arrow functions **cannot be used as constructors** — `new (() => {})()` throws `TypeError: not a constructor`.
- **Never use an arrow function as an object method** if you need dynamic `this`:

```js
const obj = {
  name: "X",
  greet: () => console.log(this.name) // BUG: `this` here is the module/global scope, not `obj`
};
```

This is a real trap — arrows _look_ concise but silently break implicit binding.

---

## 3. `this` in Class Methods

Class methods are **not auto-bound**, and class bodies are implicitly strict mode.

```js
class Counter {
  count = 0;

  increment() {
    this.count++;
  }
}

const c = new Counter();
const detached = c.increment;
detached(); // TypeError: Cannot read properties of undefined
// Same root cause as user.greet above — call-site lost the object.
```

Three fixes, know the tradeoffs of each (this is the kind of thing they'll push you on):

|Fix|How|Tradeoff|
|---|---|---|
|Bind in constructor|`this.increment = this.increment.bind(this)`|Extra work per instance, but method identity is stable (good for `React.memo`/`shouldComponentUpdate`)|
|Class field arrow function|`increment = () => { this.count++ }`|Clean, but creates a new function **per instance**, not on the prototype — memory cost at scale, breaks `instanceof`-style prototype method sharing|
|Inline arrow at call-site|`onClick={() => this.increment()}`|Creates a **new function every render** — breaks referential equality, defeats `React.memo`/`useCallback` downstream. This is a legit perf answer for Core Web Vitals / re-render discussions.|

Since you're targeting Core Web Vitals and rendering-optimization depth: this is exactly the kind of thing to connect explicitly in an interview — "class field arrows solve `this` but cost per-instance memory; inline arrows solve it but cost referential stability every render" is a staff-level sentence.

---

## 4. `this` in Event Handlers

**Vanilla DOM (`addEventListener`):**

```js
button.addEventListener("click", function () {
  console.log(this); // `this` = the button element
});
// The browser internally does: handler.call(button, event)
// → that's implicit binding, set by the DOM API itself.

button.addEventListener("click", () => {
  console.log(this); // lexical `this` — whatever enclosed the arrow, NOT the button
});
```

**React (JSX):** there's no magic — it's the same 4 rules applied to whatever function reference you hand to `onClick`.

- `onClick={this.handleClick}` → reference passed, invoked as plain call → `this` undefined (unless bound).
- `onClick={() => this.handleClick()}` → arrow wraps the call, `this` resolved lexically from the render method's `this`.
- **Functional components**: there is no instance `this` at all. Handlers are just closures over the component's local variables/state — a different mental model, not "this-binding" at all. If someone asks "how does `this` work in a functional component," the correct senior answer is _"it doesn't — there's no instance, closures replace it."_

---

## 5. `this` in Callbacks

**`setTimeout` / `setInterval`:**

```js
setTimeout(obj.greet, 100); // reference passed → this-loss → default binding
```

**Array methods** — most accept an optional `thisArg` as the _second_ argument, a fact people forget exists:

```js
[1,2,3].forEach(function (n) {
  console.log(this.multiplier * n);
}, { multiplier: 10 }); // thisArg — works because callback is NOT an arrow
```

Applies to `forEach`, `map`, `filter`, `some`, `every`, `find`, `findIndex`, `flatMap`. **Does not apply to `reduce`** — its second argument is `initialValue`, a common trick question.

**Promises:** `.then(obj.method)` has the exact same this-loss pattern as `setTimeout`. Same root cause every time — reference passed, call-site has no object.

---

## 6. Quick-Reference Table

|Invocation|`this` inside|
|---|---|
|`fn()`|global (non-strict) / `undefined` (strict)|
|`obj.fn()`|`obj`|
|`fn.call(ctx)` / `fn.apply(ctx)`|`ctx`|
|`const b = fn.bind(ctx); b()`|`ctx`, permanently|
|`new Fn()`|the newly constructed object|
|`new (fn.bind(ctx))()`|the new object — `bind`'s `this` is overridden|
|arrow function|lexical `this` from enclosing scope, unchangeable|
|DOM `addEventListener(fn)`|the element (browser calls it via `.call(element)`)|

---

## Quick-Fire — Predict the Output

No code execution, no hints yet. Reason through call-site each time and answer before I confirm:

```js
// 1
const obj = {
  name: "A",
  outer() {
    const inner = () => console.log(this.name);
    inner();
  }
};
obj.outer();

// 2
class Timer {
  seconds = 0;
  start() {
    setInterval(function () {
      this.seconds++;
      console.log(this.seconds);
    }, 1000);
  }
}
new Timer().start();

// 3
function Vehicle(type) { this.type = type; }
const makeCar = Vehicle.bind(null, "car");
const v = new makeCar();
console.log(v.type);
```

Give me your answers with the _reasoning_ (which rule wins and why) for each — not just the output. That's the format they'll actually push you on in a live loop.

This is actually one of the most misunderstood parts of `this`.

The **priority** is **not** something JavaScript checks one by one for every function call. Instead, it's a mental model for resolving situations where **multiple binding rules could seem to apply**.

Let's build it up.

---

# Case 1: Default binding

```js
function foo() {
  console.log(this);
}

foo();
```

How was `foo` invoked?

```
foo()
```

No object.  
No `call`.  
No `new`.

So only **default binding** applies.

---

# Case 2: Implicit binding

```js
const obj = {
  name: "Alice",
  foo() {
    console.log(this.name);
  }
};

obj.foo();
```

Invocation:

```
obj.foo()
```

Since the function is called as a property of `obj`,

```
this === obj
```

No ambiguity.

---

# Case 3: Explicit binding

```js
function foo() {
  console.log(this.name);
}

const obj = { name: "Alice" };

foo.call(obj);
```

Now there are two possibilities:

- Default binding (`foo()`)
    
- Explicit binding (`call(obj)`)
    

Which should win?

JavaScript chooses:

```
call() > default
```

Output:

```
Alice
```

---

# Here's where "priority" matters

Suppose someone says:

> "What if both default binding and explicit binding exist?"

Example:

```js
foo.call(obj);
```

Without a priority rule, which one should JavaScript use?

```
foo()

or

call(obj)
```

The language defines:

```
Explicit > Default
```

---

# Another example

```js
const obj = {
  name: "Alice",
};

function foo() {
  console.log(this.name);
}

obj.foo = foo;

obj.foo.call({ name: "Bob" });
```

Now we have

```
obj.foo()
```

which suggests

```
this = obj
```

BUT

```
.call({ name: "Bob" })
```

also wants to decide `this`.

Which wins?

The answer is

```
Explicit binding wins.
```

Output

```
Bob
```

So

```
Explicit > Implicit
```

---

# Highest priority: `new`

Now let's create the famous conflict.

```js
function Foo(name) {
  this.name = name;
}

const BoundFoo = Foo.bind({
  name: "Fake"
});

const person = new BoundFoo("Real");

console.log(person.name);
```

There are **two competing rules**.

### Rule 1

`bind()` says

```
this = { name: "Fake" }
```

### Rule 2

`new` says

```
Create a new object.

this = newly created object
```

Both cannot be true.

Which wins?

The language defines

```
new > bind
```

So

```
person.name

↓

"Real"
```

The fake object is ignored.

---

# Visualizing the conflicts

## Default vs Explicit

```
foo()

↓

Default binding

↓

foo.call(obj)

↓

Explicit binding

↓

Winner:
Explicit
```

---

## Implicit vs Explicit

```
obj.foo()

↓

Implicit

↓

obj.foo.call(otherObj)

↓

Explicit

↓

Winner:
Explicit
```

---

## Explicit vs new

```
Foo.bind(fakeObj)

↓

Hard-bound this

↓

new BoundFoo()

↓

new wants its own object

↓

Winner:
new
```

---

# So why memorize the order?

Because interview questions are often designed to create these conflicts.

For example:

```js
function foo() {
  console.log(this.name);
}

const obj1 = { name: "Alice" };
const obj2 = { name: "Bob" };

obj1.foo = foo;

obj1.foo.call(obj2);
```

You should immediately think:

```
Implicit

vs

Explicit

↓

Explicit wins
```

Output

```
Bob
```

---

Another:

```js
function Foo(name) {
  this.name = name;
}

const Bound = Foo.bind({});

const obj = new Bound("John");
```

You should immediately recognize:

```
Explicit (bind)

vs

new

↓

new wins
```

---

# A good mental model

Think of each invocation style as trying to "claim" the `this` value.

```
Default:
"I'll use the global object (or undefined)."

Implicit:
"No, use the object before the dot."

Explicit:
"No, use the object passed to call/apply/bind."

new:
"No, we're constructing a brand-new object. Use that."
```

If only one rule applies, there's no conflict.

If two rules compete, JavaScript has already decided the winner:

```
Default
    ↓
Implicit
    ↓
Explicit
    ↓
new
```

The higher rule overrides the lower one.

This is why the "priority" is useful—it's a quick way to reason about tricky interview questions where multiple binding mechanisms appear in the same call.