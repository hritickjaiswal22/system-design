v2

# Assumptions

1. Only file support no folder support
2. Versioning not in scope
3. Conflict resolution not in scope
4. Public shares only
5. Pub-sub for file syncs not in scope

# Functional Requirements

1. Users should be able to upload files
2. Users should be able to download files
3. Users should be able to share files 
4. Users should be able to sync files across multiple devices

# Non - Functional Requirements

1. Should support upload of large files (up to 50 Gbs)
2. Low latency (both upload and download)
3. Highly available (eventual consistency is acceptable)
4. Should support pause, resume and retry of uploads with progress tracking

# Data Modeling

users {
id: UUID; (primary-key, not-null, snowflake style, unique)
emailId: VARCHAR(100); (not-null,  unique)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;
}

enum UPLOAD_STATUS {
PENDING;
UPLOADED;
}

metadatas {
id: UUID; (primary-key, not-null, snowflake style, unique)
user_id: UUID; (not-null, foreign-key)
name: VARCHAR(256); (not-null)
size: BIGINT; (not-null, in bytes)
mime_type: VARCHAR(20); (not-null)
fingerprint: TEXT; (not-null, unique)
upload_status: UPLOAD_STATUS; (not-null, default to PENDING)
upload_id: TEXT; (unique, nullable since it will be provided by client which in turn will get from S3 after START UPLOAD request)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;

[index on (userId,upload_id) with (name, size, mime_type,status as partial index)]
[index on fingerprint with (name, size, mime_type,status as partial index)]
}

shares {
id: UUID; (primary-key, not-null, snowflake style, unique)
metadata_id: UUID; (not-null, foreign-key)
expiry_at: TIMESTAMPTZ;
user_id: UUID; (not-null, foreign-key, de-normalization for sharding)
created_at: TIMESTAMPTZ;
updated_at: TIMESTAMPTZ;

[index on metadata_id with (expiry_at as partial index)]
}

# API Design

POST /upload 
body {
name: string;
size: number;
mime_type: string;
fingerprint: string;
}
userId will be extracted from JWT from auth middleware

GET /download/:metadata_id

POST /share
body {
metadata_id: string;
expiration_duration: number; 
}

GET /share-download/:share_id

# High Level Design

![[1784434038668.jpg]]


# Notes

###### L7 load balancer is used since it looks at the content of requests and therefore if any redirection or analytics or future requirement is needed can be easily setup and L7 is generally preferred for HTTP requests

#### Write Path

1. The client makes request to the server for uploading the file with fingerprint, name, etc for POST upload
2. The request reaches the L7 load balancer and get routed to one of the app servers
3. The server creates an entry in db with upload_status "PENDING" and returns the S3 pre-signed_url with an expiry appropriate according to file size 
4. The client receives the pre-signed url and makes request to S3 and get's the upload_id 
5. Client uses that upload_id and requests the server for pre-signed urls for first few chunks (for uploading files S3 multipart upload will be used and therefore large files will be chunked and therefore per-signed urls for all the chunks are required but rather than generating pre-signed urls for all the  chunks at once it is done in progressive batches)
6. Upon receiving the pre-signed urls ; parallel upload is done for those chunks 
7. Whenever a chunk is successfully uploaded the S3 returns an ETag for that chunk number to the client and also stores a reference of chunk number and corresponding ETag for that upload_id
8. Above process is repeated till all the chunks are uploaded then the client requests the S3 to CompleteUpload and provides a chunk number and corresponding Etag list to S3 so that it can assemble and validate chunks are their upload if successful S3 combines and orders those separated chunks into a proper resource file
9. Upon success response the client requests the server to update the status to complete and therefore the server validates it with S3 and marks the status as complete
10. The S3 event notification is used to push the successful upload to Kafka as a queue so that compression, virus checks , replication, etc can be done asynchronously without blocking the User's request and improved UC
11. Use of fingerprint allows resuming uploads and checking same upload is being carried out
12. Use of chunking allows for progress tracking, pausing and resuming uploads 
13. ETag help with commiting uploads as successful and proper upload of individual chunks and even if client loses ETag-chunk number mapping the S3 has it and get a reference of it using upload_id
14. Since upload is directly done to S3 it allows for faster uploads as S3 is a dedicated managed service by AWS, the app servers are not occupied managing uploads rather listening to requests (their actual functionality) hence better scalability and since S3 is a managed service it allows for massive scale without much developer intervention and hassle
15. Upload for smaller chunks allow for faster uploads even in low internet speed and congested networks
16. Checksums are also utilized for validating the response chunk is correct at receiver's end

#### Read Path
1. The client requests the server for file download with the id
2. The request hits the L7 load balancer and the request is routed to one of the app servers
3. The app servers verifies the request if valid
4. Then hits the distributed cache (redis with cluster configuration one leader and multiple read replicas and async replication shared by user_id key) if cache hit good otherwise hits the app server (also sharded with write leader and multiple read replicas), then
5. The app servers check if the CDN has the resource or file ; if present generates the pre-signed url for CDN ; if not in CDN
6. Generates pre-signed url for S3 and returns it
7. Parallely while the signed url is generated and shared ; the cache is updated with metadata
8. The pre-signed url generated has an expiry for security and expiry depends on the file_size and is appropriated according to it
9. The client receives the signed url for CDN/S3 and uses it to download the file
10. The download makes use of HTTP range-requests(supported by both S3 and CDNs) thus allowing for efficient, pause-resumeable downloads.

#### Share Path

1. The resource/file owner requests the backend (L7 LB -> Server -> DB) for sharing a file with id and expiration
2. The backend returns a share id 
3. The owner shares that share id with the target audience or clients
4. The client then uses that id for requesting the download 
5. After above the download is as above read path (signed url -> download)

#### File sync across multiple devices

1. Whenever a local file is updated the uploader component of client listens to file changes or updates (using OS events; different OS have different event mechanism) and once detected uses above api or paths for uploading updates to remote server (versioning and collision handling not in scope)
2. The remote file is updated and event or message is sent out for sync across devices
3. The downloader component of the client makes use of persisted Server Sent Events(SSE) to get info about update in real time and as fallback also uses polling for sync updates
4. Once an update is detected the update is downloaded using above paths
5. SSE is chosen over WebSockets since communication is from server to uploader and SSE allows for single direction communication, requires less infra in comparison to WebSockets , easily load balanced and better support and also cheaper (the pub-sub and fan-out not in scope)

#### General Notes about design

1. For security HTTPS is used ; upon successful upload S3 allows for encryption and easy to setup with key stored separately which will be used to improve system's security
2. Use of pre-signed urls with appropriate expiration timeline helps in controlling the security to large extent
3. Further if required share can also require the use of password which can be stored in shares table and will require the target client to submit along with the id
4. Use of S3 multipart upload API with chunking, checksums, fingerprints, individual chunk uploads , etc allows for large, pause-resumeable, retries and scalable uploads
5. The system already makes use of CDN allowing for near client low latency downloads along with direct S3 downloads as fallback; makes use of redis for caching metadata and reducing latency even further
6. To reduce upload latency even further compression can be used
7. Kafka is used for async processing as Distributed Message Queue for operations like compression, virus checks , preview url generation, replication (for backup and durability); the workers are from app servers and update the db ,cache and CDN accordingly 


# Reviews

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5c63ac-cb70-83ee-bf13-adf3384fade3

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a5c65d9-67fc-83ee-a6ff-0abc598fcd5a

https://claude.ai/chat/4e09906d-ae39-4c85-b331-96cfb716021f


# References

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5b3e02-e9c4-83e8-b095-47ef4081c5c1

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5b8180-35ec-83ee-9e0e-0f9bde78cf13

https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5b91ed-6e64-83ee-ad2b-1b4a7b813a44

For downloads - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5b98f1-96f8-83ee-b8a0-fa5323e2dd83 (Basically the because of range requests and parallel downloads the clients can directly query the bytes without any chunking nonsense and even connection breaks just remembering range where to continue from is enough)


# Improvements from v1 to v2

- [x] ✅ Add automatic sync functional requirement
- [x] ✅ Fix NFRs
- [x] ✅ Decide SQL vs NoSQL with trade-off discussion (don't force NoSQL)
- [x] ✅ Correct upload lifecycle (`PENDING → COMPLETE`) + S3 Event Notifications
- [x] ✅ Add CDN
- [x] ✅ Deep dive: large file uploads (multipart, chunking, resume, checksums, retries)
- [x] ✅ Deep dive: security (signed URLs, encryption, ACLs)
- [x] ✅ Explain Kafka correctly
- [x] ✅ Design the **device synchronization flow** (how changes propagate to other devices)
# Learnings

1. S3 multipart upload
2. ==**You need to be more careful about sharding decisions user_id as sharding key in shares is a big bug**==
3. Add cleanup for abandoned multipart uploads (`FAILED` state + S3 lifecycle)

# Improvements for v3

- [ ] Fix global deduplication modeling
- [ ] Fix `shares` sharding
- [ ] Separate Worker Fleet
- [ ] Add cleanup for abandoned multipart uploads (`FAILED` + S3 Lifecycle Rule)
- [ ] Fix file synchronization architecture (Do this only after you study Kafka/real-time systems.)
- [ ] Store `storage_key` (Store S3 object key in DB, Generate signed URLs from `storage_key`)