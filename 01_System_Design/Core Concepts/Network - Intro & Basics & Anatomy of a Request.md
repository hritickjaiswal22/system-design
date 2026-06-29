We'll start with the fundamentals of how networks operate, then examine key protocols at different layers of the networking stack. For each concept, we'll cover its purpose, how it works, and when to apply it in your system designs.

##### Note
Networking tends to be a stronger focus in infrastructure and distributed systems interviews. ==**For full-stack and product-focused roles, you'll likely only need a surface understanding of networking concepts.**== Understanding these fundamentals will help you make better decisions, ==**even if the minute details aren't going to be tested in your interviews.**==

# Networking 101

At its core, networking is about connecting devices and enabling them to communicate. **==Networks are built on a layered architecture (the so-called OSI Model==**) which greatly simplifies the world for us application developers who sit on top of it.

# Networking Layers

There are 7 layers in OSI model but from interview and application development only 3 are important

1. ==**Network Layer (Layer 3)**==
2. ==**Transport Layer (Layer 4)**==
3. ==**Application Layer (Layer 7)==**

![[Screenshot from 2026-06-29 07-12-15.png]]

###### [[Network Layer (Layer 3)]]

**==At this layer is IP, the protocol that handles routing and addressing. It's responsible for breaking the data into packets, handling packet forwarding between networks, and providing best-effort delivery to any destination IP address on the network.==**

###### [[Transport Layer (Layer 4)]]

At this layer, we have TCP, QUIC and UDP which provide end-to-end communication services. **==Think of them like a layer that provides features like reliability, ordering, and flow control on top of the network layer.==**

###### Application Layer (Layer 7)

At the final layer are the application protocols like DNS, HTTP, Websockets, WebRTC. These are common protocols that build on top of TCP (or UDP, in the case of WebRTC) to provide a layer of abstraction for different types of data typically associated with web applications.

# Example: A Simple Web Request

When you type a URL into your browser, ==**several layers of networking protocols spring into action**.== Let's break down how these layers work together to retrieve a simple web page over HTTP on TCP.

First, we use D to convert a human-readable domain name like hellointerview.com into an IP address like 32.42.52.62. Then, a series of carefully orchestrated steps begins. We set up a TCP connection over IP, send our HTTP request, get a response, and tear down the connection.

![[Screenshot from 2026-06-29 07-20-12.png]]

- **DNS Resolution**: The client starts by resolving the domain name of the website to an IP address using DNS (Domain Name System).

- ==**TCP Handshake**: The client initiates a TCP connection with the server using a three-way handshake:==
    - ==**SYN**: The client sends a SYN (synchronize) packet to the server to request a connection.==
    - ==**SYN-ACK**: The server responds with a SYN-ACK (synchronize-acknowledge) packet to acknowledge the request.==
    - ==**ACK**: The client sends an ACK (acknowledge) packet to establish the connection.==
    
- **HTTP Request**: Once the TCP connection is established, the client sends an HTTP GET request to the server to request the web page.

- **Server Processing**: The server processes the request, retrieves the requested web page, and prepares an HTTP response. **==(This is usually the only latency most SWE's think about and control!)==**

- **HTTP Response**: The server sends the HTTP response back to the client, which includes the requested web page content.

- **TCP Teardown**: After the data transfer is complete, the client and server close the TCP connection using a four-way handshake:
    - **FIN**: The client sends a FIN (finish) packet to the server to terminate the connection.
    - **ACK**: The server acknowledges the FIN packet with an ACK.
    - **FIN**: The server sends a FIN packet to the client to terminate its side of the connection.
    - **ACK**: The client acknowledges the server's FIN packet with an ACK.

Finally note that the connection between the client and server is a **state** that both the client and server must maintain. **Unless we use features like HTTP keep-alive or HTTP/2 multiplexing, we need to repeat this connection setup process for every request - a potentially significant overhead. This will become important for designing systems which need persistent connections, like those handling Realtime Updates.**