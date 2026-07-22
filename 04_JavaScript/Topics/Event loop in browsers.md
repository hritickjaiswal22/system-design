Review my understanding of event loop from browser's pov

So JS in browser is single threaded only i.e. it can only execute code synchronously

But my making use of Event loop, microtask queue and macrotask queue it can carry out various operations async wise

What happens under the hood is 

```
console.log("1");

setTimeout(() => console.log("2"),0);

new Promise((resolve,reject) => {
	console.log("3");
	resolve(4);
}).then((val) => console.log(val))
```

Output -

1
3
4
2


Because 1 and 2 is processed synchronously while the callback of setTimeout was added to macrotask queue while the callback for promise resolve got added to microtask queue

And since priority of items in microtask queue > priority of items in macrotask queue

The callback events of microtask queue is executed first

And for to take callbacks from either queue to execute in call stack there is an **The event loop repeatedly runs an iteration. At appropriate checkpoints (such as after the current task finishes), it checks whether the call stack is empty, drains the microtask queue, and then picks the next macrotask**.


Further Reading - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a604750-e568-83e8-b4ac-b3a144d6d7e4

**JavaScript executes synchronously on a single call stack. When asynchronous operations such as timers, network requests, or DOM events are encountered, the work is delegated to browser APIs. Once an operation completes, its callback is placed into either the macrotask queue (e.g., `setTimeout`) or the microtask queue (e.g., Promise reactions). The event loop coordinates execution by waiting for the current task to finish, then draining all pending microtasks before taking the next macrotask. This prioritization ensures that Promise callbacks run before timer callbacks scheduled for the same turn of the event loop**.