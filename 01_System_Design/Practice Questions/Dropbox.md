# Functional Requirements

1. Users should be able to upload files
2. Users should be able to download uploaded files
3. Users should be able to sync file changes across multiple devices
4. Users should be able to able to share files

# Non-Functional Requirements

1. System must support upload of large files (upto 4-6 Gbs)
2. System must support pause-resume-able uploads
3. System must prioritize availability over consistency 
4. System must support persistent uploads i.e. after successful upload the system must persist the data even for recovery
5. The system should make upload, download, and sync times as fast as possible (low latency).

# Assumptions

1. File versioning out of scope

# Entity Design

1. users
2. uploads

# API Design

POST /files {
filename
filesize
checksum
}

userId from JWT auth

	Returns session unique uploadId

GET /files/uploadId for downloads DO NOT USE Query Params

	Downloads the file

POST /files/uploadId/share {
User[]
}

	Returns an id which then can be used by receiver  

# High Level Design
![[1788301775226.jpg]]

### Upload path/flow

1. Client/Uploader initiates upload of a large file (say 1Gb) and sends necessary info along with the request
2. The request reaches the API gateway then auth checks, rate-limit checks and then routed to upload service
3. The request reaches upload service , the request is validated(upload limit,etc) then communicates with S3 Object store to get S3 upload key which is then stored in metadata DB along with uploadId upload key and status set to in-progress
4. The app server then returns the uploadId (DB map) + pre-signed urls for first batch of chunks to the client
5. The client receives the uploadId + pre-signed urls for chunks and starts uploading the corresponding chunks potentially parallely
6. Each chunk upload is associated with uploadId + chunk index (If a part fails, the client retries that part. Successful parts don't need to be uploaded again.)
7. Upon successful upload of each chunk the S3 object store returns an E-Tag which then the client keeps the partNumber + ETag information needed for completion.
8. Once all the chunks have been uploaded the client requests/commits the successful upload by sending the sequenced ETags + complete multi-part upload
9. App server validates the request and invokes S3's complete multi-part upload with received data
10. S3 finalizes the multipart upload and creates the final object.
11. The app server updates the status to uploaded and returns success response to client
12. If the completion request is retried, the operation must be
    handled idempotently. If S3 completed but the DB update failed,
    reconciliation can repair the DB state.
13. Abandoned multipart uploads are eventually aborted/expired.
14. Optional checksums can be used for explicit data-integrity
    verification
15. Upon successful upload the upload service pushes the event to an async queue (Kafka/SQS) in async/in parallel which then is consumed by worker fleet for virus checks , replication/duplication for recovery/persistance, sync event for shared devices, CDN updates, etc  and necessary DB updates are made

### Download path

1. The client request for file download 
2. The request first reaches the CDN if available then the pre-signed download url is returned (expiration time depending on the file size + network condition)
3. If CDN hit the download start by using range headers for resume-able downloads otherwise
4.  The request reaches the API gateway then auth checks, rate-limit checks and then routed to download service
5. The app server validates the request and creates a pre-signed download url (expiration time depending on the file size + network condition) and returns it to client
6. The client receives the download url and starts downloading the file using range headers allowing for pause-resume-able downloads

### Sync path

1. The client/downloader maintains a persisted connection with the app server for any updates 
2. Whenever there is a new upload/update the client initiates download of the update using above download
3. And syncs with other devices 

### Share Path

1. Create a separate shares table in DB
2. Client requests a share of a file and provides the receivers list
3. The request reaches the app server , validated and then the receivers receive the download url via E-Mail or similar service

### Notes

1. The system for scaling/handling large number of reads uses sharding + master-multiple read replicas for each shard for scaling reads and sharding for scaling writes for metadata DB

# Comparison Conclusion

The solution provided is definetly good and scale-able but missing a few things like security , NFR for low latency , most of the design for low latency was already present in your design but was not highlighted