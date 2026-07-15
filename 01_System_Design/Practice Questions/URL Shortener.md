v2

Assumptions
1. URL are stored indefinitely if change is required needs to be updated
2. **16 KB per original URL**
3. Only 1 to 1 mapping supported
4. In analytics assuming only 2 data points for time being unique visits, total visits


Functional Requirements
1. Create short urls against long urls
2. Get redirected to original url upon hitting the generated short url
3. Analytics
4. Should support not only support public resources but private as well which requires a password to be submitted along with the request

Non - Functional Requirements

1. Low Latency (300 - 400 ms)
2. High Availability (99.999% Uptime)
3. 500 million active short URLs

500 million urls = 16Kb * 500 million = 2^4 * 2^10 * 500 * 2^20 = 500 * 2^34 = 2^9 * 2^34 = 2^43 bytes

Assuming using only alphanumeric characters in short url stub 5 should be enough 

Core Entities

users {
id: UUID (primary-key, unique, not null, snowflake style)
email : VARCHAR(256) (unique, not null)
}

mappings {
id : BIGINT; (primary-key, unique, not-null,sequential)
original_url : TEXT; (unique,not-null)
short_url_stub: VARCHAR(8); (unique,not-null)
password?: TEXT; (nullable; only for private urls; encrypted using bcrypt)
user_id: UUID; (foreign-key, not-null, snowflake style for sharded or distributed envs)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;

index on user_id with (original_url,short_url_stub) as partial index
}

analytics {
id : UUID; (primary-key, unique, not-null)
map_id : UUID; (foreign-key, unique, not-null)
unique_visits: INT;
total_visits: INT;

index on map_id with (unique_visits,total_visits) as partial index
}

API design 

POST /map

{
original_url: string;
password?: string;
}

For public urls

GET /map?code=short_stub

For private urls

POST /private-map
{
password : string;
}

High level design
![[1783946778655.jpg]]

Read Path

Clients -> CDN (edge processing enabled and only for public resources) -HIT-> return response to client -MISS-> Origin (Hit or miss analytics via Kafka via flushing after periodic times) -> L7 load balancer -> Horizontally scaled servers -> Distributed Redis Cache with cluster config with master/follower patterns -> if hit return -> if miss request to origin server which is also sharded and follow leader/replica pattern

Write Path 

Same as read path except does not hit CDN goes straight to server from there to origin and redis invalidation 

# Id generation logic 

so "Auto Increment" for starting and when in future when and if write shards are needed use id allocation service

Ok just confirming how id allocation service works

Initially suppose 3 nodes and total max number of ids required is 1 billion 

then the id allocation service will first assign lets say a million ids at at time so 

node1-> 1 - 1000000
node2-> 1000001 - 2000000
node3-> 2000001 - 3000000

And everytime a node has exhausted it will provision another million ids and if any node is added in the future it will just have to assign a million id range to it and hence id allocation basically is a service for managing ids and their owners

And since a million range is assigned at a time this service is neither too read-heavy or write-heavy

# How it works

Suppose the maximum possible ID space is

```text
1 ... 1,000,000,000
```

Initially there are three application servers.

The ID Allocation Service maintains a single variable:

```text
next_available = 1
```

### Server 1 starts

Requests a range.

Allocator returns

```text
1 - 1,000,000
```

Updates

```text
next_available = 1,000,001
```

---

### Server 2 starts

Allocator returns

```text
1,000,001 - 2,000,000
```

Updates

```text
next_available = 2,000,001
```

---

### Server 3 starts

Allocator returns

```text
2,000,001 - 3,000,000
```

Updates

```text
next_available = 3,000,001
```

Exactly as you described.

---

# What happens later?

Suppose Server 2 becomes extremely busy.

It consumes its million IDs in one hour.

It requests another range.

Allocator returns

```text
3,000,001 - 4,000,000
```

Notice something:

It **doesn't matter which server** gets the next range.

The allocator simply gives out the next unused block.

Eventually it may look like

```text
Server 1
1 - 1,000,000

Server 2
1,000,001 - 2,000,000
3,000,001 - 4,000,000
5,000,001 - 6,000,000

Server 3
2,000,001 - 3,000,000
```

The ranges don't need to be contiguous per server.

---

# New server joins

Suppose Server 4 is added.

It simply requests a range.

Allocator returns

```text
6,000,001 - 7,000,000
```

Done.

No existing server needs to change anything.

---

# If a server crashes

Suppose Server 3 owned

```text
2,000,001 - 3,000,000
```

but only used

```text
2,000,001 - 2,450,000
```

The remaining

```text
2,450,001 - 3,000,000
```

are simply discarded.

Those IDs are never reused.

This is completely acceptable.

---

# Your understanding of the allocator's role

You wrote:

> "id allocation basically is a service for managing ids and their owners"

I would phrase it slightly differently:

> **The ID Allocation Service leases contiguous ranges of unique IDs to application servers.**

The word **lease** is commonly used in distributed systems.

---

# Your final observation

> "Since a million range is assigned at a time this service is neither too read-heavy or write-heavy"

Exactly.

Let's quantify it.

Suppose your system creates

```text
100 million URLs/day
```

and each allocation gives

```text
1 million IDs
```

Then allocations/day are only

```text
100
```

That means the allocator only receives about **100 requests per day**.

Compare that to the application servers handling

```text
100,000,000 URL creations/day
```

The allocator is almost idle.

That's the beauty of this design—it removes the centralized service from the critical path for nearly every request.

---

## One last optimization used in production

Many systems don't wait until a server completely exhausts its range.

Instead, when about **80–90%** of the current range has been consumed, the server asynchronously requests the next range in the background.

```text
Current Range
1 ────────────────────────────── 1,000,000
                                 ^
                                 |
                         900,000 reached

Background:
Request next range

↓

Receive

1,000,001 - 2,000,000
```

This way, when the current range is exhausted, the next range is already available and there's **zero delay** for incoming requests.

---

You've now understood the same core idea behind **Hibernate's Hi/Lo algorithm**, **Meituan's Leaf Segment mode**, and many internal ID generation services at large tech companies. This is a very solid concept to have in your system design toolkit.

Reading about key - generation - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a56142d-d658-83e8-ad0a-b7aaf6d2db2f

# Hot key mitigation

This is actually a very good observation, and this is exactly the kind of discussion that happens in senior system design interviews.

However, I'd refine your answer slightly because **there are different kinds of hot keys.**

---

## First, what is a hot key?

A hot key is simply a key that receives a disproportionately large number of requests.

For a URL shortener:

```
bit.ly/google
```

might receive

```
1 million requests/sec
```

while every other URL receives only a few requests.

---

## Is your current design enough?

### CDN (Public URLs)

Absolutely.

This is the first layer of defense.

If 95% of requests are served directly from the CDN, they never reach your infrastructure.

```
Client
   ↓
CDN HIT
   ↓
302 Redirect
```

No Redis.

No application server.

No database.

This is exactly why CDNs exist.

---

### Redis Read Replicas

Also correct.

Suppose the CDN misses.

```
App
   ↓
Redis Replica 1
Redis Replica 2
Redis Replica 3
```

The application can distribute reads across replicas.

This scales reads quite well.

---

### Database Read Replicas

This is another fallback.

Ideally, the database should almost never be touched for popular URLs because Redis should have them cached.

---

# So why do people still discuss hot-key mitigation?

Because there are limits.

Imagine this situation:

```
One URL

↓

5 million requests/sec
```

Even if Redis has 10 read replicas,

```
500K requests/sec
```

per replica may still be too much.

Or perhaps the application servers themselves become bottlenecks because every request still has to:

```
receive request
↓

query Redis

↓

return redirect
```

---

# Your answer in an interview

I would say something like:

> "For most hot URLs, I rely on multiple layers of caching. Public URLs are cached at the CDN edge, which absorbs the majority of traffic. For cache misses, Redis read replicas distribute the remaining read load, and the database is protected by Redis so it should rarely be accessed."

Then continue:

> "If a single URL becomes extremely popular beyond what one Redis shard or its replicas can handle, I would consider specialized hot-key mitigation strategies."

This shows that you understand **ordinary scaling** before jumping to advanced techniques.

---

# About "hot-key partitions"

This is where I want to challenge you a bit.

You said:

> use hot-key partitions

What exactly do you mean?

There are several approaches:

### Option 1: Replicate the same value across multiple Redis keys

```
abc123:0
abc123:1
abc123:2
abc123:3
```

The application randomly chooses one.

This spreads reads across multiple shards.

This is probably what you're thinking of.

---

### Option 2: Replicate into multiple Redis clusters

Large companies sometimes replicate hot objects into independent cache clusters.

---

### Option 3: Edge caching

Increase CDN TTL or proactively push popular mappings closer to users.

Often this is more effective than adding Redis complexity.

---

# The synchronization cost

You said:

> it comes at the cost of keeping them in sync

Exactly.

Suppose

```
abc123
```

is updated.

Now you have

```
abc123:0
abc123:1
abc123:2
abc123:3
```

Every copy must be updated or invalidated.

Fortunately, in your system you've assumed:

> URLs are stored indefinitely and rarely updated.

That assumption is important because it makes replication of hot keys much cheaper—writes are rare, so keeping multiple cached copies synchronized is not a significant burden.

---

# Interview perspective

If I were interviewing you and you answered:

> "I already have CDN, Redis read replicas, and DB replicas, so I'm covered for most hot keys. If traffic exceeds what a single Redis shard can handle, I can replicate hot keys across multiple cache partitions or clusters, accepting the added synchronization complexity since URL mappings are almost immutable."

I'd consider that a **strong L4/L5 answer** because it demonstrates incremental thinking:

1. Solve the common case with simple mechanisms.
    
2. Introduce more complex solutions only when the simpler ones reach their limits.
    
3. Acknowledge the trade-offs of the advanced solution instead of presenting it as free scalability.

Further reading about hot keys - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a571287-9664-83e8-ab91-6bdf7ffd4086

# Invalidation strategy

Since URL mappings are read-heavy and updates are relatively rare, I would use a cache-aside strategy. Every update first commits to the database, then invalidates the Redis entry. The next read repopulates the cache with fresh data. For public URLs cached at the CDN, I'd asynchronously issue a purge/invalidation request after the database commit. During propagation, a small window of stale redirects is acceptable because the system favors low read latency over strong consistency. Additionally, both Redis and CDN entries should have TTLs so that stale entries eventually expire even if an invalidation event is missed.

Further reading about invalidation - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a55a80e-6ad0-83ee-898f-9529bed962bf

# Analytics Hotspot fix

Ok now let's fix 

"Analytics redesign to avoid write hotspots" and "Decouple analytics completely from redirect path"

In the current design the calculation for analytics or analytics is done in async fashion 

The CDN will push the updates it has onto a Distributed Stream and app servers will also do the same thus increasing throughout and also allowing for massive volume but will come at the cost of eventual consistency and thus the analytics dashboard will show stale data from time to time

Is above behavior not production level and if what and how improvement can be done 

You're actually much closer to a production design than you think.

The answer is **yes**, the overall idea is production-grade. The issue isn't **using Kafka (or another distributed log)** or **eventual consistency**—those are exactly what production systems use. The issue is **what events you send and how you aggregate them**.

Let's review this as if I were interviewing you.

---

# Your Current Design

```
Request
    │
    ▼
CDN / App Server
    │
    ├── Redirect user immediately
    │
    └── Publish analytics event
            │
            ▼
      Distributed Stream (Kafka)
            │
            ▼
      Analytics Consumer
            │
            ▼
      Update Analytics DB
```

This is already the correct architecture.

The redirect path is completely independent of analytics.

**This is exactly what I want to hear in an interview.**

---

## Why this is good

The redirect latency becomes

```
Redis lookup
↓

302 Redirect
```

instead of

```
Redis lookup

↓

Update Analytics

↓

Redirect
```

Even if Kafka is down, users can still be redirected.

That is production thinking.

---

# Then where is the hotspot?

The hotspot is **not Kafka**.

Kafka can easily handle millions of events/sec.

The hotspot is here:

```
Consumer

↓

UPDATE analytics
SET total_visits = total_visits + 1
WHERE map_id = ?
```

Imagine this URL

```
abc123
```

receives

```
500,000 visits/sec
```

Now every Kafka consumer eventually executes

```
UPDATE analytics
```

on the same row.

One database row.

Millions of writes.

That's the hotspot.

---

# Production Improvement #1 (Batch Aggregation)

Instead of writing

```
+1

+1

+1

+1

+1
```

Aggregate them.

Example

Consumer receives

```
abc123
abc123
abc123
abc123
abc123
```

Instead of

```
UPDATE total = total +1
```

five times

Store in memory

```
abc123

count = 5
```

Every few seconds

```
UPDATE analytics

SET total = total +5
```

Now instead of

```
500,000 writes/sec
```

you may perform

```
100 writes/sec
```

Huge improvement.

---

# Production Improvement #2 (Windowed Aggregation)

Even better.

Consumers don't write immediately.

They aggregate over

```
5 seconds

or

30 seconds

or

1 minute
```

Then flush.

```
Kafka

↓

Consumer

↓

HashMap

abc123 -> 15234

xyz111 -> 9422

...

↓

Flush every 5 sec

↓

Database
```

This is extremely common.


# So is your design production level?

I'd say:

### Yes.

Architecture-wise

```
Redirect

↓

Publish Event

↓

Kafka

↓

Consumer

↓

Analytics DB
```

is exactly what large companies build.

The improvements are about **efficiency**, not correctness.

---

# I would slightly redraw your architecture

```
                 Client
                    │
                    ▼
            CDN / App Server
                    │
          Redirect immediately
                    │
                    ├──────────────► User
                    │
                    ▼
            Analytics Event
                    │
                    ▼
                Kafka
                    │
          (partition by short_url)
                    │
                    ▼
         Analytics Consumers
                    │
      Aggregate in memory (5 sec)
                    │
                    ▼
            Analytics Database
```

	So basically the design in itself is production good but to avoid hotspot 
	
	Rather than updating db for every update aggregate the events in consumer then flush after regular intervals
	
	Right ???

Exactly. That's the key idea.

I would just make one small refinement to your wording because interviewers care about precision.

Instead of saying:

> "aggregate the events in the consumer then flush after regular intervals"

I'd say:

> **"Consumers aggregate analytics events in memory (or Redis if durability across consumer restarts is needed) over a fixed time window or until a threshold is reached, then perform a single batched database update."**

That sounds much more production-oriented.

### Before (Current)

Suppose 100,000 visits arrive in one second.

```
Kafka
   │
Consumer
   │
100,000 ×
UPDATE analytics
SET total_visits = total_visits + 1
```

100,000 database writes.

---

### After (Batch Aggregation)

Consumer maintains an in-memory map:

```
{
  "abc123": 65,432,
  "xyz789": 21,876,
  ...
}
```

Every 5 seconds (or when the map reaches a size threshold):

```
UPDATE analytics
SET total_visits = total_visits + 65432
WHERE map_id = ...
```

Only **one write** instead of **65,432 writes**.

---

### Why this is better

You reduce:

- Database write load ✅
    
- Lock contention on the analytics row ✅
    
- Transaction overhead ✅
    
- Network round trips ✅
    

The trade-off is exactly what you've already identified:

- Analytics become slightly stale (e.g., 5–10 seconds behind), which is perfectly acceptable for dashboards.
    

---

## One more improvement interviewers love

Don't flush **only based on time**.

Use **both**:

```
Flush when:
    Every 5 seconds
OR
    Counter reaches 10,000 events
```

Why?

- A hot URL shouldn't wait 5 seconds to flush 500,000 events.
    
- A cold URL shouldn't flush every millisecond with only one event.
    

This hybrid strategy keeps latency reasonable while minimizing unnecessary writes.

---

So yes, your conclusion is correct:

> **The architecture is already production-grade. The improvement isn't changing Kafka or making analytics synchronous—it's batching updates in the consumer before persisting them to the database to eliminate write hotspots while accepting eventual consistency.**

That's exactly how I'd expect an L4/L5 candidate to explain it in a system design interview.

Further reading about analytics - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a5719fd-5450-83ee-bdfb-7e8e33ee48d9

That's the kind of reasoning interviewers look for.

All the analytics changes done on the server and async processing is used to update the origin servers while redis analytics data is invalidated immediately

Cons of the above design

1. Stale analytics data
2. Eventual consistency of analytics data


# Improvements

1. [x] User Entity missing
2. [x] Logic for creating the short url
3. [x] Analytics Improvement
4. [x] Handling Hot Keys
5. [x] Revise Covering index and partial index above would be "partial index"
6. [x] Redis "invalidated immediately" on every visit

# New Learning

Redirects are of 2 status codes
1. 301 - temporary 
2. 302 - permanent (Basically caches, proxies, DNS can cache it or store it)

A server EC2 instance can handle **around** **1k reqs/sec** ("around" means it depends on payload size, computation heavy or not, etc but in an interview good strong number to assume)