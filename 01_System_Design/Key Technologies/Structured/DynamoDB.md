---
type: Key Technology
status: Studying
tags:
  - system-design
  - technology
created:
updated:
---

# DynamoDB

> **What is it?**


---

# ❓ What problems does it solve?
#### (max 3 bullets)


---

# 🎯 Interview Triggers (When should I use it?)


---

# 🚫 When should I NOT use it?


---

# 🧩 Core Features

#### (only ones you'd actually mention in an interview answer — not a spec sheet)

| Feature | Purpose |
|---------|---------|
| | |
| | |
| | |
| | |

---

# ⚙️ High-Level Architecture - INTERVIEW DEPTH ONLY

⏱ Timebox: 15 min. Components + request flow only. No source/protocol-spec depth on pass 1.
## Components

- 
- 
- 

## Request Flow

1.
2.
3.
4.
5.

### Diagram

```text

```

---

# 🔍 Internal Concepts That Actually Get Asked About

| Concept | Why It Matters |
|----------|----------------|
| | |
| | |
| | |
| | |

---

# ✅ Advantages

- 
- 
- 

---

# ❌ Limitations

- 
- 
- 

---

# ⚖️ Tradeoffs

| Gain | Cost |
|------|------|
| | |
| | |
| | |

---

# 🔄 Alternatives

| Technology | When Better |
|------------|-------------|
| | |
| | |
| | |

---
# 🏗 Real World Usage

#### (merges use cases + examples — one table, not two)

| System | Why this tech fits? |
| ------ | ------------------- |
|        |                     |
|        |                     |
|        |                     |

---

# 🎤 Common Interview Questions

- [ ]
- [ ]
- [ ]
- [ ]

---

# 📝 Personal Notes (Not for revision but for understanding)

DynamoDB features

- **Fully-Managed** - AWS handles it not open source
- **Highly Scalable** - DynamoDB can handle massive amounts of data and traffic. It automatically scales up or down to adjust to your application's needs, without any downtime or performance degradation.
- **Key-value** - It is a NoSQL database, it uses a key-value model that allows for flexible data storage and retrieval.

### The Data Model

DynamoDB has 

- **Tables** - Which represent collection of related data (just like SQL)
- **Items** - Data that is stored. Each item **must have a primary-key**.
- **Attributes** - The other data key-value pairs.

**Note - DynamoDB is a schemaless so it is flexible in terms of values it can store which has it pros (flexible, no migrations, pay only for what we store) and cons(our app needs to handle missing attributes, consistency issue)**

![[Pasted image 20260811072656.png]]

##### Partition Key and Sort Key

![[Pasted image 20260811095204.png]]

- **Partition Key** - A single attribute that, along with the sort key (if present), uniquely identifies each item in the table. DynamoDB uses the partition key's value to determine the physical location of the item within the database. This value is hashed to determine the partition where the item is stored.
    
- **Sort Key** (Optional) - An additional attribute that, when combined with the partition key, forms a composite primary key. The sort key is used to order items with the same partition key value, enabling efficient range queries and sorting within a partition.

Primary Key = Partition Key + Sort Key

So to answer your question directly:

> If Partition Key is used to identify the node an item is in then each item must have a unique id to identify with that index or node i.e. primary_key ???

No, you don’t need to invent a separate “primary_key” attribute. The partition key (along with the sort key if you have one) **is** the built‑in primary key that uniquely identifies each item. DynamoDB enforces that uniqueness automatically:

- If your table has only a partition key, that partition key must be unique per item.
    
- If your table has a partition key + sort key, the partition key can repeat, but the pair must be unique.
    

The hash of the partition key just tells DynamoDB _where_ to store the item physically. The uniqueness enforcement happens logically, regardless of which node holds the data.

In short: **the unique ID is already part of your key design**—you don’t add a separate one.

**But what is actually happening under the hood?**

DynamoDB uses a combination of hash-based partitioning and [B-trees](https://en.wikipedia.org/wiki/B-tree) to efficiently manage data distribution and retrieval:

**Hash Partitioning for Partition Keys:** The physical location of the data is determined by hashing the partition key. A request router consults a partition metadata service to map the hashed key to the correct storage node. This is conceptually similar to [consistent hashing](https://www.hellointerview.com/learn/system-design/deep-dives/consistent-hashing) but DynamoDB uses a centralized partition map and placement service rather than a peer-to-peer hash ring (as described in the original 2007 Dynamo paper). The partition metadata service also handles automatic splitting and merging of partitions as data grows.

**B-trees for Sort Keys:** Within each partition, DynamoDB organizes items in a B-tree data structure indexed by the sort key. This enables efficient range queries and sorted retrieval of data within a partition.

**Composite Key Operations:** When querying with both keys, DynamoDB first uses the partition key's hash to find the right node, then uses the sort key to traverse the B-tree and find the specific items.

This two-tier approach allows DynamoDB to achieve both horizontal scalability (through partitioning) and efficient querying within partitions (through B-tree indexing). It's this combination that enables DynamoDB to handle massive amounts of data while still providing fast, predictable performance for queries using both partition and sort keys.

##### Secondary Indexes

- **Local Secondary Index (LSI)** - **==An index with the same partition key as the table's primary key but a different sort key==**. LSIs enable range queries and sorting within a partition. Since LSIs use the same partition key as the base table, they are stored on the same physical partitions as the items they're indexing.
- **Global Secondary Index (GSI)** - An index with a partition key and optional sort key that differs from the table's partition key. GSIs allow you to query items based on attributes other than the table's partition key. Since GSIs use a different partition key, the data is stored on entirely different physical partitions from the base table and is replicated separately.

**But what is actually happening under the hood?**

Secondary indexes in DynamoDB are automatically maintained by the system. GSIs are implemented as separate internal tables, while LSIs are co-located with the base table:

1. **Global Secondary Indexes (GSIs):**
    
    - Each GSI is essentially a separate table with its own partition scheme.
    - When an item is added, updated, or deleted in the main table, DynamoDB asynchronously updates the GSI.
    - GSIs use the same hash partitioning mechanism as the main table, but with different partition and sort keys.
    - This allows for efficient querying on non-primary key attributes across all partitions.
2. **Local Secondary Indexes (LSIs):**
    
    - LSIs are co-located with the main table's partitions, sharing the same partition key.
    - They maintain a separate B-tree structure within each partition, indexed on the LSI's sort key.
    - Updates to LSIs are done synchronously with the main table updates. LSI reads support both eventually consistent (default) and strongly consistent reads, just like the base table.
3. **Index Maintenance:**
    
    - DynamoDB automatically propagates changes from the main table to all secondary indexes.
    - For GSIs, this propagation is asynchronous (eventually consistent). For LSIs, updates happen synchronously with the base table write.
    - The system manages the additional write capacity required for index updates.
4. **Query Processing:**
    
    - When a query uses a secondary index, DynamoDB routes the query to the appropriate index table (for GSIs) or index structure (for LSIs).
    - It then uses the index's partition and sort key mechanics to efficiently retrieve the requested data.

### CAP Theorem

DynamoDB supports two consistency models for read operations: eventual consistency and strong consistency. Importantly, this is **not** a table-level configuration -- you choose the consistency model on each individual read request by setting ConsistentRead=true in your GetItem, Query, or Scan calls.

**But what is actually happening under the hood?**

DynamoDB's consistency models are implemented through its distributed architecture and replication mechanisms:

**Eventually Consistent Reads (Default):**

- Reads can be served by any of the three replicas in the partition's replication group
- Since the leader replicates writes to followers asynchronously (after quorum acknowledgment), a follower might not have the very latest write yet
- Consumes less read capacity (0.5 RCU per 4KB) and provides lower latency

**Strongly Consistent Reads:**

- The read request is routed directly to the leader node for the partition
- Since all writes go through the leader first, it always has the most current data
- Consumes more read capacity (1 RCU per 4KB) and may have higher latency
- Not supported on Global Secondary Indexes (GSIs)

### Advanced Features

##### DAX (DynamoDB Accelerator)

Fun fact, DynamoDB has a purpose-built, in-memory cache called DynamoDB Accelerator (DAX). So there may be no need to introduce additional services (Redis, Memcached) into your architecture.

It needs to be configured (TTL, eviction policy , etc..)

##### Streams

Dynamo also has built-in support for **Change Data Capture (CDC)** through DynamoDB Streams. Streams capture changes to items in a table and make them available for processing in real-time. Any change event in a table, such as an insert, update, or delete operation, is recorded in the stream as a stream record to be consumed by downstream applications.

This can be used for a variety of use cases, such as triggering Lambda functions in response to changes in the database, maintaining a replica of the database in another system, or building real-time analytics applications.

### DynamoDB in an Interview

#####  Knowing its limitations

- **Cost Efficiency**: DynamoDB's pricing model is based on read and write operations plus stored data, which can get expensive with high-volume workloads. If you need hundreds of thousands of writes per second, the cost might outweigh the benefits.
    
- **Complex Query Patterns**: If your system requires complex queries, such as those needing joins or ad-hoc aggregations, DynamoDB might not cut it. DynamoDB does support transactions across multiple tables (up to 100 items per transaction), but it lacks the flexible querying capabilities of SQL databases.
    
- **Data Modeling Constraints**: DynamoDB demands careful data modeling to perform well, optimized for key-value and document structures. If you find yourself frequently using Global Secondary Indexes (GSIs) and Local Secondary Indexes (LSIs), a relational database like PostgreSQL might be a better fit.
    
- **Vendor Lock-in**: Choosing DynamoDB means locking into AWS. Many interviewers will want you to stay vendor-neutral, so you may need to consider open-source alternatives to avoid being tied down.

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