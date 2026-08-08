---
type: Core Concept
status: Studying
tags:
  - system-design
  - core-concept
created:
updated:
---
# Virtual Waiting Room

> **Definition:**

A virtual waiting room is a **traffic management pattern** that controls access to a website or application during extreme demand spikes. Instead of letting all users hit the origin server at once—potentially crashing it—excess users are held in a queue and admitted gradually at a sustainable rate.

---

# ❓ What problem does it solve?
#### (max 3 bullets — if you need more, you don't understand it yet)

- **Should be used for handling huge spikes in user requests which cannot be absorbed via horizontal scaling** (Used when demand far exceeds the system’s sustainable throughput, even with auto-scaling—due to hard resource limits (database, inventory, external services) or cost constraints.)
- Prevents cascading failures or backend failure under extreme load while keeping users informed with a fair queue, rather than returning errors.
- Used when contention for limited throughput or inventory (e.g., ticket stock, appointment slots, or even the application’s own capacity) would otherwise overwhelm the system.

---

# 🎯 Interview Triggers (When should I think about this?)
#### (the phrase/requirement in a prompt that should make this fire in your head)

- **_Extreme, sudden traffic spike that cannot be absorbed by auto-scaling due to hard resource limits**._ (If the problem mentions that scaling is impossible or impractical—because the bottleneck is a database, a legacy system, a payment gateway, or limited inventory—then a waiting room should fire in your head.)
- **Flash sales**
- High demand for limited inventory,” “scarce resource,” “finite number of slots/items,” “first‑come, first‑served allocation of limited capacity.
- “High‑profile event registration”, “exclusive product drop.”,  “Prevent backend overload during a launch”, “Fair access / fair queuing for a limited resource”, 

---

# ⚙️ How does it work?
#### ⏱ Timebox: 15 min. Stop at "components + data flow." No protocol-spec / source-level depth on pass 1.

## High-Level Flow

1. **User requests the protected URL** (e.g., `/sale`).
2. **Edge (CDN) / reverse proxy** intercepts the request. If origin is overloaded, return a **waiting page**.
3. **Waiting page** calls a Queue Service to obtain a **queue token** and position.
4. **Polling loop**: The page periodically asks for status; queue position advances.
5. When the user’s turn arrives, the **Admission Controller** issues a **redirect** with a cryptographically signed admission token.
6. **Origin validates token** and lets the user proceed.

### Queue Storage

We need a highly concurrent, sorted data structure.

**Redis Sorted Set** is the classic choice:

- **Score**: arrival timestamp (millisecond precision, e.g., `Date.now()`).
    
- **Member**: a unique user/session identifier (UUID, cryptographically random).
    
- Use `ZADD queue <timestamp> <token>` to enqueue.
    
- Position = `ZRANK queue <token>` (0‑based).
    
- Admit the next batch: `ZPOPMIN queue <count>` to atomically remove and retrieve oldest entries.
    
- Redis’s single‑threaded nature guarantees ordering.

### Queue Token Generation

**Deduplication**: Use a deterministic “idempotency key” (e.g., hash of `sessionID + saleID`) so that refreshing the page doesn’t create a new queue entry.

### Admission Controller

- A **rate limiter** / token bucket determines how many users per second enter the origin.
    
- **Typical flow**:
    
    1. User polls `/status?token=...`.
        
    2. Server checks if `ZRANK` is below the “admitted cursor” (or if `admission_counter` has reached their position).
        
    3. If yes, generate a signed **admission token** (JWT or HMAC) containing the original queue token, timestamp, and origin‑allowed path.
        
    4. Redirect user to origin with the admission token as a query parameter or cookie.
        
- **Why sign?** Origin trusts that admission was granted by the waiting room, without a shared database call. The admission token has a short TTL (e.g., 30 seconds) and is one‑time use (origin tracks used nonces in a cache).
---
# ⚖️ Tradeoffs

| Gain                                                                                                                                          | Cost                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P**rotects origin from overload** – prevents crashes and cascading failures under massive spikes that horizontal scaling alone cannot absorb. | **Adds system complexity** – new components (queue store, admission controller, signed tokens), new failure modes, and integration with CDN/edge. |
| **Ensures fairness** – first‑come‑first‑served (or randomised) access to a limited resource, rather than “fastest bot wins.”                  | **Degrades user experience for those waiting** – forced delay, uncertainty, and possible abandonment.                                             |
| **Transparent expectation management** – users see queue position and estimated wait time instead of a broken error page or endless spinner.  | **Operational overhead** – the waiting room itself becomes a critical, high‑load system that must be monitored, scaled, and secured.              |

---

# 🔄 Alternatives

| Alternative                                               | When Better                                                                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Horizontal auto‑scaling + load shedding**               | Traffic spikes are moderate (2x–5x), predictable, and not constrained by a hard backend bottleneck (e.g., unlimited digital goods, API endpoints with no inventory limit). |
| **Rate limiting / Throttling (with 429s or error pages)** | You can accept that some users will receive a “try again later” message; the business doesn’t need to retain waiting users; inventory isn’t hyper‑scarce.                  |
|                                                           |                                                                                                                                                                            |

---

# 🛠 Design Decisions

#### (questions an interviewer will force you to answer if you bring this up)

Questions that need to be answered when using this concept.

- 
- 
- 
- 

---

# 🏗 Real World Usage

| System                                                             | Why Used?                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ticketmaster Smart Queue**                                       | Massive concurrent demand for concert and sports tickets. Without a queue, bots would win instantly, and the origin (ticketing engine, seat inventory) would crash under the flash crowd. Randomised entry and transparent wait times maintain perceived fairness.                                               |
| **Shopify (Flash Sales for brands like Kylie Cosmetics, Supreme)** | Limited‑edition product drops drive 100× normal traffic in seconds. The waiting room protects the checkout and payment systems (which have hard rate limits) and ensures real users, not just scripts, get a chance to buy. Used Redis Sorted Sets and Cloudflare Workers.                                       |
| **Queue‑it (third‑party SaaS)**                                    | A waiting‑room‑as‑a‑service used by retailers, governments, and universities. It handles the queue infrastructure, redirects admitted users, and offers bot protection and analytics. Organisations choose it when they lack in‑house expertise or have rare but critical events (e.g., visa appointment slots). |

---

# 🎤 Common Interview Questions

- [ ]
- [ ]
- [ ]
- [ ]

---

# ⚠️ Common Mistakes

- 
- 
- 

---

# 📝 Personal Notes

#### (anything you were tempted to rabbit-hole on, with a date. Only chase it if it recurs across 2+ problems.)
-

---

# ⚡ 30-Second Revision

### Purpose


### Interview Triggers

- ✓
- ✓
- ✓

### Key Tradeoffs

**Pros**
- 

**Cons**
- 

### Used In

- 
- 