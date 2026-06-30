### When GraphQL earns its keep

**1. Multiple client types needing different data shapes**

This is the canonical GraphQL win. Your mobile app needs `user.name + user.avatar`. Your web app needs `user.name + user.posts + user.followers.count`. Your TV app needs `user.name + user.watchHistory`. With REST you'd either over-fetch (return everything to everyone) or proliferate custom endpoints. GraphQL lets each client declare exactly what it needs in a single query.

**2. Deeply nested, relational data graphs**

If your product's data looks like: `User → Posts → Comments → Reactions → Users`, and frontend needs to traverse that graph in various ways, GraphQL's resolver model is a natural fit. Facebook built it for exactly this reason — social graphs are deeply relational.

**3. Rapid frontend iteration without backend coordination**

Frontend team can add a new field to their query and get it immediately (assuming it's in the schema), without filing a ticket for a new REST endpoint. This dramatically reduces the "waiting for backend" problem at fast-moving companies.

**4. GraphQL as a BFF aggregation layer**

The most mature production use: you have 5 REST microservices internally, and you put a GraphQL gateway in front that stitches them together for clients. Clients make one GraphQL query; the gateway fans out to the right services. Netflix, Airbnb, and GitHub all do this pattern.

---

### When GraphQL will hurt you — and this is the interview-critical part

**Problem 1: The N+1 query disaster**

This is the most dangerous GraphQL pitfall. Say you have:

graphql

```graphql
query {
  users {        # 1 query to fetch 100 users
    posts {      # 100 queries — one per user!
      title
    }
  }
}
```

That's 101 DB queries. With REST, you'd batch this. With GraphQL, each resolver fires independently. The fix is DataLoader — but you have to know you need it, implement it correctly, and handle edge cases around cache invalidation. If your team isn't ready for this, you'll ship a query that brings your DB to its knees.

**Problem 2: HTTP caching is broken by default**

REST's killer feature is that every resource has a URL, which is a natural cache key. CDNs, browsers, and service workers all cache by URL. GraphQL typically sends queries as POST requests to a single `/graphql` endpoint — which CDNs don't cache. You can use persisted queries (turn queries into GET requests with a hash), but that adds a whole layer of tooling. If you're designing a high-traffic, read-heavy system in an interview and you reach for GraphQL, you need to explain how you'll handle caching — or it's a red flag.

**Problem 3: Security is non-trivial**

A malicious client can send this to your GraphQL endpoint:

graphql

```graphql
{
  users {
    friends {
      friends {
        friends {
          friends { name }  # exponential DB hits
        }
      }
    }
  }
}
```

This is a denial-of-service attack via query complexity. You need query depth limiting, query complexity analysis, introspection disabled in production, and rate limiting based on complexity score — not just request count. With REST, rate limiting per endpoint is trivial.

**Problem 4: File uploads are awkward**

GraphQL has no native file upload mechanism. `multipart/form-data` doesn't fit the JSON-centric model. Libraries like `graphql-upload` bolt it on, but it's messy. REST + presigned S3 URLs is always the right answer here.

**Problem 5: It's overkill for simple CRUD**

If your app is `POST /users`, `GET /users/:id`, `PUT /users/:id` — you don't need GraphQL. The schema definition, resolver wiring, DataLoader setup, and Apollo/Relay client configuration adds real complexity for zero benefit over REST.

### The production pattern you'll see at most mature companies

```
Mobile / Web Clients
        │
        ▼
  [GraphQL Gateway / BFF]  ← stitches data, handles auth, one endpoint for clients
   /          |          \
  ▼           ▼           ▼
[User      [Posts      [Notifications
 Service]   Service]    Service]
  │gRPC       │gRPC        │gRPC
  ▼           ▼            ▼
[User DB]  [Posts DB]  [Notif DB]
```

GraphQL is the client-facing aggregation layer. gRPC is the internal communication fabric. REST might exist for public webhook callbacks or third-party integrations.

---

### What to say in your interview

When the interviewer asks "REST or GraphQL?", the L4/L5 answer is not one or the other — it's:

> "For the client-facing API, GraphQL makes sense here because we have mobile and web clients needing different data shapes from the same graph, and we'll be iterating quickly. I'll put a GraphQL gateway in front. Internally, services will communicate via gRPC for latency and type safety. I'll implement DataLoader to solve the N+1 problem and use persisted queries with a CDN for the read-heavy paths."

That answer demonstrates you know all three tools, their trade-offs, and how they compose together — which is exactly what L4/L5 judgment looks like.