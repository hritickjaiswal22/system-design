# What question does `instanceof` answer?

Given

```
const dog = new Chihuahua();
```

when we write

```
dog instanceof Chihuahua
```

JavaScript asks:

> **"Does this object's prototype chain contain `Chihuahua.prototype`?"**

That's it.

Not:

- ❌ Was it created by this constructor?
- ❌ Does it have the same properties?
- ❌ Does its constructor property equal Chihuahua?

Only this:

> **Is `Chihuahua.prototype` somewhere in the object's prototype chain?**

So basically 

obj instanceof fn

function myInstanceof(obj, fn) {
let ref = Object.getPrototypeOf(obj)

while(ref) {
if(ref === fn.prototype) return true;
ref = Object.getPrototypeOf(ref)
}

return false
}

refined poyfill implementation is 

```
function myInstanceof(obj, fn) {
  if (typeof fn !== "function") {
    throw new TypeError("Right-hand side of instanceof is not callable");
  }

  if (obj == null || (typeof obj !== "object" && typeof obj !== "function")) {
    return false;
  }

  let ref = Object.getPrototypeOf(obj);

  while (ref !== null) {
    if (ref === fn.prototype) {
      return true;
    }

    ref = Object.getPrototypeOf(ref);
  }

  return false;
}
```


Reference - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a6034b3-e464-83ee-8819-815540eee22b