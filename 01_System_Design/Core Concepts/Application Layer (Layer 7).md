# HTTP/HTTPS: The Web's Foundation

Hypertext Transfer Protocol (HTTP) is the de-facto standard for data communication on the web. ==**It's a request-response protocol where clients send requests to servers, and servers respond with the requested data.**==

**==HTTP is a stateless protocol, meaning that each request is independent and the server doesn't need to maintain any information about previous requests. This is generally a good thing.==**

Few key concepts:

1. **Request methods**: GET, POST, PUT, DELETE, etc.
2. **Status codes**: 200 OK, 404 Not Found, 500 Server Error, etc.
3. **Headers**: Metadata about the request or response
4. **Body**: The actual content being transferred

This layer interacts directly with software applications. In system design, our primary focus here is how services talk to clients and how backend microservices talk to each other.

## Core API Architectural Styles:

While HTTP can be used directly to build _websites_, oftentimes system designs are concerned with the communication between _services_ via APIs. For creating these APIs, we have three main paradigms: REST, GraphQL, and gRPC.

**The mental model**
![[api_style_decision_tree_v2.png]]

* **[[API - REST]]**: The industry standard for public-facing CRUD web services utilizing standard HTTP methods.
* **[[API - GraphQL]]**: A query-language approach optimized for complex, client-driven data requirements (prevents over-fetching).
* **[[API - gRPC]]**: A high-performance, low-latency framework utilizing HTTP/2 and Protocol Buffers, ideal for internal microservice-to-microservice communication.