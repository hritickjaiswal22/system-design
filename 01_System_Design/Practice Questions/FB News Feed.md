#v1

# My Functional Requirements

1. Users should be able to see posts on news feed
2. Users should be able to create new posts
3. Users should be able to add comments and watch previous comments
4. Users should be able to like/unlike posts

# My Non-Functional Requirements

1. Low latency for reads (posts and comments) (<300 ms)
2. Highly available (>= 99.999)
3. Support massive read load (>= 1B DAU)

# Functional Requirements

1. Users should be able to create posts.
2. Users should be able to friend/follow people.
3. Users should be able to view a feed of posts from people they follow, _in reverse chronological order_ (newest first).
4. Users should be able to page through their feed.

# Non-Functional Requirements

1. The system should be highly available (prioritizing availability over consistency). We'll tolerate up to 1 minute of post staleness (eventual consistency).
2. Posting and viewing the feed should be fast, returning in < 500ms.
3. The system should be able to handle a massive number of users (2B).
4. Users should be able to follow an unlimited number of users, users should be able to be followed by an unlimited number of users.

Review - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a670750-ac70-83e8-93f5-9b4ebb9b15a8

# Core entities

users 
posts
followers

# API Design

GET /feed?cursor={val}&pageSize={val}

POST /posts
body {
userId
content - text or images
}

POST /follow
body {
userId
followeeId
}

# High Level Design

![[1785138858062.jpg]]

# Notes

1. The system makes use of CDN for serving static assets and utilizes edge computation and caching to deliver content or results closer to user geographically
2. If the content is not available in CDN the client requests the server
3. The request hits the API gateway (where Auth middleware checks, rate limiting etc) and then the request is routed to appropriate service
4. For feed the request hits the feed service which generates the feed , caches it aggressively (high TTL for like 30m or so) and then returns to user (caching to redis is done asynchronously to not block request path)
5. The feed service also in order to push updates to the client also creates a uni direction connection from server to client via SSE to push updates 
6. The feed service is paginated using cursor pagination for efficient and stable pagination
7. The follow service and post service are responsible for post type requests and updates the DB and then invalidates the cache 
8. The cache is sharded (redis has a cluster configuration) with master-read replicas architecture
9. The DB is also sharded with master-read replicas architecture
10. Syncing across read replicas is done asynchronously
11. For handling massive read loads caching via CDN, Cache and sharded DB with multiple read replicas is used and along with that on the client side Client Side Caching + Server state management is used along HTTP caching 
12. Optimized and compressed image formats are used 


For Deep Dive will need to discuss how to handle 

1. Massive high fan-out (i.e. a user with millions of followers how will their posts be populated in their follower's feed)
2. 