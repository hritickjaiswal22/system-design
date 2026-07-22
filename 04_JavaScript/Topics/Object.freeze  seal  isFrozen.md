# 1. `Object.freeze()`

Makes an object **immutable at the top level**.

It prevents:

- Adding new properties
    
- Deleting properties
    
- Changing existing property values
    
- Changing property descriptors (writable/configurable)
    

```js
const user = {
  name: "John",
  age: 20
};

Object.freeze(user);

user.age = 30;        // ignored (or TypeError in strict mode)
user.city = "Delhi";  // ignored
delete user.name;     // ignored

console.log(user);
// { name: "John", age: 20 }
```

---

## Under the hood

Freeze is roughly equivalent to making every property

```text
writable: false
configurable: false
```

and preventing extensions.

Conceptually:

```text
Object.freeze(obj)

↓

Object.preventExtensions(obj)

↓

For every property:
    writable = false
    configurable = false
```

---

## Important Interview Point

Freeze is **shallow**, not deep.

```js
const obj = {
    user: {
        name: "John"
    }
};

Object.freeze(obj);

obj.user.name = "Bob";

console.log(obj.user.name);
// Bob
```

Only the first object is frozen.

The nested object is still mutable.

---

# 2. `Object.seal()`

Seal is less restrictive.

It prevents

- adding properties
    
- deleting properties
    

But existing properties can still change.

```js
const user = {
    name: "John",
    age: 20
};

Object.seal(user);

user.age = 30;

console.log(user.age);
// 30

user.city = "Delhi";   // ignored

delete user.name;      // ignored
```

---

## Under the hood

Seal roughly does

```text
Object.preventExtensions()

↓

For every property

configurable = false

writable remains unchanged
```

So

```js
const obj = {
    a: 10
};

Object.seal(obj);

obj.a = 50;

console.log(obj.a);
// 50
```

works.

---

# 3. `Object.preventExtensions()`

Often asked together.

Only prevents

- adding new properties
    

Everything else still works.

```js
const obj = {
    a: 1
};

Object.preventExtensions(obj);

obj.a = 100;      // works

delete obj.a;     // works

obj.b = 2;        // fails
```

---

# Comparison

|Operation|Prevent Extensions|Seal|Freeze|
|---|---|---|---|
|Add property|❌|❌|❌|
|Delete property|✅|❌|❌|
|Modify value|✅|✅|❌|
|Reconfigure property|✅|❌|❌|

---

# 4. `Object.isFrozen()`

Checks whether an object is frozen.

```js
const obj = {
    a: 1
};

console.log(Object.isFrozen(obj));
// false

Object.freeze(obj);

console.log(Object.isFrozen(obj));
// true
```

---

Likewise,

```js
Object.isSealed(obj)

Object.isExtensible(obj)
```

also exist.

---

# Common Interview Trap

```js
const obj = {
    user: {
        name: "John"
    }
};

Object.freeze(obj);

console.log(Object.isFrozen(obj));
// true

console.log(Object.isFrozen(obj.user));
// false
```

People often assume freeze is recursive.

It isn't.

---

# Follow-up Interview Question: "How would you deeply freeze an object?"

Typical answer:

```js
function deepFreeze(obj) {
    Object.freeze(obj);

    for (const key of Object.keys(obj)) {
        const value = obj[key];

        if (
            value !== null &&
            typeof value === "object" &&
            !Object.isFrozen(value)
        ) {
            deepFreeze(value);
        }
    }

    return obj;
}
```

This recursively freezes nested objects.

---

# Interview Takeaway

Think of them as increasing levels of restriction:

```text
Object.preventExtensions()
        ↓
Only prevent new properties

Object.seal()
        ↓
Prevent new properties
Prevent deletion

Object.freeze()
        ↓
Prevent new properties
Prevent deletion
Prevent modification
```

A strong interview answer also mentions that **all three operate only on the object's own properties and are shallow**—nested objects remain mutable unless you explicitly recurse (deep freeze).

Great question. **No. Changing a value and reconfiguring a property are different things.** This distinction comes down to **property descriptors** in JavaScript.

Every property has descriptors like:

```js
{
  value: 10,
  writable: true,
  enumerable: true,
  configurable: true
}
```

Let's focus on the important two:

- **`writable`** → Can the property's value be changed?
    
- **`configurable`** → Can the property's metadata (descriptor) be changed, or can the property be deleted?
    

---

## Changing the value (`writable`)

```js
const obj = {
  a: 10
};

obj.a = 20;

console.log(obj.a); // 20
```

Here you're only changing the **value**.

---

## Reconfiguring the property (`configurable`)

This means changing the property's **descriptor**, not its value.

For example:

```js
const obj = {
  a: 10
};

Object.defineProperty(obj, "a", {
  writable: false
});
```

Now:

```js
obj.a = 50;

console.log(obj.a); // 10
```

Notice we never changed the value directly.

We changed **how the property behaves**.

---

Another example:

```js
Object.defineProperty(obj, "a", {
    enumerable: false
});
```

Now

```js
console.log(Object.keys(obj));
```

returns

```js
[]
```

The property still exists.

Its **configuration** changed.

---

## Another example

Deleting a property also depends on `configurable`.

```js
const obj = {};

Object.defineProperty(obj, "a", {
    value: 10,
    configurable: false
});

delete obj.a;

console.log(obj.a);
// 10
```

Deletion fails because the property isn't configurable.

---

# Why `Object.seal()` and `Object.freeze()` mention "reconfiguration"

Recall:

```text
Seal
↓

configurable = false
```

So after sealing:

```js
const obj = {
    a: 10
};

Object.seal(obj);

Object.defineProperty(obj, "a", {
    enumerable: false
});
```

❌ Throws because you're trying to **reconfigure** the property.

However,

```js
obj.a = 20;
```

✅ Works because `writable` is still `true`.

---

Now compare with `freeze`.

```text
Freeze
↓

configurable = false
writable = false
```

So

```js
obj.a = 20;
```

❌ Fails (`writable = false`)

and

```js
Object.defineProperty(obj, "a", {
    enumerable: false
});
```

❌ Also fails (`configurable = false`)

---

## Interview takeaway

A concise answer would be:

> **Changing a property value** means updating its `value` (controlled by the `writable` descriptor).  
> **Reconfiguring a property** means changing its descriptors—such as `writable`, `enumerable`, or `configurable` itself—or deleting the property (controlled by the `configurable` descriptor).

This is why **`Object.seal()` still allows changing property values but forbids changing property descriptors**, whereas **`Object.freeze()` forbids both**.