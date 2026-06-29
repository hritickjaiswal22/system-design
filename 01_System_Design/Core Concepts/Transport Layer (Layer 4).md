The transport layer is responsible for reliability, ordering, and flow control on top of the network layer.

The three primary protocols at this layer are **==TCP, UDP, and QUIC==**.For most system design interviews, the real choice you'll be faced with is ==**between TCP and UDP**.==

# User Datagram Protocol (UDP) : Fast but Unreliable

User Datagram Protocol (UDP) is the machinegun of protocols. It offers few features on top of IP but is very fast. **Spray and pray** is the right way to think about this. **==It provides a simpler, connectionless service with no guarantees of delivery, ordering, or duplicate protection.==**

If you write an application that receives UDP datagrams, you'll be able to see where they came from (i.e. the source IP address and port) and where they're going (i.e. the destination IP address and port). But that's it! The rest is a binary blob.

#### Key characteristics of UDP include:

1. ==**Connectionless**: No handshake or connection setup==
2. ==**No guarantee of delivery**: Packets may be lost without notification==
3. ==**No ordering**: Packets may arrive in a different order than sent==
4. ==**Lower latency**: Less overhead means faster transmission==

No setup sounds great but 2 and 3 kinda suck, so why would you want to use UDP?

**==UDP is perfect for applications where speed is more important than reliability, such as live video streaming, online gaming, VoIP, and DNS lookups.==** In these cases the application or client is equipped to handle the occasional packet loss or out of order packet.

# Transmission Control Protocol (TCP) : Reliable but with Overhead

Transmission Control Protocol (TCP) is the workhorse of the internet. **It provides reliable, ordered, and error-checked delivery of data.** **It establishes a connection through a three-way handshake** (we saw this illustrated above with the HTTP example) and maintains that connection throughout the communication session.

This connection is called a "stream" and is a **stateful connection** between the client and server — it also gives us a basis to talk about ordering: two messages sent in the same stream/connection will arrive in the same order. TCP will ensure that recipients of messages acknowledge their receipt and, if they don't, will retransmit the message until it is acknowledged.

#### Key Characteristics of TCP

1. ==**Connection-oriented**: Establishes a dedicated connection before data transfer==
2. ==**Reliable delivery**: Guarantees that data arrives in order and without errors==
3. **Flow control**: Prevents overwhelming receivers with too much data
4. **Congestion control**: Adapts to network congestion to prevent collapse

TCP is ideal for applications where data integrity is critical — that is, **basically everything where UDP is not a good fit**.

# When to Choose Each Protocol

In system design interviews, most interviewers will expect you're using TCP by default — it often doesn't need to be directly mentioned. That's good because that's also our recommendation!

You might choose **UDP** when:

- Low latency is critical (real-time applications, gaming)
- Some data loss is acceptable (media streaming)
- You're handling high-volume telemetry or logs where occasional loss is acceptable
- You don't need to support web browsers (or you have an alternative for that client)

==Note : Modern applications often use both protocols. For example, a web-based video conferencing app might use TCP/HTTP for signaling and authentication but UDP/WebRTC for the actual audio/video streams.==

# TCP vs UDP Comparison

![[Pasted image 20260629120910.png]]