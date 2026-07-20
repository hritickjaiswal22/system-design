# JavaScript Interview Revision Checklist — SDE1/SDE2 (16+ LPA bar)

★ = high-frequency at target orgs (esp. machine coding rounds)

## 1. Execution Model

- [x] Execution context — creation vs execution phase
- [x] Call stack
- [x] Lexical scoping + scope chain
- [x] Hoisting — var / let / const / function / class differences
- [x] Temporal Dead Zone (TDZ)
- [x] ★ Closures — practical: memoization, private state, module pattern, once()
- [x] IIFE — why, when

## 2. `this` Binding

- [x] Default / implicit / explicit / new binding
- [x] Arrow function `this` (lexical, no own binding)
- [x] ★ call / apply / bind — implement from scratch
- [x] `this` inside class methods, event handlers, callbacks

Practice Thread - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a5d94fe-b63c-83e8-af9b-67f98ee71d87

## 3. Prototypes & OOP

- [ ] Prototype chain, `__proto__` vs `.prototype`
- [ ] Object.create
- [ ] Class syntax as sugar over prototypes
- [ ] Prototypal inheritance patterns
- [ ] Object.freeze / seal / isFrozen
- [ ] Getters/setters, computed properties
- [ ] instanceof mechanics

## 4. Async JavaScript

- [ ] ★ Event loop — call stack, Web APIs, microtask queue, macrotask queue
- [ ] ★ Microtask vs macrotask ordering (Promise.then vs setTimeout vs queueMicrotask)
- [ ] Promise states, chaining, error propagation
- [ ] ★ Promise.all vs allSettled vs race vs any — behavior on rejection
- [ ] ★ Implement Promise (basic) / Promise.all from scratch
- [ ] async/await — try/catch semantics, sequential vs parallel awaits
- [ ] Callback hell → Promise → async/await evolution
- [ ] ★ Debounce vs throttle — implement both, know when to use which

## 5. Functions

- [ ] Higher-order functions
- [ ] ★ Currying — implement, partial application
- [ ] Function composition (pipe/compose)
- [ ] Pure functions, side effects
- [ ] Arrow vs regular function — this, arguments, hoisting, constructor use
- [ ] Default / rest / spread params
- [ ] `arguments` object vs rest params

## 6. Objects & Arrays

- [ ] ★ Deep copy vs shallow copy — structuredClone, JSON methods, custom recursive
- [ ] Destructuring — nested, default values, renaming
- [ ] ★ Polyfills: map, filter, reduce, forEach
- [ ] flat / flatMap
- [ ] Object.keys/values/entries, Object.assign
- [ ] Optional chaining (?.) and nullish coalescing (??)
- [ ] Array-like objects vs real arrays (arguments, NodeList)

## 7. Types & Coercion

- [ ] Primitive vs reference types, pass-by-value vs pass-by-reference(-ish)
- [ ] ★ == vs === and coercion rules (know the abstract equality table cold)
- [ ] typeof vs instanceof vs Object.prototype.toString.call
- [ ] NaN quirks, isNaN vs Number.isNaN
- [ ] Truthy/falsy list (0, '', null, undefined, NaN, false)

## 8. ES6+ Language Features

- [ ] let/const/var — scoping, redeclaration, TDZ
- [ ] Template literals, tagged templates
- [ ] Modules — ESM vs CommonJS, named vs default export, tree-shaking implication
- [ ] Map/Set/WeakMap/WeakSet — when over plain objects
- [ ] Generators & iterators — iterator protocol, `function*`, `yield`
- [ ] Proxy & Reflect — basic use case (e.g. validation, reactivity)
- [ ] Symbol — use case (well-known symbols, avoiding key collision)

## 9. Memory & Performance

- [ ] Garbage collection — mark and sweep, reference counting limitation
- [ ] ★ Common memory leak sources: detached DOM nodes, forgotten timers/listeners, closures holding large scope
- [ ] Event delegation — why, how

## 10. Browser/Runtime-Adjacent (often in same round)

- [ ] Event loop specifics recap (see #4)
- [ ] setTimeout(fn, 0) actual behavior
- [ ] localStorage vs sessionStorage vs cookies — size, expiry, sent-with-request
- [ ] fetch + AbortController (cancellation)

## 11. Error Handling

- [ ] try/catch/finally semantics
- [ ] Custom errors — extending Error class
- [ ] Async error handling — unhandled promise rejection

## 12. ★ Machine Coding Staples (implement cold, no lookup)

https://www.greatfrontend.com/blog/10-must-know-javascript-coding-interview-questions

- [ ] debounce / throttle
- [ ] deep clone
- [ ] curry(fn)
- [ ] call / apply / bind polyfills
- [ ] Array.prototype.map/filter/reduce polyfills
- [ ] Promise.all / Promise.race polyfills
- [ ] simple EventEmitter (on/off/emit)
- [ ] memoize(fn)
- [ ] flatten(arr, depth)

---

**Self-check protocol:** for each ticked topic, you should be able to (1) explain the mechanism without notes, (2) write the polyfill/implementation live, (3) name one common bug/edge case an interviewer would probe. If any of the three fails, it's not actually revised — it's recognized.