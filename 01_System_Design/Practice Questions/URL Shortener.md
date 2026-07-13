v1

Assumptions
1. URL are stored indefinitely if change is required needs to be updated
2. **16 KB per original URL**
3. Only 1 to 1 mapping supported
4. In analytics assuming only 2 data points for time being unique visits, total visits


Functional Requirements
1. Create short urls against long urls
2. Get redirected to original url upon hitting the generated short url
3. Analytics
4. Should support not only support public resources but private as well which requires a password to be submitted along with the request

Non - Functional Requirements

1. Low Latency (300 - 400 ms)
2. High Availability (99.999% Uptime)
3. 500 million active short URLs

500 million urls = 16Kb * 500 million = 2^4 * 2^10 * 500 * 2^20 = 500 * 2^34 = 2^9 * 2^34 = 2^43 bytes

Assuming using only alphanumeric characters in short url stub 5 should be enough 

Core Entities

mappings {
id : UUID; (primary-key, unique, not-null)
original_url : TEXT; (unique,not-null)
short_url_stub: VARCHAR(6); (unique,not-null)
password?: TEXT; (nullable; only for private urls)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;
}

analytics {
id : UUID; (primary-key, unique, not-null)
map_id : UUID; (foreign-key, unique, not-null)
unique_visits: INT;
total_visits: INT;

index on map_id with (unique_visits,total_visits) as partial index
}

API design 

POST /map

{
original_url: string;
password?: string;
}

For public urls

GET /map?code=short_stub

For private urls

POST /private-map
{
password : string;
}

High level design
![[1783946778655.jpg]]

Read Path

Clients -> CDN (edge processing enabled and only for public resources) -HIT-> return response to client -MISS-> Origin (Hit or miss analytics via Kafka via flushing after periodic times) -> L7 load balancer -> Horizontally scaled servers -> Distributed Redis Cache with cluster config with master/follower patterns -> if hit return -> if miss request to origin server which is also sharded and follow leader/replica pattern

Write Path 

Same as read path except does not hit CDN goes straight to server from there to origin and redis invalidation 


All the analytics changes done on the server and async processing is used to update the origin servers while redis analytics data is invalidated immediately

Cons of the above design

1. Stale analytics data
2. Eventual consistency of analytics data