https://www.youtube.com/watch?v=vccwdhfqIrI
https://www.hellointerview.com/learn/system-design/core-concepts/consistent-hashing

Those are exactly the two scenarios I'd focus on for **product/system design interviews**. However, they are not equally common.

|Use Case|Interview Frequency|Should you mention Consistent Hashing?|
|---|---|---|
|Database sharding|⭐⭐⭐⭐⭐ Very Common|**Yes**|
|Sticky routing in load balancers|⭐⭐⭐ Moderate|**Sometimes**|

Let's discuss each.

---

# 1. Database Sharding (Must Know)

This is where interviewers most expect you to know consistent hashing.

Suppose you're designing:

- Instagram
    
- WhatsApp
    
- Twitter/X
    
- Uber
    
- Slack
    
- GitHub
    

Eventually one PostgreSQL/MySQL instance isn't enough.

```
Users
        |
        v
+----------------+
| Sharding Layer |
+----------------+
      |
--------------------------
|       |       |        |
DB1     DB2     DB3     DB4
```

Now the interviewer asks:

> "Traffic doubled. We need another database."

A weak answer is:

```
userId % 4
```

because after adding a fifth shard:

```
userId % 5
```

almost every user changes shards.

That means migrating almost the entire database.

Instead:

```
Consistent Hash Ring

Shard1

Shard2

Shard3

Shard4
```

Add:

```
Shard5
```

Only roughly **1/(old shard count + 1)** of the data needs to move (assuming an even distribution with virtual nodes).

This is exactly why consistent hashing appears in distributed databases.

### What interviewers want to hear

After discussing horizontal scaling, you might say:

> "Initially I'd use hash-based sharding on `user_id`. As the cluster grows, I'd use consistent hashing with virtual nodes so that adding or removing shards only requires migrating a small portion of the data instead of rebalancing the entire dataset."

That's a strong SDE-2 answer.

---

# 2. Sticky Routing

This comes up less often, but it is still useful.

Imagine designing:

- Google Docs
    
- Figma
    
- WhatsApp Web
    
- Chat application
    
- Multiplayer game
    

A user establishes a WebSocket connection.

```
Client

↓

LB

↓

WS Server
```

After the connection is established, every packet must reach the same server.

The load balancer therefore needs a deterministic mapping.

Possible strategies include:

- Cookie affinity
    
- Session affinity
    
- IP hash
    
- Client ID hash
    
- Consistent hashing
    

If you have:

```
WS1
WS2
WS3
```

and later add

```
WS4
```

consistent hashing minimizes how many clients get remapped.

Without it:

```
hash(clientId) % N
```

changing `N` remaps almost every client.

With consistent hashing:

```
Only clients belonging to one section
of the ring move.
```

This reduces reconnect storms.

---

## When would I actually mention it?

Only if the interviewer asks something like:

> "How do we scale WebSocket servers?"

or

> "How do we maintain session affinity while scaling?"

Then you can say:

> "I'd use a load balancer that supports sticky sessions. If client-to-server mapping needs to remain stable as servers are added or removed, consistent hashing is a good routing strategy because it minimizes client reassignment."

---

# One Important Nuance

Don't force consistent hashing into every design.

For example, if you're designing:

- Netflix
    
- YouTube
    
- Amazon
    
- Uber
    

the interviewer asks:

> "How do requests reach API servers?"

The answer is usually:

```
DNS
↓

Load Balancer

↓

API Servers
```

using algorithms like:

- Round Robin
    
- Least Connections
    
- Least Response Time
    

There is **no need** for consistent hashing here because API servers are typically stateless, so any server can handle any request.

---

# My recommendation for SDE-2 (16–20 LPA)

Know these two patterns well:

### 1. Database sharding (mandatory)

Be able to explain:

- Why `hash(key) % N` fails when scaling.
    
- How consistent hashing reduces data migration.
    
- Why virtual nodes improve load balance.
    
- How resharding works when adding/removing shards.
    

### 2. Sticky routing (good to know)

Understand:

- Why WebSockets and other long-lived connections need affinity.
    
- How consistent hashing reduces remapping during scale-out.
    
- When simpler sticky-session mechanisms (cookies, IP hash) are sufficient.
    

If you can confidently explain these two applications and the trade-offs, you'll cover the vast majority of consistent hashing discussions in L4/L5 product design interviews.

Further reading - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a4b1a15-f2b4-83e8-bc97-3938a5bb891d