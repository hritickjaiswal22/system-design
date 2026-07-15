# Why Redis is Single Threaded

![[Screenshot from 2026-07-12 07-58-58.png]]
![[Pasted image 20260712080101.png]]
![[Pasted image 20260712080129.png]]
![[Pasted image 20260712080401.png]]
![[Pasted image 20260712080926.png]]
![[Pasted image 20260712081410.png]]
![[Pasted image 20260712081919.png]]
![[Pasted image 20260712082417.png]]
![[Pasted image 20260712082449.png]]
![[Pasted image 20260712082835.png]]

Thus by being single threaded redis makes its operations "atomic" and avoids the requirement of "locks" and being "in-memory" allows it to be extremely efficient

# Redis Basics

Redis is a self-described ["data structure store"] written in C. It keeps everything in memory and executes your commands one at a time on a single thread, which makes it both very fast and easy to reason about. The single-threaded design is deliberate: command execution never needs locks, and for operations this simple a single core is rarely the bottleneck.

The core structure underneath Redis is a key-value store: **every object in Redis is a value stored at a string key, and the value is where the data structure lives.**

**So basically Redis is a key-value store where the value can one of the many data structures that redis supports**.

### The mental model to remember

Think of Redis as:

Key
↓
┌─────────────────────┐
│ Data Structure │
├─────────────────────┤
│ String │
│ Hash │
│ List │
│ Set │
│ Sorted Set │
│ Stream │
│ Bitmap │
│ HyperLogLog │
│ Geospatial Index │
└─────────────────────┘

**Every key points to exactly one Redis data structure.**

This is why Redis calls itself a **data structure server/store** rather than simply a key-value database: it's still a key-value store at its core, but the "value" is a first-class data structure that Redis understands and manipulates efficiently.

![[Pasted image 20260712103521.png]]

# Since one key can map to single type of data structure does it mean in redis storing different data structures simultaneously requires some kind of partition or not possible ???

This is a great question, and it's a very common misunderstanding.

The key point is:

> **A single key can only have one data structure type at a time.**
>
> **But a Redis database can store millions of keys, each with a different type.**

No partitioning is required.

For example:

```text
user:123           -> Hash
user:456           -> Hash

leaderboard        -> Sorted Set

onlineUsers        -> Set

chat:room:42       -> Stream

recentSearches     -> List

pageViews          -> String
```

Redis internally stores metadata for each key indicating its type.

Conceptually, it looks like:

```text
Redis Database

Key                  Type            Value
------------------------------------------------------
user:123             Hash            {...}
user:456             Hash            {...}
leaderboard          Sorted Set      {...}
onlineUsers          Set             {...}
chat:room:42         Stream          {...}
pageViews            String          "1543"
```

When you execute a command like:

```bash
HGET user:123 name
```

Redis checks:

```
user:123
↓
Type = Hash ✅
Execute HGET
```

When you execute:

```bash
ZADD leaderboard 100 alice
```

Redis checks:

```
leaderboard
↓
Type = Sorted Set ✅
Execute ZADD
```

---

## What if I use the wrong command?

Suppose

```text
pageViews -> String
```

and you run

```bash
HSET pageViews count 10
```

Redis immediately returns an error:

```text
WRONGTYPE Operation against a key holding the wrong kind of value
```

because `pageViews` is a String, not a Hash.

---

## Can a key contain multiple data structures?

No.

For example, this is **not** possible:

```text
user:123

Hash
{
   name: "Alice"
}

+
List
[
   notifications
]
```

A key has exactly one Redis type.

Instead, you model them as separate keys:

```text
user:123                  -> Hash

user:123:notifications    -> List

user:123:followers        -> Set

user:123:scores           -> Sorted Set
```

This naming convention is extremely common in production systems.

---

## Why is this design better?

Imagine Redis allowed one key to contain multiple unrelated structures.

Every operation would first have to determine **which substructure** to modify:

```
user:123
 ├── Hash
 ├── List
 ├── Set
 └── Stream
```

This would make commands more complex, increase metadata overhead, and reduce performance.

Instead, Redis keeps the model simple:

```
One key
     ↓
Exactly one data structure
```

This simplicity is one of the reasons Redis is extremely fast.

---

## Interview takeaway

A good mental model is:

```
Redis Database
      │
      ├── user:123  ───────► Hash
      ├── leaderboard ─────► Sorted Set
      ├── chat:42 ─────────► Stream
      ├── queue ───────────► List
      ├── onlineUsers ─────► Set
      └── visits ──────────► String
```

So there is **no need for partitions or separate databases** just because you're using different data structures. All of them coexist in the same Redis instance. The only rule is that **each individual key has exactly one type**, and Redis enforces that type when executing commands.

# Interview Cheat Sheet

| Data Structure   | Best Used For                         | Time Complexity | Why It's Efficient                                       |
| ---------------- | ------------------------------------- | --------------- | -------------------------------------------------------- |
| **String**       | Cache, sessions, counters             | O(1)            | Hash table lookup in memory                              |
| **Hash**         | Objects (users, carts)                | O(1)            | Groups many fields under one key with compact storage    |
| **Set**          | Unique collections                    | O(1)            | Fast membership checks using hashing                     |
| **Sorted Set**   | Rankings, leaderboards, rate limiting | O(log n)        | Maintains sorted order without re-sorting on every query |
| **List**         | Queues, feeds, recent items           | O(1) at ends    | Efficient append/pop operations                          |
| **Pub/Sub**      | Real-time messaging                   | O(subscribers)  | Direct in-memory message fan-out                         |
| **Streams**      | Durable event queues                  | O(1) append     | Append-only log with persistence and consumer groups     |
| **Bitmap**       | Boolean flags at scale                | O(1)            | One bit per flag instead of one byte or more             |
| **HyperLogLog**  | Approximate unique counts             | O(1)            | Fixed ~12 KB memory regardless of cardinality            |
| **Bloom Filter** | Existence checks                      | O(k)            | Tiny memory footprint for fast probabilistic lookups     |

# Redis Cluster

Yes, that's essentially correct, but Redis Cluster has one important optimization compared to naive sharding.

## General Sharding

Suppose you have 4 nodes.

```
Node A → Keys A-F
Node B → Keys G-L
Node C → Keys M-R
Node D → Keys S-Z
```

If you add another node, some keys must migrate.

```
Node A → A-D
Node E → E-F
...
```

Data movement is unavoidable.

---

## Redis Cluster

Redis Cluster also shards the dataset across nodes, but **it shards by hash slots instead of directly by key ranges.**

Redis defines **16,384 hash slots**.

For every key:

```
slot = CRC16(key) % 16384
```

Example

```
user:1      → Slot 25
user:2      → Slot 1000
cart:55     → Slot 12001
```

Nodes own ranges of slots.

Example

```
Node A
Slots 0-5000

Node B
Slots 5001-10000

Node C
Slots 10001-16383
```

When a client wants

```
GET user:1
```

it computes

```
CRC16(user:1) % 16384 = Slot 25
```

and immediately knows

```
Slot 25 → Node A
```

No broadcast required.

---

## What happens when adding a node?

Suppose

```
A
0-5000

B
5001-10000

C
10001-16383
```

Add Node D.

Instead of rehashing every key, Redis simply reassigns some slots.

```
A
0-4000

B
4001-8000

C
8001-12000

D
12001-16383
```

Only the keys belonging to the moved slots are migrated.

For example

```
Slot 13000
```

moves from

```
Node C
```

to

```
Node D
```

Only keys in slot 13000 move.

---

## Is migration still required?

**Yes.**

There is **no distributed database** where adding/removing nodes magically avoids moving data.

Whenever ownership changes:

```
Old Node
   │
   │ copy keys
   ▼
New Node
```

migration happens.

Redis performs this migration online while the cluster continues serving requests.

---

## Why use hash slots instead of "Node A owns these keys"?

Hash slots provide several benefits:

- Nodes don't need to store arbitrary key lists—just slot ranges.
- Rebalancing moves **slots**, not arbitrary key assignments.
- Clients can cache the slot-to-node mapping for efficient routing.
- Slot ownership changes are straightforward during cluster expansion or shrinkage.

---

## One interview nuance

Redis Cluster **does not use consistent hashing** like systems such as Cassandra or DynamoDB.

Instead, it uses:

```
Key
   ↓
CRC16
   ↓
16384 Hash Slots
   ↓
Slot → Node Mapping
```

So if an interviewer asks, "Does Redis Cluster use consistent hashing?", the technically correct answer is:

> **No. Redis Cluster uses a fixed set of 16,384 hash slots. Nodes are assigned ranges of slots, and scaling involves reassigning slots between nodes rather than using a consistent hashing ring.**

For system design interviews, you can think of Redis Cluster as a specialized form of sharding where the partition unit is a **hash slot** instead of the keys themselves. The underlying principle remains the same: **each node owns part of the keyspace, and adding or removing nodes requires migrating the affected partitions.**

# Infrastructure Configurations

Redis can run as a single node, with a high availability (HA) replica, or as a cluster. When operating as a cluster, every key hashes to one of 16,384 "hash slots", and each slot is assigned to a node. This is sharding: each node owns a share of the slots, and therefore a share of your keys. Redis clients cache the slot-to-node mapping, so they can compute the slot from the key and connect directly to the node which contains the data they are requesting. When you add a node, slots (and the keys in them) migrate to it.

![[Pasted image 20260712110647.png]]

Nodes share cluster state with each other **(via a gossip protocol)**, so every node knows the full slot map. If you ask the wrong node for a key, you get a MOVED reply pointing at the right one. The node won't forward the request for you, so clients cache the map and aim for the correct node on the first try.

A word on replicas, since most production deployments run them: Redis replication is **asynchronous**. The primary acknowledges your write before the replica has seen it, so when a primary dies and a replica is promoted, the last moments of acknowledged writes can simply vanish. This is the deepest reason Redis isn't a system of record, and it matters again when we talk about locks below.

## If asked **"How do you design keys in Redis Cluster?"**, the answer is:

- Redis Cluster partitions data into **16,384 hash slots**.
- By default, the **entire key** is hashed to determine its slot.
- Most multi-key operations (such as `MULTI`, `MGET`, `SUNION`, or Lua scripts accessing multiple keys) require all involved keys to be in the **same hash slot**.
- Use **hash tags** (`{...}`) to force related keys to hash on the same value and therefore land on the same node.
- Use hash tags **only for data that genuinely needs to be accessed or updated together**. Overusing a single hash tag creates hot spots and defeats the purpose of sharding.

# Redis as a Cache

The most common deployment scenario of Redis is as a cache. The mapping is direct: your cache keys are Redis keys, your cached values are Redis values. Redis can distribute this hash map trivially across all the nodes of our cluster, enabling us to scale without much fuss. If we need more capacity, we simply add nodes to the cluster.

For example, you might cache a product under key product:123 with the value stored as a JSON blob or a Redis Hash containing fields like name, price, and inventoryCount.

When using Redis as a cache, you'll often employ a time to live (TTL) on each key. Redis guarantees you'll never read the value of a key after the TTL has expired. Expiration handles staleness, not memory pressure: out of the box, Redis actually _rejects_ writes once memory is full. For a cache you'll configure an eviction policy like allkeys-lru so Redis discards the least-recently-used keys to make room. Redis approximates LRU by sampling keys rather than tracking exact order, which is plenty for a cache.

Using Redis in this fashion doesn't solve one of the more important problems caches face: the ["hot key" problem], where a single key absorbs a disproportionate share of traffic. This isn't unique to Redis. Memcached and even highly scaled databases like DynamoDB face the same issue.

![[Pasted image 20260712112211.png]]

# Redis as a Distributed Lock

Another common use of Redis in system design settings is as a distributed lock. Occasionally we have data in our system and we need to maintain consistency during updates or we need to make sure multiple people aren't performing an action at the same time

Redis works here because it's one shared server all your app servers can reach, and every command executes atomically. The lock itself is just a key that everyone agrees on, like lock:concert:343. To acquire it, try to create that key:

    SET lock:concert:343 my-token NX EX 30

The NX flag makes the SET succeed only if the key doesn't already exist. If it succeeded, you own the lock. If not, someone else does. Wait and retry. The EX 30 puts a 30 second expiry on the key so a crashed process can't hold the lock forever, and my-token is a random value unique to you, which matters in a second.

Releasing the lock means deleting the key, but don't just DEL it. Your lock may have expired and been acquired by someone else, and a blind delete would remove _their_ lock. Instead, check that the key still holds your token and delete only then. The check and delete run as a tiny [Lua script]. Redis executes the whole script as one command on its single thread, which is what makes it atomic:

    if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end

This is one of the **most common Redis interview topics**. Let's build it from first principles.

## Why do we need distributed locks?

Imagine you have **10 backend servers**.

```
          Client A
              |
        API Server 1
              |
              |
           Redis
              |
        API Server 2
              |
        API Server 3
              |
          Client B
```

All servers can update the same data.

Sometimes **only one server should perform an operation at a time.**

Examples:

- Only one user should purchase the last concert ticket.
- Only one worker should send a monthly invoice.
- Only one server should process a payment.
- Only one scheduler should generate a report.

Without coordination:

```
Server 1:
Reads seats = 1

Server 2:
Reads seats = 1

Server 1:
Books seat

Server 2:
Books seat

Result:
Seat sold twice.
```

This is a **race condition**.

---

## Why Redis?

Redis is a single-threaded server.

That means commands execute one after another.

Not

```
SET
SET
GET
DEL
```

simultaneously.

Instead

```
SET
↓ finishes

Next SET
↓ finishes

Next GET
↓ finishes
```

Every command is **atomic**.

That makes Redis an excellent place for coordination.

---

## The lock

Suppose we're booking concert **343**.

Everyone agrees to use the same Redis key.

```
lock:concert:343
```

Initially

```
Redis

(no key exists)
```

---

## Server 1 tries to acquire the lock

It executes

```redis
SET lock:concert:343 my-token NX EX 30
```

Let's understand every part.

---

## SET

Creates

```
lock:concert:343
        |
        v
    my-token
```

---

## NX

Means

> Only set the key **if it doesn't already exist.**

Equivalent logic

```
if key doesn't exist
    create it
else
    fail
```

---

Suppose two servers run simultaneously.

Server A

```
SET lock NX
```

Server B

```
SET lock NX
```

Redis receives

```
Server A
↓

Server B
```

Since Redis executes commands sequentially,

Server A creates the key.

```
lock:concert:343
```

Server B arrives later.

Redis checks

```
Does key exist?

Yes.

Return failure.
```

So only one server acquires the lock.

---

## EX 30

Suppose the server crashes.

Without expiry

```
lock:concert:343
```

would stay forever.

Nobody else could ever acquire it.

That's called a **dead lock**.

Instead

```
SET ... EX 30
```

means

```
Expire after 30 seconds.
```

If the server dies,

```
30 seconds later

Redis deletes the key automatically.
```

The lock becomes available again.

---

## Why store "my-token"?

This is the subtle but extremely important part.

Suppose Server A acquires the lock.

```
lock:concert:343

value:

abc123
```

where

```
abc123
```

is a random UUID.

---

Now Server A hangs for 35 seconds.

Meanwhile

30 seconds pass.

Redis expires the key.

Now Server B acquires it.

```
lock:concert:343

value:

xyz999
```

Now B owns the lock.

---

Eventually Server A wakes up.

It thinks

> "I'm done. I'll delete my lock."

If A simply executes

```redis
DEL lock:concert:343
```

Redis deletes

```
xyz999
```

which belongs to Server B.

Now the lock disappears.

Server C can acquire it.

```
Server B
and
Server C
```

are now both inside the critical section.

The lock has been broken.

---

## That's why we use tokens

Each owner has a unique identifier.

Example

Server A

```
abc123
```

Server B

```
xyz999
```

Before deleting,

Server A first checks

```
Does this lock still contain

abc123 ?
```

If yes

```
Delete.
```

If no

```
Someone else owns it.

Do nothing.
```

---

## Why can't we do GET then DEL?

A naïve implementation is

```text
GET lock

if value == my-token
    DEL lock
```

Looks fine.

But imagine:

```
A:
GET
```

returns

```
abc123
```

Now A pauses.

The lock expires.

Server B acquires it.

```
xyz999
```

Now A resumes.

```
DEL
```

Oops.

A deletes B's lock.

Race condition.

---

## Lua script solves this

Instead Redis executes

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
```

This entire script executes as **one atomic Redis operation**.

Redis internally does

```
GET

↓

compare

↓

DEL
```

without letting any other client run commands in between.

So nobody can sneak in between the GET and DEL.

---

## Timeline

### Server A acquires

```
SET lock NX EX 30

Success
```

Redis

```
lock
↓

abc123
```

---

### Server B tries

```
SET lock NX EX 30
```

Fails.

Waits.

---

### Server A finishes

Runs Lua

```
GET

↓

compare

↓

DEL
```

Lock removed.

---

### Server B retries

```
SET lock NX EX 30
```

Succeeds.

---

## Where are distributed locks used?

You'll see them in many production systems, for example:

- **Seat booking:** Prevent two users from reserving the same seat simultaneously (though databases often remain the source of truth with transactions or optimistic locking).
- **Payment processing:** Ensure the same payment or refund isn't processed concurrently.
- **Cron jobs:** Ensure only one instance of a scheduled job runs across multiple application servers.
- **Cache rebuilding:** Prevent a "cache stampede" where many servers regenerate the same expensive cache entry simultaneously.
- **Inventory updates:** Serialize updates to a shared stock item when required.

---

## Interview caveat (very important)

For L4/L5 interviews, don't suggest Redis locks as the first solution for protecting database data.

A common but weak answer is:

> "I'll use Redis distributed locks so two users can't buy the same ticket."

A stronger answer is:

> "I'll rely on **database transactions**, **row-level locking (`SELECT ... FOR UPDATE`)**, **optimistic locking**, or **atomic conditional updates** to guarantee correctness. Redis distributed locks are useful for coordinating work across services or reducing contention, but they are not a replacement for database consistency."

That's because Redis and your database are separate systems. If your database commit fails after acquiring a Redis lock—or the lock expires while a long-running transaction is still executing—you still need the database itself to enforce correctness.

**Rule of thumb for interviews:**

- **Database invariants (money, inventory, seat allocation):** Let the database guarantee correctness.
- **Cross-service coordination (jobs, cache rebuilds, leader election, duplicate work prevention):** Redis distributed locks are an excellent fit.

# Redis for Leaderboards

Redis' sorted sets maintain ordered data that can be queried in log time, making them a natural fit for leaderboard applications. The high write throughput and low read latency make this especially useful for scaled applications where something like a SQL DB will start to struggle.

Note : Will have to remove non-needed keys after regular intervals

# Redis for Rate Limiting

Redis' data structures also make rate limiting straightforward. A common algorithm is a fixed-window rate limiter where we guarantee that the number of requests does not exceed N over some fixed window of time W.

Implementation of this in Redis is simple. When a request comes in, we increment (INCR) the counter key for the current window and check the response. If the count exceeds N, we reject the request (a 429 with a Retry-After header is the usual move). Otherwise we proceed. One subtlety: set the expiry only when INCR returns 1, i.e. on the first request of the window. Calling EXPIRE on every request keeps pushing the reset forward, and a steady stream of traffic would never get a fresh window. Run the INCR and EXPIRE as one Lua script, the same trick the lock release used. A crash between the two commands would leave a counter that never resets.

This is one of the **most common Redis interview questions**, and it's worth understanding because it combines **Strings + TTL + Atomicity**.

Let's build it step by step.

---

## Goal

Suppose your API allows

> **100 requests per minute per user**

If a user sends the 101st request within the same minute, return

```
HTTP 429 Too Many Requests
Retry-After: <seconds>
```

Redis is perfect because:

- Incrementing counters is extremely fast (O(1))
- Keys can expire automatically
- Everything happens in memory

---

## Step 1: Choose a Redis Key

A key usually looks like

```
rate_limit:user123:202607121230
```

Meaning

```
rate_limit
      ↓
user123
      ↓
minute window = 12:30
```

Notice the **window is encoded in the key**.

For example

```
12:30:00 - 12:30:59
```

shares the same key.

At

```
12:31:00
```

a completely new key is used.

---

## Step 2: First Request

Redis contains nothing.

```
(empty)
```

Client sends request.

Application executes

```
INCR rate_limit:user123:202607121230
```

Redis returns

```
1
```

meaning

```
This is the first request.
```

Now we set

```
EXPIRE rate_limit:user123:202607121230 60
```

Now Redis contains

```
rate_limit:user123:202607121230

Value = 1
TTL = 60 sec
```

---

## Step 3: Second Request

Run

```
INCR key
```

Redis returns

```
2
```

Current state

```
Value = 2
TTL = 58 sec
```

No need to change expiry.

---

## Step 4: Continue

Requests become

```
3
15
37
89
100
```

All allowed.

---

## Step 5: 101st Request

```
INCR
```

returns

```
101
```

Application compares

```
101 > 100
```

Reject

```
429 Too Many Requests
```

Easy.

---

## After 60 Seconds

TTL expires.

Redis automatically deletes

```
rate_limit:user123:202607121230
```

Next minute

```
rate_limit:user123:202607121231
```

starts again from

```
1
```

Fresh window.

---

## Why set EXPIRE only when INCR returns 1?

This is the subtle but very important part.

Suppose we do this:

```
INCR
EXPIRE 60
```

on **every request**.

Timeline:

```
12:30:00

Request 1

Counter = 1
TTL = 60
```

Now

```
12:30:20

Request 2

Counter = 2

EXPIRE 60
```

TTL becomes

```
60
```

again!

Instead of expiring at

```
12:31:00
```

it now expires at

```
12:31:20
```

Another request:

```
12:30:40

Counter = 3

EXPIRE 60
```

Now expiry is

```
12:31:40
```

The window keeps sliding.

If requests continue every few seconds

```
12:30:50
12:30:55
12:30:59
12:31:05
...
```

the key **never expires** because each request pushes the TTL forward.

So you've unintentionally implemented something closer to a sliding timeout rather than a fixed window.

For a **fixed-window rate limiter**, you want the counter to reset at the end of the original window, so you set the expiry **only once**, when the key is first created (`INCR` returns `1`).

---

## Why use a Lua script?

Imagine the code is

```
INCR key

// server crashes here

EXPIRE key 60
```

Crash happens after

```
INCR
```

but before

```
EXPIRE
```

Redis now stores

```
Value = 1

TTL = none
```

This key will **never expire**.

Tomorrow

```
Counter = 1,245,983
```

The user will be permanently rate limited.

Bad.

---

## Lua script makes it atomic

Instead of

```
INCR
EXPIRE
```

send one Lua script:

```
count = INCR(key)

if count == 1 then
    EXPIRE(key, 60)
end

return count
```

Redis executes the entire script as **one atomic operation**:

- no other client can interleave commands
- either both operations complete or neither does
- no crash can leave the key without its TTL

This is the same reason Lua scripts are used for safe distributed lock release.

---

## Complexity

Each request performs:

```
INCR
(Optional EXPIRE only on first request)
```

Both are:

- **Time:** O(1)
- **Memory:** O(number of active users × active windows)

---

## Interview takeaway

The fixed-window rate limiter in Redis works because:

1. Each **user + time window** maps to a unique Redis key.
2. `INCR` counts requests in O(1).
3. If the count exceeds the limit, return **429 Too Many Requests**.
4. Set the TTL **only when `INCR` returns 1**, so the window expires at the intended boundary.
5. Execute `INCR` and the conditional `EXPIRE` in a **Lua script** to prevent a crash from leaving a counter that never expires.

# Redis for Pub/Sub

Streams are for consumers that need to catch up on what they missed. When you only care about delivering to whoever's listening right now, Redis natively supports a publish/subscribe (Pub/Sub) messaging pattern: messages broadcast to multiple subscribers in real time. This is useful for building chat systems, real-time notifications, or any scenario where you want to decouple message producers from consumers (more discussion on this in our [Realtime Updates] pattern).

The basic commands are straightforward:

    PUBLISH channel message   # Sends a message to all subscribers of 'channel'
    SUBSCRIBE channel         # Listens for messages on 'channel'

In cluster mode you'll reach for the sharded variants (SPUBLISH/SSUBSCRIBE), which hash the channel to a slot like any key.

A channel is just a name. There's nothing to create or configure: publishers send to a channel name, subscribers listen on it, and that's what brings it into existence. When a client subscribes to a channel, it will receive any messages published to that channel as long as the connection remains open. This makes Pub/Sub great for ephemeral, real-time communication, but messages are not persisted: if a subscriber is offline when a message is published, it will miss that message entirely.

Connection overhead is **per node, not per channel**. A subscriber holds one connection to a node and receives all of its subscribed channels over that single connection, so millions of channels don't mean millions of connections. With sharded Pub/Sub, each channel hashes to a slot just like a key does, which means a subscriber only needs connections to the nodes that own the channels it cares about.

![[Pasted image 20260712132145.png]]

Pub/Sub is a great fit for interview scenarios where you need to demonstrate real-time communication patterns, but be ready to discuss its limitations and when you might need stronger delivery guarantees.

**==Redis Pub/Sub is simple and fast, but not durable. The delivery of messages is "at most once" which means that if a subscriber is offline when a message is published, it will miss that message entirely. If you need message persistence, delivery guarantees, or the ability to replay missed messages, consider using Redis Streams or a dedicated message broker like Kafka or RabbitMQ.==**

**==Need offline delivery or durable fan-out? Redis Streams are a good option or you can pair Pub/Sub with a queue (e.g., SNS→SQS, Kafka) or outbox pattern (i.e. write the messages to a database) so consumers can catch up later.==**

# Shortcomings and Remediations

### Hot Key Issues

If our load is not evenly distributed across the keys in our Redis cluster, we can run into a problem known as the "hot key" issue. To illustrate it, let's pretend we're using Redis to cache the details of items in our ecommerce store. We have lots of items so we scale our cluster to 100 nodes and our items are evenly spread across them. So far, so good. Now imagine one day we have a surge of interest for _one particular item_, so much that the volume for this item matches the volume for the rest of the items.

**Client-side caching.** Each app server keeps a small in-memory cache of the hottest items, so most reads for the hot item never reach Redis at all. The cost is a second cache to keep coherent: you'll serve data that's stale by up to that cache's TTL, which is why this works best with short TTLs on a small set of keys.

**Key copies.** Store the same data under several keys (product:123:1 through product:123:10) so the copies hash to different slots and land on different nodes, then have readers pick a suffix at random. Readers have to know which keys are duplicated, though. In practice you decide up front (or detect at runtime) which keys are hot and keep that list where clients can see it, and every write to a hot item now fans out to all of its copies.

**Read replicas.** Adding replicas multiplies read capacity, with two caveats that interviewers love to probe. Cluster clients read from the primary by default, so replicas only absorb load if your clients are configured for replica reads. And replicas do nothing for a write-hot key, since every write still lands on the one primary that owns the slot.

In an interview, recognize potential hot key issues (+) and proactively design remediations (++).

# When Not to Use Redis

1. Don't reach for it when your working set can't economically fit in RAM: memory is the most expensive place to keep data.
2. Don't expect query flexibility: there are no joins, no cross-key queries, and in a cluster, multi-key operations only work within a single slot (hash tags notwithstanding).
3. And when you need durable, replayable streams with long retention for many independent consumers, that's Kafka's job.

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a534ae1-e370-83e8-854f-984302178442
