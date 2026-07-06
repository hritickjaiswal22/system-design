Since you're preparing for **system design interviews**, don't think of WebSockets as just another protocol. Think of them as **a long-lived TCP connection that allows both the client and server to send data to each other at any time.**

This is one of the most frequently used technologies in modern system design problems like:

- Chat applications (WhatsApp, Slack)
    
- Live notifications
    
- Stock market dashboards
    
- Multiplayer games
    
- Collaborative editors (Google Docs)
    
- Live sports scores
    
- Video conferencing signaling
    

Let's build the concept from the ground up.

---

# 1. The Problem with HTTP

HTTP follows a **request-response** model.

```
Browser                Server
   | ---- Request ----> |
   | <--- Response ---- |
```

After the response:

- Connection closes (HTTP/1.0)
    
- Or is kept alive for reuse (HTTP/1.1 Keep-Alive)
    

But **the server still cannot send data whenever it wants.**

For example:

```
New chat message arrives

Server:
"I want to tell the browser."

Browser:
"You can't.
Wait until I send another request."
```

This is inefficient for real-time applications.

---

# 2. Older Solutions Before WebSockets

### Polling

Every few seconds:

```
Browser
   |
GET /messages
   |
Server

(wait)

GET /messages

(wait)

GET /messages
```

Problems:

- Many useless requests
    
- High latency
    
- Waste of CPU
    
- Waste of bandwidth
    

---

### Long Polling

Browser sends request.

```
Browser ------------>

Server
(wait...)

New message arrives

Server -----------> Response

Browser immediately sends another request
```

Better than polling.

Still:

- New HTTP request every message
    
- HTTP headers every request
    
- Doesn't scale well
    

---

# 3. WebSocket Idea

Instead:

```
Browser
     |
     | Upgrade connection
     |
Server

Connection stays open forever.
```

Now either side can send messages.

```
Browser <===================> Server
```

This is called **full-duplex communication**.

Meaning:

- client → server
    
- server → client
    

at the same time.

---

# 4. Initial Handshake

A WebSocket connection **starts as a normal HTTP request**.

Browser sends:

```http
GET /chat HTTP/1.1

Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: abc123...
Sec-WebSocket-Version: 13
```

Notice

```
Upgrade: websocket
```

Browser is asking:

> "Can we stop speaking HTTP and switch to WebSocket?"

---

Server replies

```http
HTTP/1.1 101 Switching Protocols

Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: xyz...
```

101 means

```
Switching Protocols
```

After this

HTTP disappears completely.

Now both sides exchange WebSocket frames instead of HTTP messages.

---

# 5. After Upgrade

Instead of

```
GET

POST

PUT

DELETE
```

we now exchange frames.

Example

Browser

```
"Hello"
```

Server

```
"Hi!"
```

Browser

```
"How are you?"
```

Server

```
"I'm good."
```

No HTTP headers.

No repeated TCP handshake.

No repeated requests.

Just tiny messages.

---

# 6. Architecture

```
          TCP Connection

Browser ========================= Server

        WebSocket Frames
```

Connection remains open for:

- minutes
    
- hours
    
- sometimes days
    

---

# 7. Life Cycle

```
Client opens page

        │
        ▼

HTTP Request

        │

Upgrade Request

        │

101 Switching Protocols

        │

WebSocket Established

        │

Client sends

        │

Server sends

        │

Client sends

        │

Server sends

        │

Close Frame

        │

Connection Closed
```

---

# 8. Why Is It Fast?

Suppose a chat message is only

```
Hello
```

With HTTP

```
Headers (~600 bytes)

+

Payload (5 bytes)
```

Every message carries HTTP overhead.

With WebSocket

```
Frame Header (2-14 bytes)

+

Payload (5 bytes)
```

Huge reduction in overhead.

---

# 9. Real Example

Imagine WhatsApp.

Alice sends

```
Hi Bob
```

Without WebSockets:

```
Bob's phone asks

Any messages?

No.

Any messages?

No.

Any messages?

No.

Any messages?

Yes.
```

Latency depends on polling interval.

---

With WebSockets

```
Alice

↓

Server

↓

Immediately pushes

↓

Bob
```

Almost instant.

---

# 10. Multiple Clients

```
          Chat Server

        /     |      \
       /      |       \

 Alice   Bob   Charlie
```

Each user has one WebSocket connection.

```
Alice  =======>

Bob    =======>

Charlie ======>
```

Each connection stays alive.

---

# 11. Server Internally

Most WebSocket servers maintain something like:

```
User ID

↓

Socket
```

Example

```
123 -> Socket A

456 -> Socket B

789 -> Socket C
```

When user 123 sends

```
Hi
```

Server simply finds

```
456 -> Socket B
```

and writes

```
Hi
```

directly to Bob.

---

# 12. Heartbeats

Connections can silently die because of:

- Wi-Fi loss
    
- Mobile network changes
    
- NAT timeout
    
- Firewall timeout
    

So WebSockets use **Ping** and **Pong** frames.

Server

```
PING
```

Client

```
PONG
```

If no reply:

```
Connection considered dead.
```

---

# 13. Why Load Balancers Matter

Suppose you have three WebSocket servers.

```
          Load Balancer

         /     |      \

      WS1     WS2     WS3
```

Alice connects.

```
LB → WS2
```

Now Alice's connection **must remain on WS2** for its lifetime. Unlike ordinary HTTP requests, you can't route later WebSocket frames to another server because the TCP connection already exists.

This is why WebSocket deployments typically require **sticky routing** (session affinity), often implemented using consistent hashing (e.g., client IP or another stable key) or another affinity mechanism.

---

## System Design Takeaways

For L4/L5 interviews, remember these key points:

- **WebSocket starts as an HTTP request**, then upgrades the connection with a `101 Switching Protocols` response.
    
- It runs over **a single long-lived TCP connection**.
    
- It supports **full-duplex** communication, so client and server can both send data at any time.
    
- Messages are exchanged as lightweight **WebSocket frames**, avoiding repeated HTTP overhead.
    
- Each connected client occupies server resources (memory, file descriptors, etc.), so capacity planning is important.
    
- At scale, use **sticky routing** so a client's connection stays on the same WebSocket server.
    
- When you have multiple WebSocket servers, use a **message broker** like Kafka or RabbitMQ to distribute events across servers before they push updates to their connected clients.
    

==**So every websocket message is Binary frame headers(very small in size in comparison to http headers) + payload (can be text + binary data i.e. original content type)**==

==This is one of the main reasons WebSockets are efficient for real-time communication: after the one-time HTTP Upgrade handshake, each message carries only a tiny framing overhead instead of repeating full HTTP headers. This reduces bandwidth usage and processing overhead, especially when sending many small messages.==

Ok so one of the things that make WebSockets efficient is long lived persisted connection thus every request does not need establishing TCP connection + 3 way initial handshake 

But long lived tcp connection is also achievable by HTTP1.1 long live so why not ...

Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a4b3b51-6898-83ee-8aaf-dbb717132aba

**WebSocket and HTTP/1.1 Keep-Alive both reuse the same TCP connection, avoiding repeated TCP handshakes. The key difference is that HTTP remains a request-response protocol, while WebSocket upgrades the connection into a full-duplex message stream. This allows either the client or server to send messages at any time with very small frame overhead, making WebSockets ideal for low-latency real-time applications like chat, multiplayer games, and live collaboration.**

This distinction—**persistent TCP connection** vs. **persistent bidirectional communication channel**—is the fundamental reason WebSockets exist.

**So even with HTTP1.1 long-live the request response model of HTTP is still there but with WebScokets that becomes bidirectional anyone can message anytime**

Why stateful 

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7/c/6a4b4914-1b28-83e8-bc0b-84aff4ec9ca6

Why WebSockets are more difficult to scale in comparison to SSE

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a4b6486-7b3c-83ee-896d-be3f650d1ea9