This layer is dominated by the ==**IP protocol**==, which is responsible for routing and addressing.

If I want to, I can create a private network with my servers and give them any IP address I want, **==but if you want internet traffic to be able to find them you'll need to use IP addresses that are routable and allocated by a [RIR](https://en.wikipedia.org/wiki/Regional_Internet_Registry)==**.

These assigned IP addresses are called [public IPs](https://en.wikipedia.org/wiki/Public_IP_address) and are used to identify devices on the internet

# Core responsibilities of the Network Layer (Layer 3) down to their absolute essentials

### 1. Handling IP Addressing (Logical Addressing)
### 2. Finding the Optimized Path (Routing) - Look at how [[Load Balancers]] route traffic once it hits a data center.
### 3. Packetization - The Network Layer takes the data segment it receives from the [[Transport Layer (Layer 4)]] and wraps it in a header containing the source and destination IP addresses. It turns the data into a **==Packet==**.


Reference - https://gemini.google.com/app/84d77563aabd943d (Not imp from interview perspective)