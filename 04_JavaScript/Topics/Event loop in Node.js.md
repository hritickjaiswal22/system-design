JS in node.js runs synchronously on a single call stack. But for handling async tasks it delegates its operations to uvlib, task queue , microtask queue and event loop.

So whenever an async task is to be processed it gets delegated to uvlib library which uses one of the threads from it's thread pool and operates on it and once completed hands off the appropriate callback to either **task queue** or **microtask queue** 

Internally task queue has other queues (listed in priority)

1. timer queue for setTimeouts and setIntervals
2. i/o queue for handling file i/o
3. setImmediate queue for handling setImmediate callbacks
4. close queue for handling close events

And microtask queue has 2 queues (listed in priority)

1. nextTick queue 
2. promise queue for promise callbacks

microtask queue has higher priority than task queue

So callbacks gets pushed to appropriate queues and sub-queues

And the event loop coordinates with call stack to check when its empty and then according to priority picks callback from the queues and put it into the call stack for execution and repeats

![](https://remnote-user-data.s3.amazonaws.com/B8293HMk4TQczWX67rnv9jph_CNiadH-Gwbzcr_u8_a7TiRyVChQPy4o8MkXFeKEfke4b6Ryw-m3_srGrQgzuS4vN8yfrBjI88IjU3BXepZhiXt1VLEpY--OCL0F8_KE.png)
![](https://remnote-user-data.s3.amazonaws.com/T2AyzJekkhk72IV6z3WWiYJj7KD0lQx2e8424SZOcNut3S7f04bP-5H54wIid_xzJG6eFiuyhFsNcasGWXYxg8ERKghmto8LYHDY8dABWQvIRmVVSu5h79zH1j_-PcQ5.png)

https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a60521f-ca14-83ee-8603-8df066e56bf0