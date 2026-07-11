Reading a user profile from Postgres may take 50 milliseconds, but reading from an in-memory cache like Redis takes just 1 millisecond. That's a 50x improvement in latency. **Databases store data on disk, and every query pays the cost of disk access. Memory sits much closer to the CPU and avoids that entirely.**

Caches are essential for scalable systems. They reduce load on the database and cut latency dramatically. But they also create new challenges around invalidation and failure handling.

## Where to Cache

**When most engineers hear caching, they immediately think of Redis or Memcached sitting between the application and the database. ==It is the most common type of cache and the one interviewers care about the most.**==

But caching shows up in multiple layers of a system. **Browsers cache. CDNs cache. Applications cache. Even databases have built-in caching layers.**

### External Caching

An external cache is a standalone cache service that your application talks to over the network. This is what most people think of when they hear caching. You store frequently accessed data in something like [Redis](https://www.hellointerview.com/learn/system-design/deep-dives/redis) or [Memcached](https://memcached.org/) so you do not have to hit the database every time.

![[Pasted image 20260707170713.png]]

External caches scale well because every application server can share the same cache. They also support eviction policies like **LRU** and **expiration via TTL so your memory footprint stays controlled.**

### CDN (Content Delivery Network)

**A CDN is a geographically distributed network of servers that caches content close to users.** Instead of every request traveling to your origin server, a CDN stores copies of your content at edge servers around the world.

	Modern CDNs like Cloudflare, Fastly, and Akamai can cache much more than static files. **They can also cache public API responses**, HTML pages, and even run edge logic to personalize content or enforce security rules before requests reach your servers. But the most common and most impactful use of a CDN is still media delivery.

How it works:

1. A user requests an image from your app.
2. The request goes to the nearest CDN edge server.
3. If the image is cached there, it is returned immediately.
4. If not, the CDN fetches it from your origin server, stores it, and returns it.
5. Future users in that region get the image instantly from the CDN.

![[Pasted image 20260707171318.png]]

	Even though modern CDNs can cache API responses and dynamic content, in system design interviews the safest time to introduce a CDN is when your system serves static media at scale. Start with that reason first, then expand only if the problem calls for more.

#### How a request flows for a public API

Suppose your frontend calls

```
GET https://api.example.com/products
```

If your DNS points `api.example.com` to Cloudflare (or Fastly/Akamai), then the request flow is

```
Client
   │
   ▼
CDN Edge Server (nearest PoP)
   │
   ├── Cache Hit?
   │      │
   │      ├── YES → Return response immediately
   │      │
   │      └── NO
   ▼
Origin Server (Your API)
   │
Database / Redis
   │
Generate Response
   │
   ▼
CDN stores response
   │
   ▼
Client
```

Notice something important:

**The request reaches the CDN first, not your server.**

Your application isn't involved on a cache hit.

---

#### Example

Suppose the first user requests

```
GET /products
```

No cached copy exists.

```
User
  │
  ▼
Cloudflare
  │
  ▼
Origin API
  │
  ▼
Postgres
```

API returns

```json
[
  {
    "id":1,
    "name":"Laptop"
  },
  {
    "id":2,
    "name":"Phone"
  }
]
```

Along with

```
Cache-Control: public, max-age=300
```

Cloudflare stores it.

Now another user arrives.

```
GET /products
```

Cloudflare already has the response.

```
User
   │
   ▼
Cloudflare
   │
(Return cached JSON)
```

Your server never receives the request.

---

#### Isn't this just Redis?

No.

This is where many beginners get confused.

#### Redis cache

```
Client
   │
   ▼
API Server
   │
Redis?
   │
Database
```

Every request still reaches your backend.

Redis only saves the database work.

---

#### CDN cache

```
Client
   │
   ▼
CDN
   │
Origin (only on misses)
```

Most requests never reach your infrastructure.

This is a huge difference.

---

#### Comparison

|CDN Cache|Redis Cache|
|---|---|
|Lives outside your infrastructure|Lives inside your infrastructure|
|Reduces requests reaching your backend|Backend still receives every request|
|Global (hundreds of locations)|Usually one region|
|Reduces latency|Doesn't reduce network latency|
|Saves bandwidth|Doesn't save internet bandwidth|
|Best for public content|Best for dynamic content|

---

#### Why cache API responses?

Because many APIs are effectively static for short periods.

Examples:

```
GET /countries
```

Changes maybe once a year.

```
GET /currencies
```

Rarely changes.

```
GET /products?page=1
```

Maybe changes every few minutes.

```
GET /top-news
```

Changes every minute.

```
GET /weather?city=London
```

Can safely cache for 30 seconds.

No need to hit your backend thousands of times.

---

#### How does the CDN know whether it may cache?

Your API sends HTTP cache headers.

Example

```
Cache-Control: public, max-age=300
```

Meaning

```
Anyone may cache this.

Keep it for 5 minutes.
```

Or

```
Cache-Control: public, s-maxage=600
```

Meaning

```
Browser cache differently,
Shared caches (CDNs) cache for 10 minutes.
```

---

#### What APIs should never be cached?

Suppose

```
GET /me
```

returns

```json
{
   "name":"Alice",
   "balance":1000
}
```

If Cloudflare cached this publicly...

Bob could receive Alice's balance.

Disaster.

Instead

```
Cache-Control: private
```

or

```
Cache-Control: no-store
```

prevents shared caching.

---

#### When is CDN API caching useful?

Very useful for:

- Product catalog
    
- Categories
    
- Blog posts
    
- Documentation
    
- Public search results
    
- Trending lists
    
- Weather
    
- Exchange rates
    
- Stock metadata
    
- Public GraphQL queries
    

Not useful for:

- User dashboard
    
- Bank account
    
- Chat messages
    
- Shopping cart
    
- Notifications
    
- Order history
    

---

#### Why use both CDN and Redis?

Large systems almost always combine them.

```
               Cache Hit
Client ─────────► CDN
                  │
                  │ Cache Miss
                  ▼
             API Server
                  │
             Redis Cache?
                  │
                  ▼
              PostgreSQL
```

Imagine:

```
1,000,000 requests
```

With only Redis:

```
1,000,000 requests hit your API servers
```

Database load is low, but API servers still consume CPU, memory, TLS, and network bandwidth.

With CDN:

```
980,000 served by CDN

20,000 reach your servers
```

Those 20,000 can then be served from Redis if available, further reducing database load.

---

#### System design takeaway (important for interviews)

Think of caching as layers:

```
Browser Cache
       │
       ▼
CDN Cache (edge, global)
       │
       ▼
Application
       │
       ▼
Redis (application cache)
       │
       ▼
Database
```

Each layer removes load from the layer beneath it:

- **Browser cache** eliminates repeat requests from the same user.
    
- **CDN cache** prevents requests from reaching your infrastructure at all.
    
- **Redis cache** prevents your application from repeatedly querying the database.
    
- **Database** is only accessed when all cache layers miss.
    

For high-scale, read-heavy public APIs (e.g., product listings, news feeds, documentation), using both a CDN and Redis is a common pattern because they address different bottlenecks rather than duplicating each other's role.
#### Traditional CDN

Suppose your application is hosted in Mumbai.

```
User (London)
      |
      |
   Cloudflare
      |
      |
 Application (Mumbai)
```

Normally Cloudflare simply checks:

```
Is this file cached?

YES -> Return cached file

NO ->
     Fetch from origin
     Cache it
     Return it
```

Nothing special happens.

---

#### Edge Computing

Now imagine Cloudflare can actually execute JavaScript (or WASM) before deciding what to return.

```
User
   |
   |
Cloudflare Edge Server
   |
   |---- Execute your code
   |
   |---- Maybe respond immediately
   |
   |---- Maybe modify request
   |
   |---- Maybe contact origin
```

Instead of being just a cache...

It becomes

```
Thousands of tiny application servers
```

spread across the world.

---

#### Example 1 — Redirect by Country

Suppose your company supports multiple regions.

```
example.com
```

A user from India should see

```
example.com/in
```

A user from Germany should see

```
example.com/de
```

Without edge logic:

```
User
    ↓
Mumbai Server
    ↓
Detect Country
    ↓
Redirect
```

Every request reaches your origin.

With edge logic:

```
User
     ↓
Cloudflare Paris POP

if country == Germany
    redirect immediately

(No origin call)
```

Latency becomes

```
15 ms
```

instead of

```
250 ms
```

---

#### Example 2 — Authentication Check

Imagine your JWT is stored in a cookie.

Edge code can do

```
Read Cookie

↓

Verify signature

↓

Expired?

↓

Redirect to login
```

without hitting your application.

Notice:

Edge **can verify** the token if it has the public key or secret (depending on your signing scheme), but it generally **shouldn't perform authorization decisions that require database lookups**.

---

#### Example 3 — A/B Testing

Suppose you want

```
50% users

Home V1

50% users

Home V2
```

Instead of

```
User

↓

Origin

↓

Random()

↓

Serve Page
```

Cloudflare does

```
Random()

↓

Attach Header

↓

Fetch Correct Version
```

or

```
Return cached version directly
```

No backend work.

---

#### Example 4 — Personalizing Language

Suppose browser sends

```
Accept-Language

fr-FR
```

Edge code

```
if language == French

serve French homepage

else

serve English homepage
```

Again

No origin request.

---

#### Example 5 — Device Detection

```
User-Agent

↓

iPhone
```

Edge chooses

```
Mobile HTML
```

Desktop?

```
Desktop HTML
```

before origin sees anything.

---

#### Example 6 — Security

This is probably the most common use.

Edge receives

```
POST /login
```

Checks

```
Too many requests?

↓

Yes

↓

Return

429 Too Many Requests
```

Application never receives the attack.

Similarly

```
Known Bot?

↓

Block
```

or

```
Suspicious Country?

↓

Challenge with CAPTCHA
```

---

#### Example 7 — API Personalization

Imagine

```
GET /products
```

Premium users should see

```
Early Access Items
```

Regular users should not.

Edge can inspect

```
JWT

↓

Tier = Premium
```

Then

```
Forward

X-Plan: premium
```

to your origin.

Origin no longer has to decode the JWT on every request.

---

#### What Edge Logic Should Do

Edge is ideal for work that is:

- Fast (typically completes in milliseconds)
    
- Stateless or minimally stateful
    
- Independent of large databases
    
- Close to the user for lower latency
    
- Safe to execute globally
    

Examples:

- Redirects
    
- URL rewrites
    
- Cache key selection
    
- Locale detection
    
- Device detection
    
- Rate limiting
    
- Bot detection
    
- Security headers
    
- Cookie inspection
    
- JWT validation (signature and expiry)
    
- Feature flags
    
- A/B testing
    
- Image resizing
    
- Response header manipulation
    

---

#### What Edge Logic Should NOT Do

Avoid operations that are slow, stateful, or require significant backend resources.

#### ❌ Database-heavy operations

```
Read User

↓

Join Orders

↓

Calculate Spending

↓

Recommend Products
```

Poor fit because every edge location would need low-latency access to your database.

---

#### ❌ Complex business logic

For example:

```
Transfer Money

↓

Update Ledger

↓

Send Notifications

↓

Audit Log
```

This belongs in your application servers.

---

#### ❌ Long-running work

Examples:

- Video transcoding
    
- PDF generation
    
- Machine learning inference (unless it's a very small edge model)
    
- Large data processing
    

Edge environments have strict CPU and execution time limits.

---

#### ❌ Stateful workflows

For example:

```
Shopping Cart

↓

Inventory

↓

Payment

↓

Coupon

↓

Shipping
```

These require centralized, transactional state.

---

#### A Good Mental Model

Think of edge logic as a **smart gatekeeper** in front of your application.

```
                User
                  |
                  |
          Edge Server (Cloudflare)
          -------------------------
          Is bot?
          JWT valid?
          Which country?
          Which language?
          Which experiment?
          Cached?
          -------------------------
             |
      Only necessary requests
             |
        Application Server
```

The edge makes quick decisions, serves cached content when possible, blocks bad traffic, and enriches requests before they reach your backend. It should **not** replace your application for data-intensive or transactional business logic.

---

#### System Design Interview Tip (L4/L5)

A common interview mistake is saying, "We'll use the CDN for static assets."

A stronger answer is:

> "We'll leverage programmable edge capabilities for low-latency request processing: enforce rate limits, validate JWTs, route users based on geography, perform A/B testing, select locale-specific cached content, and rewrite requests before they reach the origin. The origin remains responsible for business logic, database access, and transactional operations."

This demonstrates that you understand modern CDNs as **distributed edge compute platforms**, not just static asset caches.

### Client-Side Caching

Client-side caching stores data close to the requester to avoid unnecessary network calls. This usually means the user's device, like a browser (HTTP cache, localStorage) or mobile app using local memory or on-device storage or client storage like react-quert.

For user-facing caching, you have limited control from the backend. Data can go stale and invalidation is harder.

![[Pasted image 20260707175220.png]]


## Cache Architectures (for external caches)

These are the four core cache patterns you should know for system design interviews.

### Cache-Aside (Lazy Loading)

This is the most common caching pattern and the one you should default to in interviews.

How it works:

1. Application checks the cache.
2. If the data is there, return it.
3. If not, fetch from the database, store it in the cache, and return it.

![[Pasted image 20260707180652.png]]

### Write-Through Caching

With write-through caching, the application writes only to the cache. The cache then synchronously writes to the database before returning to the application. The write operation does not complete until both the cache and database are updated.

In practice, this requires a cache implementation that supports write-through, like a caching library with a data store plugin. When you write to the cache, the library handles calling your database write logic before acknowledging the write. Redis itself does not natively support write-through, so you need application code or a framework to implement this pattern.

![[Pasted image 20260707180812.png]]

The tradeoff is slower writes because the application must wait for both the cache update and the database write to complete. Write-through can also pollute the cache with data that may never be read again.

Write-through still suffers from the dual-write problem. If the cache update succeeds but the database write fails, or vice versa, the systems can end up inconsistent. You need retry logic, error handling, or eventually accept that perfect consistency is difficult without distributed transactions.

In system design interviews, write-through is less common than cache-aside because it requires specialized caching infrastructure and still has consistency edge cases.

Use this when ==**reads must always return fresh data**== and your system can tolerate slightly slower writes.

### Write-Behind (Write-Back) Caching

With write-behind caching, the application writes only to the cache. The cache batches and writes the data to the database asynchronously in the background.

![[Pasted image 20260707181022.png]]

This makes writes very fast, but introduces risk. If the cache crashes before flushing, you can lose data. This is best for workloads where occasional data loss is acceptable.

==Use this when **you need high write throughput** and **eventual consistency is acceptable**.== Common in analytics and metrics pipelines.

## Cache Eviction Policies

Caches have limited memory, so they need a strategy for deciding which entries to remove when full. These strategies are called eviction policies.

### TTL (Time To Live) (Always use this no matter what)

TTL is not an eviction policy by itself. Instead, it sets an expiration time for each key and removes entries that are too old. It is often combined with LRU or LFU to balance freshness and memory usage.

TTL is a must have when data must eventually refresh, like API responses or session tokens.

### LRU (Least Recently Used)

LRU evicts the item that has not been accessed for the longest time. It tracks access order using a linked list or ring buffer so the least recently used item can be removed in constant time.

It is the default in many systems because it adapts well to most workloads where recently used data is likely to be used again.

### LFU (Least Frequently Used)

LFU evicts the item that has been accessed the least. It maintains a counter for each key and removes the one with the lowest frequency. Some implementations use approximate LFU to avoid the cost of precise frequency tracking.

Since you're preparing for **system design interviews**, don't just memorize _"LFU evicts the least frequently used item."_ The interviewer wants to know **why it exists, what problem it solves, and where it is actually useful.**

#### Why is frequency useful?

Imagine a news website.

Millions of users repeatedly request

```
/top-news
```

while

```
/article/987654
```

is opened once every few hours.

Requests:

```
Top News        -> 2,000,000 requests
Article 987654 -> 5 requests
```

Which one should stay cached?

Obviously

```
Top News
```

because removing it would generate enormous database traffic.

LFU naturally keeps it.

---

#### Example

Capacity = 3

Requests

```
A
B
C
A
A
B
D
```

Frequency table

```
A = 3
B = 2
C = 1
```

Need to insert D.

LFU removes

```
C
```

because

```
Frequency = 1
```

Cache becomes

```
A
B
D
```

---

#### Compare with LRU

Consider

```
Capacity = 3

A
B
C

Access sequence

A
A
A
...
A      (1000 times)

Then

B
C

Insert D
```

Current state

```
A frequency = 1000
B frequency = 1
C frequency = 1
```

But recent accesses were

```
B
C
```

LRU thinks

```
A hasn't been used recently.

Evict A.
```

That is terrible.

The most popular item gets removed.

LFU instead says

```
A is extremely valuable.

Remove B or C.
```

This is exactly why LFU exists.

---

#### When is LFU better than LRU?

LFU shines when **historical popularity matters more than immediate recency.**

Examples:

#### CDN

```
Bootstrap CSS
React bundle
Company logo
```

These files are requested continuously every day.

Frequency matters.

---

#### API Gateway or for CDN cached public 

Popular endpoints

```
/products
/categories
/home
```

are requested constantly.

Keep these cached.

---

#### Recommendation Service

Popular recommendation results

```
Top movies
Trending products
Popular playlists
```

are requested repeatedly.

LFU works well.

---

#### Machine Learning Feature Cache

Some features are used in almost every inference.

Keep them.

---

#### When is LFU bad?

Suppose yesterday everyone searched

```
World Cup Final
```

Frequency

```
World Cup = 20 million
```

Today nobody searches it.

Instead everyone searches

```
Olympics
```

LFU still keeps

```
World Cup
```

because

```
Frequency = 20 million
```

even though it is now useless.

This is called **cache pollution**.

Old popular items remain forever.

---

#### Another problem

Imagine

```
A = accessed 10,000 times last month
```

Now

```
A
```

is never requested again.

Frequency stays

```
10,000
```

A new item

```
B
```

gets

```
100 requests
```

Still

```
A survives
```

because

```
10000 > 100
```

This makes LFU slow to adapt to changing workloads.

---

#### How real systems fix this

Most production caches don't use a naive LFU implementation.

Instead they use techniques such as:

#### Frequency decay (aging)

Every so often:

```
Frequency = Frequency / 2
```

Example

Before

```
A = 1000
B = 200
C = 50
```

After decay

```
A = 500
B = 100
C = 25
```

Items must continue receiving requests to keep high counts. Otherwise their frequency naturally falls over time.

---

#### Approximate LFU

Instead of exact counts, systems maintain lightweight approximate counters (for example, probabilistic counting) to reduce memory and CPU overhead while still identifying frequently accessed items.

---

#### TinyLFU (Modern approach)

Many modern caches use **TinyLFU**, which keeps approximate frequency statistics and combines them with recency-based admission or eviction. This often achieves a better balance between adapting to changing access patterns and preserving genuinely popular items.

#### LRU vs LFU

|Feature|LRU|LFU|
|---|---|---|
|Tracks|Recent access|Total access frequency|
|Best for|Rapidly changing access patterns|Stable, long-term popularity|
|Adapts quickly|✅|❌ (unless frequency decay is used)|
|Prevents stale "hot" items|✅|❌ (without aging/decay)|
|Implementation complexity|Simpler|More complex|

#### Rule of thumb

- Use **LRU** when **recent activity predicts future access** (for example, users revisiting recently viewed pages or session data).
    
- Use **LFU** when **long-term popularity predicts future access** (for example, CDN assets, popular API responses, or frequently used reference data).
    
- In many high-performance production systems, **TinyLFU** or hybrid policies are preferred because they combine the strengths of both recency and frequency while mitigating their weaknesses.

This works well when certain keys are consistently popular over time, like trending videos or top playlists.

### FIFO (First In First Out) (Best Not to Use this so IGNORE)

## Common Caching Problems

### Cache Stampede (Thundering Herd)

A cache stampede happens **when a popular cache entry expires and many requests try to rebuild it at the same time.** **There is a brief window, even if only a second, where every request misses the cache and goes straight to the database. Instead of one query, you suddenly have hundreds or thousands, which can overload the database.**

![[Pasted image 20260707190943.png]]

For example, imagine your system caches the homepage feed with a TTL of 60 seconds. When the cache expires at exactly 12:01:00, every request at that moment misses the cache and queries the database. If traffic is high, this spike can overwhelm the database and cause cascading failures.

How to handle it:

- **Request coalescing (single flight):** Allow only one request to rebuild the cache while others wait for the result. This is the most effective solution.
- **Cache warming:** Refresh popular keys proactively before they expire. This only helps when using TTL-based expiration. If you invalidate cache on writes instead, warming does not prevent stampedes.

### Cache Consistency (Stale data)

There is no perfect solution. You choose a strategy based on how fresh the data must be.

How to handle it:

- **Cache invalidation on writes:** Delete the cache entry after updating the database so it gets repopulated with fresh data.
- **Short TTLs for stale tolerance:** Let slightly stale data live temporarily if eventual consistency is acceptable.
- **Accept eventual consistency:** For feeds, metrics, and analytics, a short delay is usually fine.

### Hot Keys

A hot key is a cache entry that receives a huge amount of traffic compared to everything else. Even if the cache hit rate is high, a single hot key can overload one cache node or one Redis shard and become a bottleneck.

For example, if you are building Twitter and everyone is viewing Taylor Swift’s profile, the cache key for her user data (user:taylorswift) may receive millions of requests per second. That one key can overload a single Redis node even though everything is working “correctly.”

How to handle it:

- **Replicate hot keys:** Store the same value on multiple cache nodes and load balance reads across them.
- **Add a local fallback cache:** Keep extremely hot values in-process to avoid pounding Redis.

## Caching in System Design Interviews

### How to Introduce Caching

Once you've established the need for caching, walk through your caching strategy systematically:

**1. Identify the bottleneck**

Start by pointing to the specific problem caching will solve. Is it database load? Query latency? Expensive computations? Be specific about what's slow and why.

"User profile queries are hitting the database 500 times per second during peak hours. Each query takes 30ms. That's our bottleneck."

**2. Decide what to cache**

Not everything should be cached. Focus on data that is read frequently, doesn't change often, and is expensive to fetch or compute.

"We'll cache user profiles since they're read on every page load but only updated when users edit their settings. We'll also cache the trending posts feed since it's computed from expensive aggregations but only needs to refresh every minute."

Think about cache keys. How will you look up cached data? For user profiles, the key might be user:123:profile. For trending posts, it could be trending:posts:global.

**3. Choose your cache architecture**

Pick a caching pattern that matches your consistency requirements. Write-through makes sense when you need strong consistency. Write-behind works for high-volume writes where you can tolerate some risk.

"I'll use cache-aside. On a read, we check Redis first. If it's there, return it. If not, query the database, store the result in Redis, and return it."

If you're dealing with static content like images or videos, mention CDN caching. If you have extremely hot keys that get hammered, mention in-process caching as an optimization layer.

**4. Set an eviction policy**

Explain how you'll manage cache size. LRU is the safe default answer. TTL is essential for preventing stale data.

"We'll use LRU eviction with Redis and set a TTL of 10 minutes on user profiles. That keeps the cache from growing unbounded while ensuring profiles don't get too stale. If a user updates their profile, we'll invalidate the cache entry immediately."

**5. Address the downsides**

Caching introduces complexity. Show you've thought about the trade-offs.

Cache invalidation: How do you keep cached data fresh? Do you invalidate on writes, rely on TTL, or accept eventual consistency?

"When a user updates their profile, we'll delete the cache entry so the next read fetches fresh data from the database."

Cache failures: What happens if Redis goes down? Will your database get crushed by the sudden traffic spike?

"If Redis is unavailable, requests will fall back to the database. We'll add circuit breakers so we don't overwhelm the database with a stampede. We might also consider keeping a small in-process cache as a last-resort layer."

Thundering herd: What happens when a popular cache entry expires and 1000 requests try to refetch it simultaneously?

"For extremely popular keys, we can use probabilistic early expiration or request coalescing so only one request fetches from the database while others wait for that result."