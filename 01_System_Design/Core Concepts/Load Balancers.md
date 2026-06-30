For scaling, we have two options: ==**bigger servers (vertical scaling) or more servers (horizontal scaling).**==

![[Pasted image 20260629201116.png]]

Employ vertical scaling wherever possible. Modern hardware is incredibly powerful.

That said, the reality for _interviews_ is that **the most common pattern for scaling you'll see is horizontal scaling**. **But just adding boxes to our whiteboard won't help ==if we don't tell our clients which server to talk to.==**

![[Pasted image 20260629201407.png]]

Enter: Load Balancing.

# Types of Load Balancing

1. Client-Side Load Balancing
2. Server-Side Load Balancing

# Client-Side Load Balancing

**==With client-side load balancing, the client itself decides which server to talk to. Usually this involves the client making a request to a service registry or directory which contains the list of available servers. Then the client makes a request to one of those servers directly. The client will need to periodically poll or be pushed updates when things change.==**

**==Client-side load balancing can be very fast and efficient. Since the client is making the decision, it can choose the fastest server without any additional latency. Instead of using a full network hop to get routed to the right server on every request, we only need to (periodically) sync our list of servers with the server registry.==**

## When to Use It

1. **==Internal microservice-to-microservice traffic at high RPC volume==** - When Service A calls Service B 50,000 times/sec, routing every call through a centralized LB adds a **network round-trip** on every single call. **At P99**, that adds up fast. Client-side LB eliminates that hop entirely — the client talks directly to the pod/instance.
2. gRPC / HTTP2 — This is the most critical case to know.
   This is where most engineers get tripped up. **==HTTP/2 multiplexes many logical requests over a single TCP connection==**. A traditional L4 server-side load balancer distributes load at the _connection_ level — so if your client opens one connection to the LB, every single gRPC call flows through the same backend. Your load balancer becomes a funnel, not a distributor.
   
   **The Problem: The "Single Pipe" Issue**
   
   **Regular HTTP (like REST APIs):**
   **Each request opens a new connection** 
   Server-side LB can easily split these across backends
   **Request 1 → Backend A, Request 2 → Backend B, Request 3 → Backend C ✅**
   
   **HTTP/2 & gRPC:**
   ==**Your client opens ONE connection and reuses it for everything**==
   1,000 gRPC calls all flow through that single connection
   Server-side LB says: "Okay, this connection goes to Backend A"
   ==**ALL 1,000 calls hit Backend A, Backend B sits idle ❌**==
   ![[Pasted image 20260629203409.png]]

## When NOT to Use It — and Why Each One is a Real Pain Point

1. ==**Any external/browser/mobile client**== - You simply cannot deploy LB logic into a browser. The client doesn't know your internal topology, can't hit Consul to fetch instance lists, can't perform health checks against your pod IPs. **==Always put a centralized LB at the edge.==**
2. **==Stateful routing / sticky sessions==** - **If you need a user's requests to always hit the same backend (common with WebSocket connections, in-memory game state, or session affinity), a centralized LB with a sticky cookie/IP hash is far simpler.** Client-side LB would require the client to remember which server it's "assigned to," which creates cascading complexity when that server goes down.
3. **==Polyglot microservice environments==** - If you have services in Go, Python, Node.js, and Java, you now need to implement, test, and maintain a load balancing client library in **every single language**. When your retry logic has a bug, you're patching four codebases. This is how you accumulate silent inconsistencies — the Go client does exponential backoff, the Python client doesn't.
4. **==You need centralized cross-cutting concerns==** - Rate limiting, WAF rules, SSL termination, request authentication, circuit breaking, logging/tracing — all of these are dramatically easier to implement once at a centralized point. With client-side LB, you have to push _all of this_ into every client. It's not impossible (service meshes like Istio do it via sidecars), but it's operationally heavy and easy to get wrong.
5. **==Canary releases or blue/green deployments==** - When you want to shift 5% of traffic to a new version, with server-side LB you change one config. With client-side LB, you need to update the routing weights in your service registry _and_ every client needs to re-fetch and honor that config. The propagation delay and lack of atomic control makes this fragile.

# Server-Side Load Balancing

We may not want our clients to have to refresh their list of servers or even know about the existence of multiple servers on the backend. Or we might have a large number of clients that we don't control but need to retrieve updates quickly.

In these cases, we'll use a dedicated load balancer: a server or hardware device that sits between the client and the backend servers and makes decisions about which server to send the request to.

![[Pasted image 20260630042104.png]]

**These load balancers can operate at different layers of the protocol stack and which you choose will depend, in part, on what your application needs.**

**Having a dedicated load balancer implies an additional hop in each request: first to the load balancer,** **then to the server which needs to serve the request.** But in exchange we get very fast updates to our list of servers and fine-grained control over how we route requests.

## Layer 4 (L4) Load Balancers

Layer 4 load balancers operate at the ==**transport layer (TCP/UDP)**==. They make routing decisions based on network information like **IP addresses and ports,** ==**without looking at the actual content of the packets**.==

![[Pasted image 20260630044532.png]]

Layer 4 load balancers have some key characteristics, they ...

- **==Maintain persistent TCP connections between client and server.==** i.e. Once a client establishes a network connection (such as a TCP handshake) through an L4 load balancer, that specific connection remains open, alive, and routed to the exact same backend server for as long as it is actively being used.
- **==Are fast and efficient due to minimal packet inspection.==**
- Cannot make routing decisions based on application data.
- **==Are typically used when raw performance is the priority.==**

### When to Use It

1. L4 load balancers are great for WebSocket connections and other protocols that **require persistent connections**.
2. They're also great for high-performance applications that don't require much application-level processing.
3. When you are working with non - HTTP protocols then also

If you're using websockets in your interview, you probably want to use an L4 load balancer. For everything else, a Layer 7 load balancer is probably a better fit.

Good reading - https://gemini.google.com/app/9e7bb687203cf73b

## Layer 7 (L7) Load Balancers

Layer 7 load balancers operate at the application layer, understanding protocols like HTTP. They can ==**examine the actual content of each request and make more intelligent routing decisions**==.

![[Pasted image 20260630051825.png]]

Layer 7 load balancers have some key characteristics, they ...

- **Terminate incoming connections and create new ones to backend servers.**
- **==Can route based on request content (URL, headers, cookies, etc.).==**
- **==More CPU-intensive due to packet inspection.==**
- **==Provide more flexibility and features.==**
- Better suited for HTTP-based traffic.

For example, an L7 load balancer could route all API requests to one set of servers while sending web page requests to another (providing similar functionality to an API Gateway), or it could ensure that all requests from a specific user go to the same server based on a cookie.

Good reading - https://gemini.google.com/app/441966b077835998

## Load Balancing Algorithms

![[Pasted image 20260630054104.png]]
![[Pasted image 20260630054206.png]]
![[Pasted image 20260630054306.png]]
