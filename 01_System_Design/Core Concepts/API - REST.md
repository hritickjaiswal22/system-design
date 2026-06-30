## The Core Mental Model

First, reframe the question. Don't ask _"which is best?"_ Ask: **"What is my primary constraint?"**

| Primary Constraint                                | Lean Toward |
| ------------------------------------------------- | ----------- |
| Cacheability & public exposure                    | **REST**    |
| Flexible querying, thin clients                   | GraphQL     |
| Raw throughput, internal services, streaming RPCs | gRPC        |

---

## When REST Is The Right Call

### 1. Your API is **public-facing or external**

This is the clearest signal. REST is the lingua franca of the web. External developers — partners, third-party integrators, mobile teams you don't control — expect REST. gRPC requires Protobuf tooling and generated stubs. GraphQL requires understanding schemas and query languages.

> If you're building a payment gateway, a public webhook API, or anything a developer needs to `curl` without reading a 20-page doc — **REST**.

---

### 2. **HTTP caching is a first-class concern**

This is something candidates consistently miss in interviews.

REST maps naturally onto HTTP semantics:

- `GET /articles/123` → cacheable at the CDN, browser, or reverse proxy level with zero extra work
- `ETag`, `Cache-Control`, `Last-Modified` headers all work out of the box

GraphQL kills this. Every query hits `POST /graphql`, which is **not cacheable** by default at the HTTP layer. You need persisted queries or a dedicated CDN config to work around it.

gRPC uses HTTP/2 framing that CDNs don't cache.

> If you're designing a read-heavy system (product catalog, news feed, static content delivery) where caching at the edge can cut 80% of your DB load — **REST gives you this for free**.

---

### 3. **Your resource model is simple and well-bounded**

REST shines when your data maps cleanly to resources with standard CRUD operations:

```
POST   /orders
GET    /orders/:id
PUT    /orders/:id
DELETE /orders/:id
```

No complex nested relationships. No "give me user + their posts + comments on each post + author of each comment" in one shot. When you need that, REST starts producing the over-fetching / N+1 problem that GraphQL was invented to solve.

But if your client just needs clean resource operations — **REST is the right level of complexity**.

---

### 4. **Your team or org needs debuggability and simplicity**

REST requests are human-readable JSON over HTTP. Any engineer can:

- `curl -X GET https://api.example.com/users/42`
- Open Chrome DevTools and inspect the request
- Write a Postman test in 30 seconds

gRPC requires `grpcurl` or generated client stubs. GraphQL requires understanding query structure and the schema.

> In high-growth startups where engineers rotate across teams and onboarding speed matters — the operational simplicity of REST is genuinely valuable. Don't dismiss this as a soft argument.

---

### 5. **You need stable, versionable contracts**

REST lets you version explicitly:

```
/v1/users/:id
/v2/users/:id
```

This is crude but reliable. You can deprecate `v1` gracefully, run both in parallel behind a router, and give clients a migration timeline.

GraphQL versioning is philosophically opposed to this (the philosophy is schema evolution, not versioning). gRPC versioning through Protobuf field numbers is elegant but requires discipline.

> For external APIs where you can't force clients to upgrade — **REST's explicit versioning is an operational advantage**.

---

## Where REST Will Hurt You (Know the Limits)

You need to defend REST's weaknesses in an interview too:

**Over-fetching:** `GET /users/42` returns 40 fields; your mobile app needs 3. You're burning bandwidth.

**Under-fetching / N+1:** To render a blog post page, you call `GET /posts/1`, then `GET /users/42` (author), then `GET /comments?postId=1` — three round trips. On mobile with high latency, this is painful.

**No real-time story:** REST is request-response only. If you need push notifications or live data, you're bolting on WebSockets or SSE separately. It's not inherent to the protocol.

**Lack of strict contracts:** Unlike gRPC's Protobuf, REST + JSON has no enforced schema at the transport layer. You need OpenAPI/Swagger to compensate, and even then it's documentation, not enforcement.

---

## The Interview Answer Pattern

When asked "REST vs GraphQL vs gRPC?" in an interview, here's the structure that signals seniority:

> _"I'd choose REST when the API is externally exposed and cacheability matters, the resource model is simple and CRUD-heavy, or I need broad client compatibility without tooling overhead. I'd move to GraphQL if clients have heterogeneous data needs and I want to avoid over-fetching — typically on a BFF layer. I'd use gRPC for internal service-to-service calls where I need low latency, strong contracts via Protobuf, and potentially bidirectional streaming."_

The key signal is that you're **choosing based on constraints**, not defaulting to one because it's familiar.