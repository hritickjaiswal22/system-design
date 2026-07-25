#v1  
# My Functional Requirements

1. Users should be able view all the events available 
2. Users should be able to see available seats for an event with status updating in real time
3. Users should be able to book tickets consistently i.e. No double booking 

# Functional Requirements

1. Users should be able to view events
2. Users should be able to search for events
3. Users should be able to book tickets to events

# My Non-Functional Requirements 

1. Real time updates of seats
2. Consistent bookings i.e. no double bookings
3. Low latency for event catalog and search

# Non-Functional Requirements

1. The system should prioritize availability for searching & viewing events, but should prioritize consistency for booking events (no double booking)
2. The system should be scalable and able to handle high throughput in the form of popular events (10 million users, one event)
3. The system should have low latency search (< 500ms)
4. The system is read heavy, and thus needs to be able to support high read throughput (100:1)

###### Comparison - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a64209c-411c-83ee-8192-6c5a69572e46

# Identify core entities

1. events 
2. seats
3. users

# API Design

GET /events -> {
id
name
}

GET /events/:eventId -> {
...event details,
...seats available
}

GET /search?searchText={val} -> {
...events
}

POST /book
body {
eventId
userId
}

# High level Design

![[1784955867350.jpg]]

##### Read path

1. Client requests 
2. If the data is available in CDN it is served 
3. Otherwise hit the api gateway
4. Then gets routed to the appropriate read service
5. Cache redis gets hit and if match then returned 
6. If miss then the db layer is hit

For managing massive reads CDNs are used, redis with cluster configuration is used following master-replicas architecture and if a cache miss then the db layer is hit which for which data is sharded and also follows master-replicas architecture for async replication is used.
For low latency and scalable search ElasticSearch is used

##### Write Path (Booking)

1. Client request 
2. The request hits the api gateway and gets routed to booking service
3. The booking service checks if the seat is available or not in redis if available then puts a lock for a configurable interval (say 8 mins) in which the user needs to book and complete payment while any other user trying to book the same seat is failed 
4. If successful then the cache and db both are updated as confirmed and booked and if failed the lock is released and cache is updated as available for other users (a transaction is to be used to make sure the operation is atomic and consistent)
5. The DB makes use of queries like "UPDATE ... WHERE status='available'" for seats and "SELECT ... FOR UPDATE" where ever necessary 

# Notes

For scaling reads CDN, Distributed sharded Cache and Sharded DB with async replication  and multiple read replicas are used and since the TTL for such events is kept till the day of events as to improve hit ratios

And for writes cache through architecture is used for not blocking competing users in conjunction with transaction updates to maintain consistent system and failing any request via locks with TTL


# Reviews

https://claude.ai/chat/a4ec48d1-a43a-43a9-9b37-f75822a1c45d

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a64469d-5de0-83ee-b281-59961d0c5190