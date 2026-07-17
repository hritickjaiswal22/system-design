
![[Pasted image 20260714104018.png]]

But many requests or processing require large amount of computations or time and blocking the request for that period is wasteful.
![[Pasted image 20260714104237.png]]
![[Pasted image 20260714104501.png]]
![[Pasted image 20260714104624.png]]


![[Pasted image 20260714105212.png]]
![[Pasted image 20260714105842.png]]
![[Pasted image 20260714105902.png]]
![[Pasted image 20260714105944.png]]
![[Pasted image 20260714110020.png]]


The real distinction is **how messages are stored and consumed**.

|Feature|Message Queue|Message Stream|
|---|---|---|
|Message lifetime|Usually removed after being consumed|Retained for a configurable period or size limit|
|Consumers|Typically one consumer processes each message|Many independent consumer groups can each process every message|
|Replay old messages|Usually no|Yes|
|Ordering|Often per queue|Usually preserved per partition|
|Primary use|Task distribution / work queues|Event logs, analytics, event sourcing, streaming|

### Message Queue

Think of it as a **to-do list**.

```
Producer
    |
    v
+----------------+
| Task 1         |
| Task 2         |
| Task 3         |
+----------------+
    |
 Consumer A
```

Consumer A reads **Task 1**.

The queue removes it (after acknowledgement).

No one else can process that same task.

Goal:

> "Make sure this job gets done exactly once (or at least once)."

Examples:

- Sending emails
    
- Image processing
    
- Background jobs
    
- Order fulfillment
    

---

### Message Stream

Think of it as an **append-only log**.

```
Offset

0  UserCreated
1  UserUpdated
2  OrderPlaced
3  PaymentSuccess
4  RefundIssued
```

Messages stay in the log.

Consumers only keep track of

> "Which offset have I already read?"

Consumer Group A

```
Read up to offset 3
```

Consumer Group B

```
Read up to offset 1
```

Consumer Group C

```
Starts today
Reads from offset 0
```

Nobody deletes the events.

Each consumer group has its own progress.

---

### Why Kafka is a Stream

Suppose an order is placed.

```
OrderPlaced
```

Who needs this?

- Inventory Service
    
- Analytics Service
    
- Recommendation Engine
    
- Fraud Detection
    
- Notification Service
    

Every one of them needs the **same event**.

If this were a queue,

```
Inventory consumes it

Message disappears
```

Analytics never sees it.

With Kafka,

```
Inventory Group      -> reads it
Analytics Group      -> reads it
Fraud Group          -> reads it
Notification Group   -> reads it
```

Everyone gets the same event independently.

---

### So is "multiple consumer groups" the difference?

It's a **major capability**, but it comes from the deeper design.

Because Kafka stores events instead of deleting them after they're read, multiple consumer groups can each maintain their own offsets and read the same data independently.

If Kafka deleted a message immediately after one consumer read it, multiple consumer groups wouldn't be possible.

So the causal relationship is:

```
Persistent append-only log
        ↓
Messages are retained
        ↓
Consumers track offsets
        ↓
Multiple consumer groups become possible
        ↓
Replay is possible
        ↓
Time-travel/debugging/event sourcing become possible
```

### Interview takeaway

A concise way to explain it is:

- **Message Queue:** Messages are distributed as work. Once processed and acknowledged, they're typically removed. Each message is intended to be handled by one consumer.
    
- **Message Stream:** Messages are appended to a durable log and retained. Consumers maintain their own offsets, allowing multiple independent consumer groups to consume the same events and replay them later if needed.
    

That distinction—**ephemeral work queue vs. durable append-only log**—is the core conceptual difference.

### Ok so then when to use which ???

This is exactly the question interviewers expect after understanding the difference.

The rule is surprisingly simple:

> **Ask yourself: Is this a task, or is this an event?**

---

### Use a Message Queue when it's a **Task**

A task is something that should be done **once**.

Examples:

- Send an email
- Resize an uploaded image
- Generate a PDF invoice
- Process a payment
- Delete expired sessions

```
Create Order
     |
     v
+------------------+
| Email Job        |
+------------------+
     |
     v
Email Worker
```

If you have 10 workers,

```
Worker A -> Job 1
Worker B -> Job 2
Worker C -> Job 3
```

Each job is processed by **one** worker.

Having two workers send the same email would be incorrect.

---

### Use a Message Stream when it's an **Event**

An event is something that **happened**.

Examples:

- User signed up
- Order placed
- Payment completed
- Item added to cart
- Product viewed

```
OrderPlaced
```

Who cares?

- Inventory
- Analytics
- Notification
- Recommendation
- Fraud Detection
- Data Warehouse

Every service wants the **same event**.

```
                OrderPlaced
                     |
      -------------------------------
      |       |       |      |      |
 Inventory Analytics Email Fraud Recommendation
```

No service "owns" the event.

Everyone reacts to it independently.

### A simple decision framework

|Question|Choose|
|---|---|
|Should exactly one worker perform this work?|**Message Queue**|
|Should multiple independent services react to the same occurrence?|**Message Stream**|
|Do you need to replay old messages later?|**Message Stream**|
|Is this a background job?|**Message Queue**|
|Is this an immutable business event?|**Message Stream**|

### System design interview heuristic

A useful mental model is:

- **Message Queue = "Do this."** (a command or unit of work)
- **Message Stream = "This happened."** (an event that others may care about)

If the message represents work that should be completed once, think **queue**. If it represents a fact that occurred and may have multiple independent consumers now or later, think **stream**.

**If the message represents a task/command that should be processed once → use a Message Queue.**

**If the message represents an event/fact that may be consumed by one or many consumers, possibly at different times → use a Message Stream.**


##### Things you should know about queues for your interview

- **Message Ordering**: Most queues are FIFO (first in, first out), meaning that messages are processed in the order they were received. However, some queues (like [Kafka](https://www.hellointerview.com/learn/system-design/deep-dives/kafka)) allow for more complex ordering guarantees, such as ordering based on a specified priority or time.
- **Retry Mechanisms**: Many queues have built-in retry mechanisms that attempt to redeliver a message a certain number of times before considering it a failure. You can configure retries, including the delay between attempts, and the maximum number of attempts.
- **Scaling with Partitions**: Queues can be partitioned across multiple servers so that they can scale to handle more messages. Each partition can be processed by a different set of workers. Just like databases, you will need to specify a partition key to ensure that related messages are stored in the same partition.
- **Backpressure**: The biggest problem with queues is they make it easy to overwhelm your system. If my system supports 200 requests per second but I'm receiving 300 requests per second, I'll never finish them! A queue is just obscuring the problem that I don't have enough capacity. The answer is backpressure. Backpressure is a way of slowing down the production of messages when the queue is overwhelmed. This helps prevent the queue from becoming a bottleneck in your system. For example, if a queue is full, you might want to reject new messages or slow down the rate at which new messages are accepted, potentially returning an error to the user or producer.

##### Things you should know about streams for your interview

- **Scaling with Partitioning**: In order to scale streams, they can be partitioned across multiple servers. Each partition can be processed by a different consumer, allowing for horizontal scaling. Just like databases, you will need to specify a partition key to ensure that related events are stored in the same partition.
- **Multiple Consumer Groups**: Streams can support multiple consumer groups, allowing different consumers to read from the same stream independently. This is useful for scenarios where you need to process the same data in different ways. For example, in a real-time analytics system, one consumer group might process events to update a dashboard, while another group processes the same events to store them in a database for historical analysis.
- **Replication**: In order to support fault tolerance, just like databases, streams can replicate data across multiple servers. This ensures that if a server fails, the data can still be read from another server.
- **Windowing**: Streams can support windowing, which is a way of grouping events together based on time or count. This is useful for scenarios where you need to process events in batches, such as calculating hourly or daily aggregates of data. Think about a real-time dashboard that shows mean delivery time per region over the last 24 hours.

### Kafka

[Apache Kafka]() is an open-source distributed event streaming platform that can be used either as a [message queue](https://www.hellointerview.com/learn/system-design/in-a-hurry/key-technologies#queue) or as a [stream processing system](https://www.hellointerview.com/learn/system-design/in-a-hurry/key-technologies#streams--event-sourcing). Kafka excels in delivering high performance, scalability, and durability. It's engineered to handle vast volumes of data in real-time, and when configured properly (with appropriate replication and acknowledgment settings), it can provide strong guarantees against message loss.

### When to use Kafka in your interview

Kafka can be used as either a message queue or a stream.

The key difference between the two lies in the consumption pattern. When used as a message queue, each message is processed by one consumer in a group and then effectively "consumed" (though Kafka still retains it based on retention policy). When used as a stream, consumers continuously process messages as they arrive in real-time, and the same data can be read by multiple independent consumer groups or replayed from any point in the log.

Consider adding a message queue to your system when:

- You have processing that can be done asynchronously. YouTube is a good example of this. When users upload a video we can make the standard definition video available immediately and then put the video (via link) a Kafka topic to be transcoded when the system has time.
- You need to ensure that messages are processed in order. We could use Kafka for our virtual waiting queue in [Design Ticketmaster] which is meant to ensure that users are let into the booking page in the order they arrived.
- You want to decouple the producer and consumer so that they can scale independently. Usually this means that the producer is producing messages faster than the consumer can consume them. This is a common pattern in microservices where you want to ensure that one service can't take down another.

Streams are useful when:

- You require continuous and immediate processing of incoming data, treating it as a real-time flow. See [Design an Ad Click Aggregator](https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator) for an example where we aggregate click data in real-time.
- Messages need to be processed by multiple consumers simultaneously. In [Design FB Live Comments](https://www.hellointerview.com/learn/system-design/problem-breakdowns/fb-live-comments) we can use Kafka as a pub/sub system to send comments to multiple consumers.