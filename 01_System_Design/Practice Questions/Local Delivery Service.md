v1
# Assumptions

1. Payments not covered as functional requirements (out of scope) assume COD model
2. Each order is fulfilled from a single DC. If no single DC has sufficient inventory, the requested quantity is unavailable.
3. For Inventory Service decide whether a DC can fulfill the order - Must satisfy all

# Functional Requirements

1. Customers should be able to query availability of items, deliverable in 1 hour, by location (i.e. the effective availability is the union of all inventory nearby DCs).
2. Customers should be able to order multiple items at the same time.

	For this problem, the emphasis is on aggregating availability of items across local distribution centers and allowing users to place orders without double booking. In other problems you may be more concerned with the product catalog, search functionality, etc.

# Non - Functional Requirements

1. Consistency > Availability (proper inventory management is more important than showing all products and getting orders)
2. Scalable (system should be able to handle massive orders in same locations with proper inventory management and consistency)
3. Low latency for viewing the available products and booking orders

# Data Model

users {
id;
location;
}

distribution_centers {
id;
location;

(index on location)
}

products {
id
name
distribution_center_id
quantity

(index on distribution_center_id)
(index on id,distribution_center_id)
}

enum ORDER_STATUS {
PENDING
SUCCESSFUL
FAILED
}

orders {
id
user_id
distribution_center_id
status : ORDER_STATUS

(index on user_id)
}

order_items {
id
order_id
distribution_center_id
product_id
quantity

(index on order_id)
(index on distribution_center_id)
}

# API Design

GET /products/:location

POST /orders
{
distribution_center_id
items : {
product_id,
quantity
}[]
}

# High Level Design

![[1784607597956.jpg]]


#### Products listing

1. Client requests for product list
2. The request hits the L7 load balancer; gets routed to one of the servers
3. The server calls the DC eligibility service to find the list of servers in proximity to the user (delivery under <1h)
4. The server then queries the DB layer for products for those distribution_center_ids
5. Returns the response

#### Order placement

1. Client Request for orders with the product_id , distribution_center_id and quantity
2. The request hits the L7 load balancer; gets routed to one of the servers
3. The server queries the DB layer and updates the required tables (products, orders and order_items) using row transactions and row-level locking
4. Returns the response of successful or failure 


# Reviews

https://claude.ai/chat/abb5fda6-bf7c-4974-8ba2-57ee51b4a2e2

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a5ef8fa-cbf4-83e8-980f-22d29901d984

# Learnings

1. ==**Which subsystem is the interviewer actually interested in? (don't assume you're designing the entire company)**==
2. **Try converting adjectives into numbers for NFRs.** (Instead of Low latency say Read latency <100 ms, Instead of Highly scalable say 10M orders/day; 100k concurrent users; 1B objects)
3. **==WHENEVER RETURNING A LIST IT MUST BE PAGINATED==**