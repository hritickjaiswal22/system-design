# Functional Requirements

1. Users should be able to visit original url destination after redirection via short url
2. Users should be able to create short url for long url
3. Users should be able to update the destination or terget url later

# Non - Functional Requirements

1. Must have low latency (300 - 400 ms)
2. Must support massive read loads
3. Must be highly available and eventual consistency acceptable

### Assumptions

1. Read:Write ratio is 200:1
2. There is no expiration period

# Entity Design

url_mappings 

users

# API Design

POST /mapping {
url
} -> short code or shortened url

GET /mapping/{short_code} -> 301 redirection to target url

PUT /mapping/{map_id} {
target_url
}

# High Level Design
![[1787479346646.jpg]]

### Read Path

1. Users request goes to CDN first 
2. If a match or result is found the desired url is returned else
3. If result is a miss then the request from the client goes to API gateway
4. The api gateway does basic auth checks, middleware gating , rate limiting and route the request to appropriate service
5. The read service checks for result in the cache if hit then result is returned otherwise db is queried
6. The result is then returned to the user with redirection and status code of 301 or 308
7. While the above process is happening async or in parallel for analytics keep a count of visits, unique visits , etc and after a threshold is reached (say 100 or 500) reset the count and send a analytic event in Kafka for async processing the count can be stored in cache itself 

### Write Path

1. User's request goes to API gateway
2.  The api gateway does basic auth checks, middleware gating , rate limiting and route the request to write service
3. The write service updates the DB and if required invalidates the cache as well CDN if required 
4. Returns the result

# Deep Dives

### Scaling Reads and Writes

1. For scaling writes both DB and redis will be sharded 
2. For scaling reads CDN is used which will cut down reads loads for popular and regional requests by massive amounts
3. For further scaling reads each shard of cache and DB will follow leader and multiple replica architecture 
4. For low latencies sync would be done in async fashion

### Short Code generation

For generating short code depending on the shard , each shard will be assigned a range of valid counts (in range of millions) and each shard is hence provisioned with a range of valid counts (which will be converted to short alphanumeric code) and when that range is exhausted the service will request the short code allocation service for new range and since range allocation is done in millions this service will not face high traffic and will also have a separate DB for range tracking

### For analytics 

Both the CDN and read service will keep a track of the visits for a url or short code and upon a certain threshold is reached an analytical event is streamed to Kafka for async processing and analytics

### Trade-offs

1. System is eventually consistent 