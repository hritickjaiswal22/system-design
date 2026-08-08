#v2

# Functional Requirements

1. Users should be able to search for events
2. Users should be able to view event details (performers, dates, etc)
3. Users should be able to buy tickets and book seats

# Non-Functional Requirements

1. The ticket booking should be highly consistent (no double booking) 
2. The system should provide low latency reads (300 - 500ms)
3. The system should support massive read loads (300 - 400 million DAU)
4. The system should support sub-second or low latency searches (200 - 400 ms)

# Core Entities

1. users
2. events
3. tickets
4. bookings

# API Design

GET /events -> Paginated list of events 

GET /events/:id -> Event details for that event id 

GET /search?searchText={val}&sort={val}&limit={val}...

-> Paginated result for search query

POST /book {
eventId
tickets : Array of ticketIds
} -> For booking


# High Level Design

![[1786193535504.jpg]]
# Notes

## Booking flow

1. User selects tickets and click buy
2. The request reaches API gateway (request input validation, auth token checks, rate-limiting, etc) ; request gets routed to booking service
3. The booking service obtains (if applicable then tries to) acquire lock for those tickets for a given TTL (lets say 10 mins)
4. If lock acquired then the booking service updates those tickets with 'in-progress' status and creates a booking with those ticket ids and also status pending in DB and booking id is sent back to client
5. The client on receiving booking id redirects the user payment page; where user enter payment details and the client uses payment processor/provider's SDK to send the payment details to payment processor/provider (NOT our backend)
6. The payment processor/provider sends back id or token to the client; which the client sends to the booking service 
7. The booking service validates the id/token sent by the client then updates the db status from in-progress to reserved in a transaction for both tickets and booking table and then creates payment intent for payment processor/provider
8. The payment processor/provider does the transaction (network/bank) and calls the appropriate webhook according to result(success , failure)
9. The booking service then upon receiving the webhook from payment processor/provider updates the db accordingly to success or failure or available
10.  The webhook must be idempotent in nature because payment processor/provider might send the webhook multiple times
11. If the webhook is not received or payment not completed the lock will expire post expiry period and ticket status is reverted to available
12. There should also be a re-consilation process/service for refund or proper updates
13. And DB operations should be carried out necessary atomic checks and correct WHERE conditions

For massive popular events or extreme booking load spikes normal horizontal scaling would not be able to handle the extreme surge in load and could lead to cascading failures along with huge cost implication therefore for such events Virtual Queues are to be used to provide user and traffic/load management.

Use of distributed lock with ACID transactions along with virtual queues ensures high consistency even for load spikes or highly contented resources.

## Events or Event Details read flow

1. Users makes the request for info
2. First the request is made to CDN; If hit the requested details or info is sent 
3. If not the the request is sent to API gateway
4. API gateway redirects requests to events service
5. The events service queries the cache (redis cluster with  shards which scales read by making use of  leader - multiple replica architecture with async syncing)
6. If cache hit all details are sent immediately if miss 
7. The request goes to DB layer which also follows sharding + leader - multiple replica architecture and sends the requested data to service
8. The service then updates the cache (async from client's request) and returns the response to user

## User search flow

1. Users makes the request for info
2. First the request is made to CDN; If hit the requested details or info is sent 
3. If not the the request is sent to API gateway
4. API gateway redirects requests to search service
5. The search service then queries ElasticSearch 
6. ElasticSearch responds with the result is sent to client
7. ElasticSearch's queries is indexed or pre-computed by making use of CDC tool  which upon WAL updates then the updates are pushed to an async queue/broker (Kafka) 
8. Consumer groups consume the tasks and index the ElasticSearch accordingly 
9. ElasticSearch is also used for caching queries to provide low latency results

By making of CDNs + Sharding + Async Read Replicas massive read loads are handled 
CDN + ElasticSearch + Caching allows for providing highly available and low latency searches 
Distributed locks + ACID Transactions + Idempotent tokens/keys + Virtual Queues allow for highly consistent booking even under extreme loads

https://claude.ai/chat/a4ec48d1-a43a-43a9-9b37-f75822a1c45d

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a64469d-5de0-83ee-b281-59961d0c5190

# Mistakes of v1

1. ==**(Repeated) NO pagination on search again**==
2. Mixing NFRs with FRs
3. Missing Payment service entirely
4. Missing payment flow
5. Transaction across one db and other in memory db (plain stupid)

# Learning

1. For search and endpoints returning scroll able data use pagination and filters
2. **How will the system ensure a good user experience during high-demand events with millions simultaneously booking tickets? - Virtual Waiting Queues**
3. **How can you speed up frequently repeated search queries and reduce load on our search infrastructure? - Elasticsearch has built-in caching capabilities that can be leveraged to store results of frequent queries**