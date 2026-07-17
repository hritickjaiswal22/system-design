v1

# Assumptions

1. Public shares only with expiration

# Functional Requirements

1. Upload files and folders
2. Download files and folders
3. Share files and folders

# Non-Functional Requiremnts

1. Support large storage (4 - 6 Gbs)
2. Authentication 
3. Highly consistent (correct data stored) + durable

# Entity Design

users {
id: UUID; (primary-key, unique, snowflake style, not-null)
emailId: VARCHAR(100); ( unique, not-null)
}

enum UPLOAD_STATUS {
COMPLETE
PENDING
FAILED
}

metadata {
id: UUID; (primary-key, unique, snowflake style, not-null)
status: UPLOAD_STATUS; (default PENDING)
user_id : UUID; (not-null, foreign-key)
location: TEXT; (nullable, S3 location)
name: VARCHAR(256); (not-null)
format: VARCHAR(20); (not-null)
size: BIGINT; (not-null)
preview_url: TEXT(nullable)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;

[index on (user_id) field]
}

shares {
id: UUID; (primary-key, unique, snowflake style, not-null)
resource_id : UUID; (not-null, foreign-key)
resource_location: TEXT; (location url , denormalized)
expiry: BIGINT; (default to 3600; in seconds)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;
}

# API Design

POST /upload

body {
name : string;
size: string;
format: string;
}

GET /resource

For all the resources for that user_id extracted from JWT token in headers

POST /create-share

body {
resource_id : string;
expiry: number; (in seconds default an hour)
}

POST /share
body {
id : string;
}

# High-Level Design

![[1784272087492.jpg]]

### Read Path

1. Client requests goes to load balancer (L7 so that any checking requiring for the request type is possible, analytics)
2. Then gets routed to one the app servers
3. First Distributed Cache (Redis, clusters with leader-follower architecture) is hit if found then the metadata is returned (data is stored using Redis Hash data structure)
4. If cache miss, then the db layer (sharded) is hit
5. Response will contain metadata most important location_url 
6. Client will get the location_url for requested resource and can access it directly from S3

### Write Path

1. Client requests goes to load balancer (L7 so that any checking requiring for the request type is possible, analytics)
2. Then gets routed to one the app servers
3. DB and Redis is updated 
4. A signed url is generated with expiration depending on the file size and returned to client
5. Then client upon receiving signed url can upload files via file chunking allowing features (pause, resume, retry) and checksums for data integrity

### Share Path 

Same as Write path except id is shared which the owner which he/she with anyone else and that anyone can get the signed url and then access files.

# Notes

1. Use of signed url and S3 allow for higher scalability since our app servers won't be busy handling file uploads
2. Use of S3 allow for massive scale and load distribution and availability are handled by AWS which is excellent
3. Use of Kafka allows for compression and replication for cost effective durability
4. Use of chunking, chunk sequence numbers allow for resume, stop, retry and via checksums integrity is handled

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a59db5d-9604-83ee-ae9d-39eeb700095c