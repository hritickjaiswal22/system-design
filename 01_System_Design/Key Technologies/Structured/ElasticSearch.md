---
type: Key Technology
status: Studying
tags:
  - system-design
  - technology
created:
updated:
---

# ElasticSearch

> **What is it?**

Elasticsearch is primarily a search engine, not a general-purpose database.At its core, **Elasticsearch (ES) is a distributed, NoSQL document database built specifically for lightning-fast, full-text search.**

---

# ❓ What problems does it solve?
#### (max 3 bullets)

### The main problems it solves

**1. Full-text search**

User searches:

> `"wireless bluetooth headphones"`

You want to find products where those words appear in the name/description.

Elasticsearch is built specifically for this.

**2. Relevance ranking**

Not just:

> "Does this product contain the word `phone`?"

But:

> "Which products are **most relevant** to `iphone 15 case`?"

It can rank results based on things like term frequency, field importance, etc.

**3. Typo / fuzzy search**

User types:

```text
"iphnoe"
```

and you still want:

```text
iPhone
```

Elasticsearch supports fuzzy matching.

**4. Search + filtering at large scale**

Example:

> Search `"running shoes"`  
> → Nike  
> → under ₹5,000  
> → size 9  
> → available

Elasticsearch is very good at combining **text search + filters + sorting**.

### The important mental model

Don't think:

> **"Elasticsearch is a faster PostgreSQL." ❌**

Think:

> **"I have a huge amount of data and users need sophisticated search over it." ✅**

So in an interview:

```text
                    PostgreSQL
                 Source of Truth
                       │
                       │
                       ▼
                Elasticsearch
                 Search Index
                       │
                       ▼
                    Search
```

**Postgres answers:**

> "Give me user #123."

**Elasticsearch answers:**

> "Find the most relevant products matching `nike running shoes`, with filters and typo tolerance."

That's the actual problem it solves.

---

# 🎯 Interview Triggers (When should I use it?)

### The strongest interview trigger

If the interviewer says:

> **"Users need to search through millions of products/documents using keywords, with filters, ranking, typo tolerance, or autocomplete."**

Immediately think:

**→ Elasticsearch**

- Search by text
- Search with typos
- Rank results by relevance (Built-in relevance scoring)
- Search + multiple filters
- Search millions/billions of documents
- Search logs quickly

---

# 🚫 When should I NOT use it?

### Elasticsearch — When NOT to Use It

The easiest rule:

> **Don't use Elasticsearch just because you need fast queries or have a lot of data.**

-  Strongly consistent reads required (Reason - Search indexes can be eventually consistent)
- You don't need text search
- Payments / orders / balances (Reason - When Strict ACID Guarantees are Required do not use)
- High-Frequency Partial Updates (In Elasticsearch, documents are immutable. If a document has 50 fields and you update _one_ field (like incrementing `view_count`), Elasticsearch actually deletes the entire old document and indexes a completely new one under the hood. Doing this thousands of times a second will absolutely wreck your CPU and disk I/O.)
---

# 🧩 Core Features

#### (only ones you'd actually mention in an interview answer — not a spec sheet)

The same as problems it solves 

1 extra cool feature

| Feature           | Purpose                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Geospatial search | Find things based on location/distance. Example: **restaurants within 5 km** of the user or this landmark , etc. |
|                   |                                                                                                                  |

---

# ⚙️ High-Level Architecture - INTERVIEW DEPTH ONLY

⏱ Timebox: 15 min. Components + request flow only. No source/protocol-spec depth on pass 1.

ElasticSearch internally uses inverted indexes 

Inverted Indexes are mapping of keys (words or phrases or tokens) to list of document ids (ids of document which contain the key; besides the id it could also store frequency, position etc for optimizations and extra info)
![[Pasted image 20260808100548.png]]
![[Pasted image 20260808101153.png]]


#### 1. The Write Path (Source of Truth)

- **The Flow:** The client sends a request (e.g., "Create a new Kanban task"). The Application Server writes this directly to your primary database (e.g., PostgreSQL or MySQL).
    
- **Why:** You need the strict ACID guarantees of a relational database so you never lose a write.
    
- **SDE-2 Defense:** _Never_ write to the primary DB and Elasticsearch sequentially in your application code (e.g., `db.save(task); elastic.save(task);`). If the Elasticsearch write fails, your databases are instantly out of sync (a "dual-write" problem).
    

#### 2. The Sync Path (Change Data Capture)

- **The Flow:** As PostgreSQL commits the new task, it writes the change to its internal Write-Ahead Log (WAL). A Change Data Capture (CDC) tool (like **Debezium**) reads that log and publishes the change event to a Message Broker (like **Apache Kafka**).
    
- **Why:** This creates an asynchronous, highly reliable pipeline.
    
- **SDE-2 Defense:** If Elasticsearch goes down for an hour, no data is lost. The events simply queue up safely in Kafka. When Elasticsearch comes back online, a consumer service pulls the backlogged events from Kafka and updates the search index, ensuring **eventual consistency**.
    

#### 3. The Read Path (Search Execution)

- **The Flow:** When a user types "optimistic" into the search bar, the request hits your API. The API completely ignores PostgreSQL. It formats an Elasticsearch query, hits the ES cluster, and returns the results.
    
- **Why:** It protects your primary database from heavy, CPU-intensive read queries, preventing a spike in search traffic from taking down your core transactional system.

---

# 🔍 Internal Concepts That Actually Get Asked About

#### 1. Inverted Index ⭐⭐⭐

**Most important.**

This is the fundamental reason Elasticsearch is good at text search.

Instead of scanning every document:

```text
"iphone" → docs 1, 7, 23
"case"   → docs 1, 9, 23
```

So a query like:

```text
"iphone case"
```

can quickly identify matching documents.

**Interview trigger:**

> "Why is Elasticsearch better than a normal DB for full-text search?"

→ **Inverted index.**

---

#### 2. Sharding ⭐⭐⭐

Large indexes are split into shards.

```text
Products Index
      │
 ┌────┼────┐
 ▼    ▼    ▼
S1    S2    S3
```

This allows data/search workload to be distributed across machines.

**Interview trigger:**

> "What if we have billions of documents?"

→ **Shard the index across nodes.**

---

#### 3. Replication ⭐⭐⭐

Each primary shard can have replica shards.

```text
Primary Shard → Replica
```

Used primarily for:

- **High availability**
    
- **Failover**
    
- Additional search capacity
    

**Interview trigger:**

> "What happens if an Elasticsearch node dies?"

→ Replica shard can take over.

---

#### 4. Refresh / Eventual Consistency ⭐⭐

This is worth knowing because it explains why:

```text
PostgreSQL → Elasticsearch
```

isn't necessarily immediately consistent.

A document written to Elasticsearch isn't necessarily searchable **immediately**; Elasticsearch periodically refreshes its search view.

So:

```text
Write to DB
    ↓
CDC
    ↓
Elasticsearch
    ↓
Refresh
    ↓
Searchable
```

**Interview trigger:**

> "Can a newly created product immediately appear in search?"

→ Not necessarily; search indexing is typically **near-real-time**, not strictly immediately consistent.

---

#### 5. Query Fan-out + Result Merging ⭐⭐

When an index has multiple shards:

```text
                Query
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
       Shard1   Shard2   Shard3
         │        │        │
         └────────┼────────┘
                  ▼
             Merge results
                  ↓
             Final ranking
```

This explains how Elasticsearch searches distributed data.

**Interview trigger:**

> "How does Elasticsearch search across billions of documents?"

→ **Partition into shards → search shards in parallel → merge/rank results.**


---

# ⚖️ Tradeoffs

Gains are the features and problems it solves

Cons are 

1. **Eventual Consistency (The Sync Lag)** - Elasticsearch is not instantly consistent. When data is written to your primary SQL database, it takes time (via Kafka/CDC) to reach ES, and ES itself only refreshes its index every ~1 second by default.
2. **Expensive** - Running an ES cluster in production is highly expensive. It is often the most expensive piece of infrastructure in a startup's backend. (It requires a lot of RAM and extremely fast SSDs to perform well.)
3. **Severe Write Penalties (Immutability)** - High-frequency partial updates (like a live view counter or a stock ticker) will absolutely destroy your disk I/O and CPU because of constant re-indexing and background garbage collection (Segment Merging).

---

# 🔄 Alternatives

| Technology                                                                                                                                                                                | When Better                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL - Modern SQL databases actually have decent built-in text search capabilities. Postgres has `TSVector` for full-text search and `pg_trgm` (trigram indices) for fuzzy matching | When your dataset is small to medium (under a few million rows), and you want to avoid the operational nightmare of maintaining a separate Kafka CDC pipeline.                  |
| Algolia is a hosted Search-as-a-Service platform. You push JSON documents to their API, and they handle everything (UI components, typo tolerance, relevance).                            | When you want zero operational overhead, or if you have a frontend-heavy engineering team that wants to focus on building UI rather than managing distributed backend clusters. |

---
# 🏗 Real World Usage

#### (merges use cases + examples — one table, not two)

| System                                    | Why this tech fits?                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-Commerce Search & Faceted Filtering     | Uses the **Inverted Index** for sub-millisecond search across billions of SKUs. Uses **Aggregations** to instantly calculate the sidebar filters (e.g., "Brand (4)", "Price < $50 (89)") in the exact same network request as the search results. |
| Centralized Logging & Observability (ELK) | Apps generate billions of unstructured log lines daily. Uses **Logstash/Beats** to ingest them, stores them in time-based indices, and uses Kibana for engineers to instantly full-text search across logs during an outage.                      |
| Geospatial Matching                       | Needs to find entities (drivers, matches) within a certain radius. Uses native **Geo-point data types** and `geo_distance` bounding box queries to filter millions of coordinates instantly, which is notoriously slow in standard SQL.           |

---

# 🎤 Common Interview Questions

- [ ]
- [ ]
- [ ]
- [ ]

---

# 📝 Personal Notes

-

---

# ⚡ 30-Second Revision

### Purpose


### Interview Triggers

- ✓
- ✓
- ✓

### Core Features

-
-
-

### Key Tradeoffs

**Pros**
-

**Cons**
-

### Used In

-
-