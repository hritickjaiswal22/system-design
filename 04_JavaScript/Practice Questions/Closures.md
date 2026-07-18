```
let count = 0;

(function immediate() {

if (count === 0) {

let count = 1;

console.log(count); // What is logged?

}

console.log(count); // What is logged?

})();
```

You said Reference Error , 

**BUT**

> **There is a `count` declaration, but it is NOT in the function's lexical environment. It belongs to the block's lexical environment.**

This distinction is easy to miss.

Let's draw exactly what the engine sees.       

```
function immediate() {
  if (count === 0) {
    let count = 1;
    console.log(count);
  }

  console.log(count);
}
```

The function body is **not** one flat scope.

The engine effectively sees something like:

```
Function Scope
│
├── Statement: if (...)
│      │
│      └── Block Scope
│             │
│             └── let count
│
└── console.log(count)
```

Notice where `count` lives.

It is **inside the block**, not the function.

---

## During creation of the function execution context

When `immediate()` is called, the engine creates the **function lexical environment**.

It scans declarations **that belong to that environment**.

That environment contains:

```
function immediate() {
    // function-scoped declarations go here
}
```

There aren't any.

So:

```
Function Lexical Environment

Bindings:
    (none)
```

---

## Only when execution reaches

```
if (count === 0) {
```

and the condition is true, the engine **enters the block**.

At that moment it creates **another lexical environment**:

```
Block Lexical Environment

count -> TDZ
```

Then

```
let count = 1;
```

initializes it.


==**Note - Lexical Environments are not only created for functions but for blocks as well**==

Further Reading - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a5ae4c1-2e5c-83ee-b137-03361a002bbc