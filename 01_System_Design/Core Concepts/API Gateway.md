An API Gateway serves ==**as a single entry point for all client requests, managing and routing them to appropriate backend services**.== Just as a hotel front desk handles check-ins, room assignments, and guest requests, an ==**API Gateway manages centralized middleware like authentication, routing, and request handling.**==

The evolution of API Gateways parallels the rise of microservices architecture. As monolithic applications were broken down into smaller, specialized services, the need for a centralized point of control became evident. Without an API Gateway, clients would need to know about and communicate with multiple services directly – imagine hotel guests having to track down individual staff members for each request.

# Core Responsibilities

The gateway's primary function is **request routing – determining which backend service should handle each incoming request**. But this isn't all they do.

Nowadays, API gateways are also used to handle cross-cutting concerns or **middleware like authentication, rate limiting, caching, SSL termination, and more.**

Incoming requests come into the API Gateway from clients, **usually via HTTP but they can be gRPC or any other protocol**. From there, the gateway will apply any middleware you've configured and then route the request to the appropriate backend service.

1. Request validation
2. API Gateway applies middleware (auth, rate limiting, etc.)
3. API Gateway routes the request to the appropriate backend service
4. Backend service processes the request and returns a response
5. API Gateway transforms the response and returns it to the client
6. Optionally cache the response for future requests

![[Pasted image 20260721141233.png]]

#### 1) Request Validation

Before doing anything else, the API Gateway checks if incoming requests are properly formatted and contain all the required information. This validation includes checking that the request URL is valid, required headers are present, and the request body (if any) matches the expected format.

This early validation is important because it helps catch obvious issues before they reach your backend services. For example, if a mobile app sends a malformed JSON payload or forgets to include a required API key, there's no point in routing that request further into your system. The gateway can quickly reject it and send back a helpful error message, saving your backend services from wasting time and resources on requests that were never going to succeed.

#### 2) Middleware

API Gateways can be configured to handle various middleware tasks. For example, you might want to:

- Authenticate requests using JWT tokens
- Limit request rates to prevent abuse
- Terminate SSL connections
- Log and monitor traffic
- Compress responses
- Handle CORS headers
- Whitelist/blacklist IPs
- Validate request sizes
- Handle response timeouts
- Version APIs
- Throttle traffic
- Integrate with service discovery

Of these, the most popular and relevant to system design interviews are **authentication, rate limiting, and ip whitelisting/blacklisting**. If you do opt to mention middleware, just make sure it's with a purpose and that you don't spend too much time here.

#### 3) Routing

The gateway maintains a routing table that maps incoming requests to backend services. This mapping is typically based on a combination of:

- URL paths (e.g., /users/* routes to the user service)
- HTTP methods (e.g., GET, POST, etc.)
- Query parameters
- Request headers

For example, a simple routing configuration might look like:

```
routes:
  - path: /users/*
    service: user-service
    port: 8080
  - path: /orders/*
    service: order-service
    port: 8081
  - path: /payments/*
    service: payment-service
    port: 8082
```

The gateway will quickly look up which backend service to send the request to based on the path, method, query parameters, and headers and send the request onward accordingly.

#### 4) Backend Communication

While most services communicate via HTTP, in some cases your backend services might use a different protocol like gRPC for internal communication. When this happens, the API Gateway can handle translating between protocols, though this is relatively uncommon in practice.

The gateway would, thus, transform the request into the appropriate protocol before sending it to the backend service. This is nice because it allows your services to use whatever protocol or format is most efficient without clients needing to know about it.

#### 5) Response Transformation

The gateway will transform the response from the backend service into the format requested by the client. This transformation layer allows your internal services to use whatever protocol or format is most efficient, while presenting a clean, consistent API to clients.

For example:

```
// Client sends a HTTP GET request
GET /users/123/profile

// API Gateway transforms this into an internal gRPC call
userService.getProfile({ userId: "123" })

// Gateway transforms the gRPC response into JSON and returns it to the client over HTTP
{
  "userId": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 6) Caching

Before sending the response back to the client, the gateway can optionally cache the response. This is useful for frequently accessed data that doesn't change often and, importantly, is not user specific. If your expectation is that a given API request will return the same result for a given input, caching it makes sense.

The API Gateway can implement various caching strategies too. For example:

1. **Full Response Caching**: Cache entire responses for frequently accessed endpoints
2. **Partial Caching**: Cache specific parts of responses that change infrequently
3. **Cache Invalidation**: Use TTL or event-based invalidation

In each case, you can either cache the response in memory or in a distributed cache like Redis.

# Scaling an API Gateway

### Horizontal Scaling

The most straightforward approach to handling increased load is horizontal scaling. API Gateways are typically stateless, making them ideal candidates for horizontal scaling. You can add more gateway instances behind a load balancer to distribute incoming requests.

## When to Propose an API Gateway

The TLDR is: use it when you have a microservices architecture and don't use it when you have a simple client-server architecture.

With a microservices architecture, an API Gateway becomes almost essential. Without one, clients would need to know about and communicate with multiple services directly, leading to tighter coupling and more complex client code. The gateway provides a clean separation between your internal service architecture and your external API surface.