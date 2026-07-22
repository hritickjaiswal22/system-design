v2

# Functional Requirements

1. Users should be able to query products available according to their locations **==(only return items which are in stock)==**
2. Users should be able to order multiple items at the same time

	For this problem, the emphasis is on aggregating availability of items across local distribution centers and allowing users to place orders without double booking. In other problems you may be more concerned with the product catalog, search functionality, etc.
# Non-Functional Requirements

1. Low latency for fetching the available products 
2. Ordering should be strongly consistent: two customers should not be able to purchase the same physical product.
3. System should be able to support 10k DCs and 100k items in the catalog across DCs.
4. Order volume will be O(10m orders/day)

# Defining the Core Entities

users 
products
distribution_centers
orders
order_items
inventory

# API Design

GET /products?lat={val}&long={val}&limit={val}&page_no={val}

POST /orders
{
lat
long
items 
}

# High level design

### 1) Customers should be able to query availability of items

We have:

1. **Availability Service** handles requests from our users for availability given a specific location.
2. **Nearby Service** syncs with the database of nearby DCs and uses an external "Travel Time Service" to calculate travel times from DCs (potentially including traffic).
3. **Inventory Table** a replicated SQL database table which returns the inventory available for each item and DC.
![[Pasted image 20260721151719.png]]

When a user makes a request to get availability for items A, B, and C from latitude X and longitude Y, here's what happens:

1. We make a request to the **Availability Service** with the user's location X and Y and any relevant filters.
2. The availability service fires a request to the **Nearby Service** with the user's location X and Y.
3. The nearby service returns us a list of DCs that can deliver to our location.
4. With the DCs available, the availability service query our database with those DC IDs.
5. We sum up the results and return them to our client.

### 2) Customers should be able to order items.

The last thing we need to complete our requirements is for us to enable placing orders. For this, we require _strong consistency_ to make sure two users aren't ordering the same item. To do this we need to check inventory, record the order, and update the inventory together atomically.

The solution is

By putting both orders and inventory in the same database, we can take advantage of the ACID properties of our Postgres database. Using a singular transaction with isolation level SERIALIZABLE we can ensure that the entire transaction is atomic. This means that if two users try to order the same item at the same time, one of them will be rejected. This is because the transaction will fail to commit if the inventory is not available.

![[Pasted image 20260721153357.png]]

For an order, the process looks like this:

1. The user makes a request to the **Orders Service** to place an order for items A, B, and C.
2. The **Orders Service** makes creates a singular transaction which we submit to our Postgres leader. This transaction: a. Checks the inventory for items A, B, and C > 0. b. If any of the items are out of stock, the transaction fails. c. If all items are in stock, the transaction records the order and updates the status for inventory items A, B, and C to "ordered". d. A new row is created in the Orders table (and OrderItems table) recording the order for A, B, and C. e. The transaction is committed.
3. If the transaction succeeds, we return the order to the user.

There are some downsides to this setup. In particular, if any of the items become unavailable in the users order the entire order fails. We'll want to return a more meaningful error message to the user in this case, but this is preferable to succeeding in an order that might not make sense (e.g. a device and its battery).

Thus high level design becomes

![[Pasted image 20260721153258.png|645]]

# Deep Dives

## Make availability lookups fast and scalable

#### 1. Query Inventory through cache

Two types of data caching here 

1. Cache of nearby DCs (this can be cache with long TTL since dc address will almost never change)
2. Available DCs after filtering from above with very short TTL

![[Pasted image 20260721155233.png]]


#### 2. Postgres Read replicas and partitioning

Since we only ever read inventory from a nearby collection of DC’s, we can group them together with a region ID using the first 3 digits of their zipcode. Then we can partition our inventory based on this region IDs. This means all queries will go to mostly 1 or 2 partitions rather than the entire inventory dataset.

![[Pasted image 20260721155714.png]]

Thus combined architecture

![[Pasted image 20260721155742.png]]


# Reviews for v1

https://claude.ai/chat/abb5fda6-bf7c-4974-8ba2-57ee51b4a2e2

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a5ef8fa-cbf4-83e8-980f-22d29901d984

# Learnings

1. ==**Which subsystem is the interviewer actually interested in? (don't assume you're designing the entire company)**==
2. **Try converting adjectives into numbers for NFRs.** (Instead of Low latency say Read latency <100 ms, Instead of Highly scalable say 10M orders/day; 100k concurrent users; 1B objects)
3. **==WHENEVER RETURNING A LIST IT MUST BE PAGINATED==**
4. **Start thinking of your answers in terms of services**
5. **==After data modeling think, identify and decide which service/s will use them==**
6. **==From now on whenever solving a design question from somewhere first and foremost write your functional requirements and then simply check the functional requirements from that place write their comparison somewhere and then solve for the frs of that site only==**
7. **Now do not do Data Modeling but rather "Defining the Core Entities"**

# Mistakes of v1

1. NFR for low latency reads for availability missing 
2. **==Data model wrong for Products and Inventory there should 2 separate tables==** 