## Improved Workflow

### 1. Solve the problem yourself (V1)

Don't look at the reference.

Timebox it (45–60 minutes).

---

### 2. Compare with the reference solution

Instead of asking:

> "What did I miss?"

Ask:

> **"Why did they introduce this component?"**

This shifts your focus from architecture to reasoning.

---

### 3. Extract the reusable pattern

Don't write:

> Missed precomputed feed.

Write something like:

|Pattern|Trigger|Solves|Trade-offs|Seen in|
|---|---|---|---|---|
|Precomputed Feed|Read-heavy feed with acceptable write amplification|Reduces read latency|Higher write cost, storage, invalidation complexity|Facebook, Instagram, LinkedIn|

Notice that **"Precomputed Feed"** is now a reusable design pattern, not a Facebook-specific trick.

---

### 4. Categorize the pattern

This is the one thing I'd add.

Create sections like:

```
Read-heavy Patterns
```

- Cache Aside
    
- Read Replicas
    
- CDN
    
- Precomputed Views
    
- Fan-out on Write
    

---

```
Write-heavy Patterns
```

- Fan-out on Read
    
- Kafka
    
- Batching
    
- Idempotency
    

---

```
Hotspot Problems
```

- Consistent Hashing
    
- Key Salting
    
- Sharding
    
- Load Shedding
    

---

```
Real-time Systems
```

- WebSockets
    
- SSE
    
- Presence Service
    
- Pub/Sub
    

---

```
Storage Patterns
```

- Blob Storage
    
- Object Metadata
    
- Chunking
    
- Content Addressing
    

After 20–30 problems, you'll realize the same patterns appear repeatedly.

---

### 5. Review before every new problem (2–5 minutes)

Exactly as you said.

Not to memorize solutions.

To prime your brain with questions like:

- Is this read-heavy?
    
- Is this write-heavy?
    
- Is there a hotspot?
    
- Can something be precomputed?
    
- Is this asynchronous?
    
- Do I need ordering?
    
- Can I cache this?
    
- Will this bottleneck on storage or CPU?
    

You'll naturally start asking these during the interview.

---

## One more habit I'd strongly recommend

At the end of every problem, answer this question:

> **"If the interviewer asked me to optimize one bottleneck, what are the top 3 directions I'd explore?"**

For Facebook News Feed, your answer might be:

1. Optimize reads → Cache, precompute feeds, fan-out on write.
    
2. Optimize writes → Fan-out on read, async processing with Kafka.
    
3. Handle celebrities → Hybrid fan-out.
    

This trains you to think like an interviewer, because deep dives almost always begin with a prompt like:

> "Your design works. Now reads are too slow. How would you improve it?"

---

## This will fit your preparation style well

Since you're already documenting your system design learnings in Obsidian, I'd keep a separate note called something like **System Design Pattern Notebook**.

Instead of organizing it by problems ("FB News Feed", "Dropbox", "Uber"), organize it by **reusable patterns**. That's much more valuable because interviewers don't care whether you've memorized Facebook's architecture—they care whether you can recognize that a new problem is **read-heavy**, **write-heavy**, **latency-sensitive**, or **hotspot-prone** and choose appropriate design patterns.

If you consistently do this for the next 20–30 interview questions, you'll likely notice a shift: you'll stop remembering solutions and start recognizing the workload characteristics that trigger the right optimizations. That's the transition from learning individual designs to thinking like a system designer.