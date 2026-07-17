Q 
How does data upload work over HTTP 

I understand the file is chunked and transfered but no other details

How it works with REST, how pause and resume is handled or implemented , how progress is tracked,
What optimizations are required for large files like (3-4 gb files), 

Excellent system design topic. Here's the production view.

---

# 1. Basic HTTP File Upload

Suppose you upload a 3 GB video.

```
Client
   |
POST /upload
   |
HTTP Request Body
   |
Reverse Proxy
   |
Backend
   |
Storage (S3/Disk)
```

The browser **does not load the whole file into memory.**

Instead it reads the file as a stream.

```
Disk
 ↓
64KB
 ↓
64KB
 ↓
64KB
 ↓
...
Socket
```

The TCP stack further breaks those chunks into packets (~1500 bytes Ethernet MTU).

So there are multiple layers.

```
File
 ↓
Browser stream (64KB-1MB chunks)
 ↓
HTTP body
 ↓
TCP segments
 ↓
IP packets
 ↓
Network
```

---

# 2. What does REST look like?

Simple upload

```
POST /api/files

Body:
multipart/form-data
```

Example

```
POST /upload

Content-Type: multipart/form-data

file=movie.mp4
```

Backend streams directly to storage.

```
Client
    ↓
Backend
    ↓
S3
```

---

# 3. Why this is bad for huge files

Imagine uploading 4 GB.

At 95%

Internet disconnects.

Entire upload starts again.

Terrible UX.

---

# 4. Production solution → Multipart / Chunk Upload

Instead of

```
4 GB
```

Split into

```
Chunk 1   10MB
Chunk 2   10MB
Chunk 3   10MB
...
Chunk 400
```

Each chunk becomes its own HTTP request.

```
POST /upload/chunk

Chunk 1

↓

POST /upload/chunk

Chunk 2

↓

POST /upload/chunk

Chunk 3
```

After all chunks

```
POST /upload/complete
```

Server assembles them (or cloud storage like S3 assembles them).

---

# 5. Upload Session

Usually upload starts like this

```
POST /uploads
```

Response

```json
{
    "uploadId":"abc123"
}
```

Every chunk uses

```
POST /uploads/abc123/chunks/1

POST /uploads/abc123/chunks/2

POST /uploads/abc123/chunks/3
```

Server stores

```
uploadId

uploadedChunks

status

totalChunks
```

---

# 6. Pause

Pause is actually very simple.

Just stop sending requests.

Nothing happens server side.

```
Chunk 1 ✓

Chunk 2 ✓

Chunk 3 ✓

Paused
```

Server simply waits.

---

# 7. Resume

Client asks

```
GET /uploads/abc123
```

Server returns

```json
{
  "uploaded":[1,2,3]
}
```

Client continues

```
Chunk 4

Chunk 5

Chunk 6
```

No need to restart.

---

# 8. Progress Tracking

Suppose

```
400 chunks
```

Uploaded

```
250
```

Progress

```
250 / 400

62.5%
```

or

```
Bytes uploaded

2.5 GB

/

4 GB
```

The browser can also track upload progress from bytes sent over the network.

---

# 9. Parallel Upload

Instead of

```
1

2

3

4

5
```

Production systems upload

```
1

2

3

4

5
```

at the same time (e.g., 4–10 concurrent uploads depending on network conditions).

```
Chunk1  ─────►

Chunk2  ─────►

Chunk3  ─────►

Chunk4  ─────►
```

Makes upload much faster.

---

# 10. Integrity Check

Each chunk usually has

```
SHA256

or

MD5
```

Server verifies

```
Chunk arrived correctly?
```

If hash mismatch

```
Upload only that chunk again.
```

Not the whole file.

---

# 11. Retry

If

```
Chunk 153
```

fails

Retry

```
153
```

only.

---

# 12. Direct Upload (Very Important)

Production systems rarely send files through your backend.

Instead

```
Client
     │
     │
     ▼
Backend
Generate Signed URL
     │
     ▼
Client
     │
     ▼
S3
```

Backend only generates a pre-signed URL.

Actual upload goes directly to object storage.

Benefits

- Backend bandwidth stays low.
    
- Better scalability.
    
- Lower latency.
    
- Reduced infrastructure cost.
    

---

# 13. Large File Optimizations (3–4 GB)

A production-grade uploader typically includes:

- **Chunked/multipart upload** (5–100 MB chunks; choose based on network and storage limits).
    
- **Parallel uploads** with a limited number of concurrent chunks.
    
- **Resume support** using an upload/session ID.
    
- **Per-chunk retries** with exponential backoff.
    
- **Checksums** (MD5/SHA-256) for integrity verification.
    
- **Direct uploads to object storage** using pre-signed URLs.
    
- **Streaming uploads** so neither client nor server loads the full file into memory.
    
- **Persistent upload state** (e.g., IndexedDB in the browser) to resume even after a page refresh.
    
- **Server-side cleanup** of abandoned multipart uploads after a timeout.
    
- **Authentication and authorization** before creating the upload session.
    
- **Rate limiting and quotas** to prevent abuse.
    
- **Virus/malware scanning** asynchronously after upload completes.
    
- **Background post-processing** (thumbnail generation, transcoding, metadata extraction) using a queue instead of doing it in the upload request.
    

---

## Typical Production Flow

```text
1. Client → POST /uploads
              │
              ▼
        uploadId + presigned URLs

2. Client uploads chunks directly to S3
   Chunk1 ✓
   Chunk2 ✓
   Chunk3 ✓
   ...

3. Failed chunk?
      Retry only that chunk.

4. User pauses.
      Stop sending requests.

5. User resumes.
      Ask server/S3 which parts exist.

6. All chunks uploaded.
      POST /uploads/{id}/complete

7. Storage assembles the final object.

8. Background workers perform virus scanning, thumbnail generation, video transcoding, etc.
```

This multipart, resumable, direct-to-object-storage approach is the standard architecture used by services like Google Drive, Dropbox, OneDrive, YouTube, and AWS S3 for reliable uploads of multi-gigabyte files.

Q
What is checksum ???

A **checksum** is a small fingerprint of data used to verify that the data wasn't corrupted during transmission or storage.

Think of it like this:

```text
Original File
      │
      ▼
Hash Function
      │
      ▼
Checksum (e.g., SHA-256)
```

For example, suppose you have:

```text
hello.txt

Contents:
Hello World
```

Running SHA-256 on it produces something like:

```text
a591a6d40bf420404a011733cfb7b190...
```

That long string is the checksum.

---

## During Upload

### Step 1: Client

Before sending a chunk:

```text
Chunk 5
        │
        ▼
SHA-256
        │
        ▼
Checksum = ABC123
```

The client sends both:

```text
POST /upload/chunk

Headers:
Checksum: ABC123

Body:
Chunk data
```

---

### Step 2: Server

The server receives the chunk and computes its own checksum:

```text
Received Chunk
        │
        ▼
SHA-256
        │
        ▼
ABC123
```

Then compares:

```text
Client checksum = ABC123
Server checksum = ABC123

✓ Valid
```

If they differ:

```text
Client checksum = ABC123
Server checksum = XYZ789

✗ Corrupted
```

The server rejects that chunk, and the client retries **only that chunk**.

---

## Why can corruption happen?

Although TCP already detects transmission errors, corruption can still occur due to:

- Disk or storage issues
    
- Faulty memory or hardware
    
- Proxy/storage bugs
    
- Verifying that the data stored is **exactly** what the client intended
    

Checksums provide **end-to-end integrity verification**, not just network integrity.

---

## Common Algorithms

|Algorithm|Fast|Secure|Typical Use|
|---|---|---|---|
|CRC32|✅ Very|❌ No|Network packets, ZIP files|
|MD5|✅|❌ No (collision attacks)|Legacy integrity checks|
|SHA-1|✅|❌ No|Mostly deprecated|
|SHA-256|Slightly slower|✅ Yes|Modern uploads, downloads, APIs|

---

## In Large File Uploads

For a 4 GB upload split into 400 chunks:

```text
Chunk 1 → SHA-256
Chunk 2 → SHA-256
Chunk 3 → SHA-256
...
Chunk 400 → SHA-256
```

If **Chunk 173** gets corrupted:

```text
Chunk 173 ❌

Retry only Chunk 173
```

The other 399 chunks remain valid, making uploads much more efficient than restarting from scratch.

Q
And chunks are nothing just data divided into small sized manageable chunks 
Do I need to know about the chunk format???

**Short answer: No.**

For **system design interviews**, it's enough to understand that a chunk is simply a **contiguous portion of the file's bytes**.

For example:

```text
Original File (100 MB)

[0 - 10 MB]   -> Chunk 1
[10 - 20 MB]  -> Chunk 2
[20 - 30 MB]  -> Chunk 3
...
```

The bytes themselves are **not modified**. You're just slicing the file into ranges.

---

### Does a chunk have a special format?

Usually **no**.

The HTTP request carries metadata separately from the chunk data.

For example:

```http
POST /uploads/{uploadId}/parts/5

Headers:
Content-Length: 10485760
Content-Type: application/octet-stream
Checksum: abc123...

Body:
<10 MB of raw bytes>
```

The **body is just raw bytes** (`application/octet-stream`).

---

### What metadata is typically associated with a chunk?

Not inside the chunk itself, but alongside it:

- Upload ID
    
- Chunk/part number
    
- Chunk size
    
- Checksum (optional but recommended)
    
- Total number of chunks (optional)
    

---

### For interviews

You do **not** need to know the binary layout or internal format of a chunk.

You **should** know:

- How files are split into chunks
    
- Why chunking is useful (resume, retry, parallel upload)
    
- How chunks are identified (upload ID + chunk number)
    
- How integrity is verified (checksums)
    
- How the server reassembles the final file
    

That's the level expected for L4/L5 backend and system design interviews.

Q
Ok so in production systems for uploading large files (3-4 gbs)

1. The file to be uploaded is selected
2. The request for post upload is sent 
3. TCP connection is established
4. The file is divided into various small sized chunks and each chunk is assigned a sequence number (so that on the receiver's end it can be assembled)
5. Multiple Chunks are sent concurrently 
6. The TCP layer breaks these chunks further down to packets which travel to destination , get assembled and so are the chunks assembled 
7. Once all the chunks are uploaded complete acknowledgement is sent ; destination side all assembling is completed and the file is transferred

Since chunks are used pause, resume, mutations are checked via checksums 

You're **90% correct**, but there are a few important corrections from a production perspective.

---

### ✅ Production Flow

1. **User selects a file.** ✔️
    
2. **Client requests an upload session.** ✔️
    

```text
POST /uploads
```

Server responds with:

- Upload ID
    
- Pre-signed URLs (or upload endpoint)
    
- Chunk size
    

---

3. **Client divides the file into chunks.** ✔️
    

Example:

```text
4 GB

↓

400 chunks × 10 MB
```

Each chunk gets a **part number** (1, 2, 3...). This is **not** for TCP; it's for the upload protocol (HTTP/S3/etc.) so the server knows how to reconstruct the file.

---

4. **Multiple chunks are uploaded concurrently.** ✔️
    

For example:

```text
Chunk 1 ─►
Chunk 2 ─►
Chunk 3 ─►
Chunk 4 ─►
```

Typically 4–10 concurrent uploads.

---

5. **Each HTTP request uses TCP (or QUIC if using HTTP/3).** ✔️
    

The operating system's TCP stack breaks the request body into TCP segments, which are sent over the network.

---

6. **The server stores each chunk independently.** ⚠️
    

This is the biggest correction.

The server **does not immediately assemble the file** as chunks arrive.

Instead it stores something like:

```text
Upload ID: abc123

Part 1 ✓
Part 2 ✓
Part 3 ✓
Part 4 ✓
...
```

Only after the client says:

```text
POST /uploads/abc123/complete
```

does the storage system (or backend) assemble the final object.

---

7. **Complete request.** ✔️
    

After all chunks succeed:

```text
POST /uploads/complete
```

The backend (or S3 multipart API) combines the parts into the final file.

---

## A few important clarifications

> **"Chunks are assigned sequence numbers so that on the receiver's end it can be assembled."**

✅ Correct idea.

More precisely, they have **part numbers** (or chunk indexes). They are **application-level metadata**, unrelated to TCP sequence numbers.

---

> **"The TCP layer breaks these chunks further down to packets."**

✅ Correct.

Think of it like:

```text
File
    ↓
Application chunks (10 MB)
    ↓
HTTP request body
    ↓
TCP segments (~KBs)
    ↓
IP packets
    ↓
Network
```

---

> **"Pause, resume, mutations are checked via checksums."**

Almost.

- ✅ **Pause:** Stop sending more chunk requests.
    
- ✅ **Resume:** Ask which parts already exist, then continue with the missing ones.
    
- ✅ **Checksums:** Verify **integrity** (that data wasn't corrupted), **not mutations**.
    

---

Overall, your understanding is at the level expected for discussing large file upload architecture in a system design interview. The main distinction to remember is that **application-level chunks/part numbers** are completely separate from **TCP segments/sequence numbers**, and that multipart uploads are typically assembled only after an explicit completion step.

Q
Ok so each chunk upload is a separate HTTP request-response , right ???

**Yes, exactly.** ✅

In a typical production multipart upload:

```text
POST /uploads/abc123/parts/1
Body: Chunk 1 (10 MB)

← 200 OK

POST /uploads/abc123/parts/2
Body: Chunk 2 (10 MB)

← 200 OK

POST /uploads/abc123/parts/3
Body: Chunk 3 (10 MB)

← 200 OK

...

POST /uploads/abc123/complete

← 200 OK
```

So if you have:

- File size = **4 GB**
    
- Chunk size = **10 MB**
    

Then you'll have approximately:

- **410** chunk upload HTTP requests (409.6 rounded up)
    
- **1** final `complete` request
    

Total ≈ **411 HTTP requests**.

### Why separate requests?

Because it enables:

- ✅ Retry only failed chunks
    
- ✅ Pause/resume
    
- ✅ Parallel uploads
    
- ✅ Independent checksum verification
    
- ✅ No need to restart the entire upload
    

---

### One small note

When using **HTTP/2** or **HTTP/3**, these requests don't necessarily create a new TCP connection each time.

Typically:

- **HTTP/1.1**: Reuses the same TCP connection via keep-alive (or opens a small pool of connections).
    
- **HTTP/2**: Multiple chunk upload requests can be multiplexed over a **single TCP connection**.
    
- **HTTP/3**: Multiple requests are multiplexed over a **single QUIC connection**.
    

So **each chunk is a separate HTTP request/response**, but **not necessarily a separate network connection**. That's an important distinction in production systems.

Q
Since HTTP2 uses multiplexing does that mean all the chunks are uploaded in parallel ???

**Not automatically.** This is a very common misconception.

HTTP/2 **allows** multiplexing, but whether chunks are uploaded in parallel depends on the client.

### Scenario 1: Sequential uploads

The client sends:

```text
Chunk 1 ───────────────► Done
Chunk 2 ───────────────► Done
Chunk 3 ───────────────► Done
```

Only **one upload is active**.

HTTP/2 provides **no benefit** here.

---

### Scenario 2: Parallel uploads

The client starts multiple uploads simultaneously:

```text
Chunk 1 ───────────────►
Chunk 2 ───────────────►
Chunk 3 ───────────────►
Chunk 4 ───────────────►
```

Now HTTP/2 multiplexes all these requests over **one TCP connection**.

---

### Without HTTP/2 (HTTP/1.1)

To upload 4 chunks in parallel, the browser typically needs **multiple TCP connections**:

```text
TCP Conn 1 → Chunk 1
TCP Conn 2 → Chunk 2
TCP Conn 3 → Chunk 3
TCP Conn 4 → Chunk 4
```

---

### With HTTP/2

Only **one TCP connection** is needed:

```text
               One TCP Connection
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
 Stream 1         Stream 2       Stream 3
 Chunk 1          Chunk 2        Chunk 3
```

Multiple HTTP requests are interleaved (multiplexed) on that single connection.

---

### Production systems

Services like Google Drive, Dropbox, and OneDrive usually:

- Split the file into chunks.
    
- Upload **4–10 chunks concurrently** (configurable).
    
- Use **HTTP/2 or HTTP/3** so those concurrent requests share a single connection.
    

So the correct relationship is:

> **Parallel chunk uploads are an application decision. HTTP/2 makes them much more efficient by multiplexing them over one connection.**

HTTP/2 **enables** efficient parallel uploads; it does **not** force them.