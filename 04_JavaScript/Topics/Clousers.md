A **closure** is the combination of a **==function bundled together (enclosed) with references to its surrounding state (the lexical environment)==**. In other words, a closure gives a function access to its outer scope. **In JavaScript, closures are created every time a function is created, at function creation time**.

```
function makeFunc() {
  const name = "Mozilla";
  function displayName() {
    console.log(name);
  }
  return displayName;
}

const myFunc = makeFunc();
myFunc();
```

This works.
The reason is that functions in JavaScript form closures.
In this case, `myFunc` is a reference to the instance of the function `displayName` that is created when `makeFunc` is run. The instance of `displayName` maintains a reference to its lexical environment, within which the variable `name` exists. For this reason, when `myFunc` is invoked, the variable `name` remains available for use, and "Mozilla" is passed to `console.log`.

# Real Uses of Closures

## 1. Data Privacy

```
function createBankAccount() {

    let balance = 0;

    return {

        deposit(amount) {
            balance += amount;
        },

        getBalance() {
            return balance;
        }
    };
}

const account = createBankAccount();

account.deposit(100);

console.log(account.getBalance());
```

Cannot access

```
account.balance
```

because

```
balance
```

is private.

---

## 2. Function Factories

```
function multiply(x) {

    return function(y) {
        return x * y;
    };
}

const double = multiply(2);
const triple = multiply(3);

double(5);
triple(5);
```

Produces

```
10
15
```

Each returned function remembers its own `x`.

---

## 3. Memoization

```
function memoizedSquare() {

    const cache = {};

    return function(n) {

        if (cache[n]) return cache[n];

        cache[n] = n * n;

        return cache[n];
    };
}
```

The cache survives because of the closure.

---

## 4. React Hooks

When you write

```
const handleClick = () => {
    console.log(count);
};
```

`handleClick` closes over `count`.

Understanding closures explains issues like **stale closures** in React.

---

## 5. Event Listeners

```
button.addEventListener("click", () => {
    console.log(userId);
});
```

The callback remembers `userId` long after the outer function has returned.

---

## 6. Timers

```
setTimeout(() => {
    console.log(message);
}, 1000);
```

The callback remembers `message` after the surrounding code has finished executing.

# [Creating closures in loops: A common mistake](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#creating_closures_in_loops_a_common_mistake)

```
function showHelp(help) {
  document.getElementById("help").textContent = help;
}

function setupHelp() {
  var helpText = [
    { id: "email", help: "Your email address" },
    { id: "name", help: "Your full name" },
    { id: "age", help: "Your age (you must be over 16)" },
  ];

  for (var i = 0; i < helpText.length; i++) {
    // Culprit is the use of `var` on this line
    var item = helpText[i];
    document.getElementById(item.id).onfocus = function () {
      showHelp(item.help);
    };
  }
}

setupHelp();
```

==If you try this code out, you'll see that it doesn't work as expected. No matter what field you focus on, the message about your age will be displayed.==

The reason for this is that **the functions assigned to `onfocus` form closures**; they consist of the function definition and the captured environment from the `setupHelp` function's scope. Three closures have been created by the loop, but each one shares the same single lexical environment, which has a variable with changing values (`item`). **==This is because the variable `item` is declared with `var` and thus has function scope due to hoisting. The value of `item.help` is determined when the `onfocus` callbacks are executed. Because the loop has already run its course by that time, the `item` variable object (shared by all three closures) has been left pointing to the last entry in the `helpText` list.==**

# I'd phrase it like this in an interview

> A closure is a function together with its lexical environment. Every function stores a hidden reference to the environment where it was created. If that function outlives its outer scope—for example by being returned or registered as a callback—the lexical environment is kept alive by the garbage collector. This allows the function to continue accessing variables from its outer scope even after the outer function has finished executing.

Further Reading - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a5ad7f8-052c-83ee-ae84-bc46bef2061b