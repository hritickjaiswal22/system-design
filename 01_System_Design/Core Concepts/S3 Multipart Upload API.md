> #Explain to me how S3 Multipart Upload API works in complete detail

This is an **extremely important** topic for backend and system design interviews because it solves one of the biggest problems in distributed systems:

> **How do you upload a 100 GB file reliably over an unreliable network?**

You cannot just send a single HTTP request.

Let's go from first principles.

---

# Problem with Normal Upload

Suppose you're uploading a 20 GB video.

```
Browser
   |
   |------------20 GB HTTP Request------------>
   |
S3
```

Imagine after 18 GB have been uploaded your WiFi disconnects.

```
18 GB uploaded
Network fails
Connection closed
```

What happens?

Everything is lost.

You must upload the whole 20 GB again.

This is terrible because

- huge bandwidth waste
- huge time waste
- mobile networks fail frequently
- browser may crash
- upload may timeout

---

# Solution: Multipart Upload

Instead of uploading

```
20 GB
```

split it into

```
Part 1 = 100 MB
Part 2 = 100 MB
Part 3 = 100 MB
...
Part 200
```

Now every piece is uploaded independently.

```
Browser

Part1 ------------>
Part2 ------------>
Part3 ------------>
...
```

If Part 137 fails

only

```
Part137
```

is retried.

Everything else stays.

This is exactly what Multipart Upload does.

---

# Overall Flow

Multipart Upload consists of **three APIs**.

```
1. CreateMultipartUpload

↓

2. UploadPart
   UploadPart
   UploadPart
   UploadPart

↓

3. CompleteMultipartUpload
```

Optionally

```
AbortMultipartUpload
```

---

# Step 1 — CreateMultipartUpload

Client first tells S3

> "I'm about to upload a large file."

Request

```
POST /bucket/video.mp4?uploads
```

S3 responds

```
UploadId =

ab23cd98ef...
```

This UploadId is extremely important.

Think of it as

```
Temporary Upload Session
```

Nothing is visible yet.

No object exists.

S3 only creates metadata.

Internally

```
Upload Session

UploadId

Parts Uploaded:

(empty)
```

---

# Step 2 — Split File

Suppose

```
1 GB file
```

Split into

```
Part 1
Part 2
Part 3
...
Part 10
```

Each part has

```
Part Number
Bytes
```

For example

```
Part 1

0-100MB

Part Number = 1
```

```
Part 2

100-200MB

Part Number = 2
```

etc.

---

# Step 3 — Upload Each Part

Every part is uploaded separately.

```
PUT

/bucket/video.mp4

?partNumber=1
&uploadId=ab23cd...
```

Body

```
100 MB
```

S3 stores it.

Returns

```
ETag

"4dd8af..."
```

This ETag is important.

Save it.

Then

```
PUT

partNumber=2
```

returns

```
ETag

"a91bc..."
```

Continue.

Eventually

```
Part1 → uploaded
Part2 → uploaded
...
Part10 → uploaded
```

---

# Internal S3 State

Until completion

```
UploadId

Part1
Part2
Part3
...
Part10
```

These are **temporary objects**.

The real object

```
video.mp4
```

does not exist yet.

Nobody can download it.

---

# Parallel Uploads

Huge benefit.

Instead of

```
Part1
↓

Part2
↓

Part3
```

Do

```
Thread1 → Part1

Thread2 → Part2

Thread3 → Part3

Thread4 → Part4
```

Now network bandwidth is fully utilized.

For example

```
8 parallel uploads
```

instead of

```
1 upload
```

Upload becomes much faster.

---

# Retry

Suppose

```
Part6
```

fails.

State

```
Part1 ✓

Part2 ✓

Part3 ✓

Part4 ✓

Part5 ✓

Part6 ✗

Part7 ✓
```

Simply retry

```
PUT

Part6
```

Nothing else changes.

---

# Step 4 — CompleteMultipartUpload

After every part succeeds

Client sends

```
CompleteMultipartUpload
```

Body

```
Part1
ETag1

Part2
ETag2

...

Part10
ETag10
```

Example

```xml
<CompleteMultipartUpload>

<Part>

<PartNumber>1</PartNumber>

<ETag>"abc"</ETag>

</Part>

...

</CompleteMultipartUpload>
```

Now S3 assembles them.

```
Part1

+

Part2

+

Part3

+

...

↓

video.mp4
```

Only now

```
video.mp4
```

becomes visible.

This is almost like a commit in a database transaction: until you call `CompleteMultipartUpload`, the upload is incomplete and the object is not available.

---

# AbortMultipartUpload

Suppose user cancels.

Without cleanup

```
Part1

Part2

Part3
```

would occupy storage forever.

Call

```
AbortMultipartUpload
```

S3 deletes

```
Part1

Part2

Part3

UploadId
```

Everything disappears.

---

# Why ETag?

Each UploadPart returns

```
ETag
```

Why?

Because when completing

```
CompleteMultipartUpload
```

S3 must know exactly which uploaded part belongs where.

Client sends

```
Part1 → ETag A

Part2 → ETag B

Part3 → ETag C
```

S3 validates

- these parts exist
- the ETags match the uploaded content

Then assembles them in **PartNumber order**, not in the order they were uploaded.

---

# Can Parts Arrive Out of Order?

Absolutely.

```
Part8 finishes first

↓

Part2

↓

Part10

↓

Part1
```

Doesn't matter.

Completion request

```
1

2

3

...

10
```

defines the final ordering.

---

# Can I Upload Same Part Again?

Yes.

Suppose

```
Part5
```

was corrupted.

Just upload

```
Part5
```

again.

The latest upload for that part number replaces the previous one for that upload session.

---

# Can I Resume Tomorrow?

Yes.

As long as the multipart upload hasn't been completed or aborted (and any lifecycle rule hasn't expired it), you keep the same

```
UploadId
```

You can continue uploading missing parts later.

---

# Limits

Important interview numbers:

| Property              | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Maximum object size   | 5 TB                                                                         |
| Maximum parts         | 10,000                                                                       |
| Part size             | 5 MB – 5 GB (last part can be smaller than 5 MB)                             |
| Recommended part size | Typically 8–100 MB or larger depending on object size and network conditions |

---

# Complete Sequence Diagram

```text
Client                         S3

 |------CreateMultipartUpload----->|
 |<-----UploadId-------------------|

Split File

Part1
Part2
Part3
Part4

 |------UploadPart(1)------------->|
 |<-----ETag1----------------------|

 |------UploadPart(2)------------->|
 |<-----ETag2----------------------|

 |------UploadPart(3)------------->|
 |<-----ETag3----------------------|

 |------UploadPart(4)------------->|
 |<-----ETag4----------------------|

 |------CompleteMultipart--------->|
 |  Part1 ETag1                    |
 |  Part2 ETag2                    |
 |  Part3 ETag3                    |
 |  Part4 ETag4                    |
 |<-----200 OK---------------------|

Object becomes visible
```

# How this is used in production

In most production systems, the application server does **not** stream the file through itself. Instead, the flow looks like this:

```text
Browser
   |
   | 1. Request upload
   v
Backend
   |
   | 2. CreateMultipartUpload on S3
   | 3. Generate presigned URL for each part
   v
Browser
   |
   | 4. Upload parts directly to S3 using presigned URLs
   v
S3

Browser
   |
   | 5. Send UploadId + PartNumber/ETag list
   v
Backend
   |
   | 6. CompleteMultipartUpload
   v
S3
```

This architecture has two major advantages:

- **Scalability:** Your backend never becomes a bottleneck because the large file data flows directly from the client to S3.
- **Cost and reliability:** The backend handles only lightweight control requests (creating upload sessions, issuing presigned URLs, and completing uploads), while S3 handles the heavy data transfer.

# Interview takeaways

A strong interview answer should emphasize these design benefits:

- **Reliability:** Only failed parts are retried instead of the entire file.
- **Parallelism:** Multiple parts can be uploaded concurrently to maximize throughput.
- **Resumability:** Uploads can continue later using the same `UploadId`.
- **Atomic visibility:** The object becomes visible only after `CompleteMultipartUpload`, preventing clients from seeing partially uploaded files.
- **Backend scalability:** Using presigned URLs allows clients to upload directly to S3, avoiding unnecessary load on application servers.

These are the reasons multipart upload is the standard approach for uploading large objects to S3 and similar object storage systems in production distributed systems.

    Q : So the presigned urls for all the chunks would be send along with uploadId as response for the CreateMultipartUpload request

    Therefore if file size is 50 GB and chunk size is 10 Mb then 5000 pre-signed urls are sent !!!

Excellent observation. This is exactly the kind of question a senior engineer asks.

The answer is:

**Usually, no.** Production systems typically **do not generate thousands of presigned URLs at once.**

Let's see why.

---

## Option 1: Generate all URLs at once (possible, but uncommon)

Suppose

- File = **50 GB**
- Part size = **10 MB**

```
50 GB / 10 MB = 5000 parts
```

Backend flow:

```
CreateMultipartUpload()

↓

UploadId

↓

Generate 5000 presigned URLs

↓

Return

{
   uploadId,
   [
      part1URL,
      part2URL,
      ...
      part5000URL
   ]
}
```

This works.

But think about the downsides.

### Huge response

5000 URLs × ~500 characters each

```
≈ 2.5 MB response
```

Not catastrophic, but unnecessary.

---

### Expiration problem

Presigned URLs expire.

Imagine

```
Expiry = 15 minutes
```

The user has slow internet.

After uploading only

```
Part 700
```

the remaining

```
4300 URLs
```

have already expired.

Now you must regenerate them anyway.

---

### Waste

Suppose upload stops after

```
Part 300
```

You generated

```
4700
```

URLs that were never used.

---

# Option 2 (Most Common)

Generate URLs **on demand**.

Flow

```
Client

↓

CreateMultipartUpload

↓

UploadId
```

Now

```
Client

↓

Need Part 1

↓

GET /presigned-url?uploadId=...&part=1
```

Backend

```
Generate URL

↓

Return URL
```

Upload.

Repeat.

---

# Option 3 (Very Common)

Generate URLs **in batches**.

Instead of

```
5000
```

generate

```
100
```

URLs.

Client uploads

```
1-100
```

When almost finished

```
Request next batch

101-200
```

Continue.

```
1-100

↓

101-200

↓

201-300
```

This keeps responses small and avoids expired URLs.

---

# Why not make parts larger?

Your example uses **10 MB** parts.

For a 50 GB file:

```
50 GB

10 MB parts

↓

5000 parts
```

Many SDKs choose larger part sizes automatically.

For example

```
100 MB parts

↓

500 parts
```

or

```
500 MB parts

↓

100 parts
```

Remember S3's limit:

```
Maximum parts = 10,000
```

So for very large files, clients increase the part size to stay under that limit.

---

# What does AWS SDK do?

If you use the AWS SDK's high-level upload utilities (such as the Transfer Manager or multipart upload helpers), the SDK typically:

- Starts the multipart upload.
- Chooses an appropriate part size.
- Uploads several parts in parallel.
- Retries failed parts.
- Completes the upload.

When you're building your own backend with **presigned URLs**, you're responsible for deciding whether to generate URLs one-by-one or in batches.

---

## Interview expectation

If I asked in a senior system design interview:

> "Would you generate 5,000 presigned URLs at once?"

A strong answer would be:

> "It's technically possible, but I wouldn't by default. It increases response size, wastes work if the upload is abandoned, and many URLs may expire before they're used. I'd return the `UploadId` immediately and either generate presigned URLs on demand or in manageable batches (e.g., 50–200 parts at a time), while allowing the client to upload those parts in parallel."

That's the kind of trade-off discussion interviewers look for.

    ok so you said that ETags are necessary because upon completion the clients sends a map of part number and corresponding ETag which the S3 then uses for ordering and marking it as complete , right ???

You're **90% correct**, but there's an important nuance that separates a good answer from a senior-level answer.

The ETags are **not primarily for ordering**.

They are **primarily for identifying and validating each uploaded part**.

The ordering comes from the **PartNumber**.

---

## Imagine this scenario

You uploaded:

```text
Part 1 → ETag = aaa111
Part 2 → ETag = bbb222
Part 3 → ETag = ccc333
```

When you call `CompleteMultipartUpload`, you send:

```xml
<CompleteMultipartUpload>
    <Part>
        <PartNumber>1</PartNumber>
        <ETag>"aaa111"</ETag>
    </Part>

    <Part>
        <PartNumber>2</PartNumber>
        <ETag>"bbb222"</ETag>
    </Part>

    <Part>
        <PartNumber>3</PartNumber>
        <ETag>"ccc333"</ETag>
    </Part>
</CompleteMultipartUpload>
```

S3 internally verifies:

> "Do I have a part with **PartNumber = 1** and **ETag = aaa111** for this UploadId?"

If yes ✔️

Then

> "Do I have PartNumber = 2 with ETag = bbb222?"

If yes ✔️

...

Only after every mapping is validated does S3 stitch the object together.

---

# Who decides the order?

**PartNumber.**

For example, suppose the uploads finished in this order:

```text
Part 8
Part 2
Part 10
Part 1
Part 6
```

S3 doesn't care.

When you complete the upload, it assembles:

```text
Part 1
↓

Part 2
↓

Part 3
↓

...

↓

Part 10
```

The ETag has **nothing to do with ordering**.

---

# Then why isn't PartNumber enough?

Excellent question.

Suppose you only sent:

```text
Part 1
Part 2
Part 3
```

How does S3 know **which uploaded data** you're referring to?

Imagine this sequence:

```
Upload Part 2
↓

Network timeout

↓

Client isn't sure if it succeeded

↓

Retries Upload Part 2
```

Now there may have been multiple upload attempts for Part 2 during the upload session.

The ETag uniquely identifies the actual stored content that S3 accepted.

So when you say:

```text
Part 2
ETag = bbb222
```

you're telling S3:

> "Use **this exact uploaded blob** as Part 2."

---

# Another reason: integrity

ETags also act as a validation mechanism.

Suppose the client accidentally sends:

```xml
<Part>
    <PartNumber>2</PartNumber>
    <ETag>"xyz999"</ETag>
</Part>
```

But S3 only has

```text
bbb222
```

for Part 2.

S3 responds with an error because the specified part doesn't exist or doesn't match.

This prevents assembling an object from the wrong or missing parts.

---

# The mental model I use

Think of it like Git.

Each uploaded part becomes a blob:

```text
UploadId = U123

Part 1 -> Blob A (ETag aaa111)

Part 2 -> Blob B (ETag bbb222)

Part 3 -> Blob C (ETag ccc333)
```

The `CompleteMultipartUpload` request is essentially saying:

```text
Build my final object as:

Blob A
↓

Blob B
↓

Blob C
```

The **ETag identifies the blob**, while the **PartNumber specifies where that blob belongs in the final object**.

---

So the most precise interview answer is:

> **PartNumber determines the ordering of the final object. ETag identifies and validates the exact uploaded part that should be used for that position. S3 uses the `(PartNumber, ETag)` pairs to verify every part exists and then assembles the object in ascending PartNumber order.**

That's the level of precision interviewers appreciate.

    Consider below

    "Next, let's talk about how to uniquely identify a file and a chunk. When you try to resume an upload, the very first question that should be asked is: (1) Have I tried to upload this file before? and (2) If yes, which chunks have I already uploaded? To answer the first question, we cannot naively rely on the file name. This is because two different users (or even the same user) could upload files with the same name. Instead, we need to rely on a unique identifier that is derived from the file's content. This is called a fingerprint.
    A fingerprint is a mathematical calculation that generates a unique hash value based on the content of the file. This hash value, often created using cryptographic hash functions like SHA-256, serves as a robust and unique identifier for the file's content regardless of its name or the source of the upload. By computing this fingerprint, we can efficiently determine whether the file has been uploaded before (deduplication) and whether an in-progress upload can be resumed."


    Then this fingerprint and uploadId also needs to be stored in the metadata table for each chunkId

Excellent catch. You're now thinking about **building your own Dropbox/Google Drive**, not just using S3. This distinction is important.

The answer depends on **who owns the multipart upload state**.

---

# Case 1: Using S3 Multipart Upload (Most common)

If you're using S3's Multipart Upload API, **you do not need to store chunk metadata yourself**.

S3 already stores:

```text
UploadId

↓

Part 1 → ETag

Part 2 → ETag

Part 3 → ETag
...
```

When the client resumes, your backend only needs to know:

```text
File Fingerprint
        ↓
UploadId
```

Then you can ask S3:

```http
ListParts(uploadId)
```

S3 returns:

```text
Part 1 ✓
Part 2 ✓
Part 5 ✓
Part 6 ✓
```

The client uploads only:

```text
Part 3
Part 4
```

So in this architecture your DB might only contain:

```text
uploads

------------------------------------------
upload_id
fingerprint
user_id
status
s3_object_key
created_at
```

Notice there's **no chunk table** because S3 is already the metadata store for chunks.

---

# Case 2: You're building Dropbox from scratch

Now imagine you own the storage layer.

No S3.

No Multipart API.

No ListParts.

Then **you must store every chunk yourself.**

Example

```text
Files

file_id
fingerprint
owner
size
status
```

```text
Chunks

chunk_id
file_id
chunk_number
checksum
storage_location
uploaded
```

Now when client reconnects

```text
Fingerprint

↓

Find File

↓

Query Chunks

↓

Already have

1
2
4
5

↓

Upload only

3
```

Here **yes**, every chunk needs metadata.

---

# About UploadId

This is where your question becomes interesting.

You asked:

> "Then this fingerprint and uploadId also needs to be stored in the metadata table for each chunkId"

I'd design it slightly differently.

Instead of storing the fingerprint repeatedly on every chunk, normalize the schema.

### Upload Session

```text
upload_sessions

----------------------------------------
upload_id (PK)
fingerprint
user_id
status
created_at
```

### Chunks

```text
chunks

----------------------------------------
chunk_id
upload_id (FK)
part_number
etag/checksum
uploaded
```

Relationship

```text
Upload Session
       │
       │
       ├──── Chunk 1
       ├──── Chunk 2
       ├──── Chunk 3
       └──── Chunk 4
```

The fingerprint lives once in the upload session.

Every chunk references the upload session.

No duplication.

---

# Why keep the fingerprint?

Because later you can support **deduplication**.

Imagine:

```
Alice uploads

movie.mp4

↓

Fingerprint

ABC123
```

Store

```text
ABC123
```

Tomorrow

```
Bob uploads

holiday.mp4
```

Different filename.

Same content.

Fingerprint

```
ABC123
```

Immediately you know

> "I already have this data."

No upload required.

Just create another metadata entry pointing to the same stored object.

---

# Senior Design Observation

One thing in the article you quoted is slightly misleading.

It says:

> "Fingerprint helps determine whether the upload can be resumed."

Not exactly.

The **fingerprint identifies the file**.

The **UploadId identifies a specific upload attempt (upload session).**

Imagine this:

```
File fingerprint

ABC123
```

Attempt 1

```
UploadId = U1

Interrupted
```

User decides to restart from scratch.

Attempt 2

```
UploadId = U2
```

Same fingerprint.

Different UploadId.

If you used only the fingerprint, you couldn't distinguish between the abandoned upload and the active upload.

So in practice:

- **Fingerprint** → "Which logical file is this?"
- **UploadId** → "Which upload session is this?"

That's why production systems often maintain both concepts separately. This separation becomes especially important when supporting resumable uploads, retries, multiple devices, or deduplication.

    Wait you said

    S3 already stores:

    UploadId

    ↓

    Part 1 → ETag

    Part 2 → ETag

    Part 3 → ETag
    ...

    But earlier you said client send the Etag-Part number list so that S3 can order and verify if S3 already has all the info then why verification is needed ??? To mark it as complete ???

Excellent. This is exactly the kind of question that gets to the internals of the API.

The key realization is:

> **S3 stores the uploaded parts, but it does not know which subset of those parts you want to use to create the final object until you explicitly tell it.**

Let's unpack that.

---

# What does S3 know after UploadPart?

Suppose you've uploaded:

```text
UploadId = U123

PUT Part 1
→ ETag = A

PUT Part 2
→ ETag = B

PUT Part 3
→ ETag = C
```

Internally S3 stores something like:

```text
UploadId = U123

Part 1 -> ETag A
Part 2 -> ETag B
Part 3 -> ETag C
```

So yes, S3 already knows this.

---

# Then why send them again?

Because **uploading parts and assembling an object are two separate operations**.

Think of the uploaded parts as sitting in a temporary workspace.

```text
Temporary storage

UploadId U123

Part1
Part2
Part3
```

Nothing has been committed yet.

---

# CompleteMultipartUpload is a COMMIT

When you call

```http
CompleteMultipartUpload
```

you're not saying

> "Please figure out what I uploaded."

You're saying

> "Build my object using exactly these parts."

For example:

```xml
Part 1 -> ETag A
Part 2 -> ETag B
Part 3 -> ETag C
```

This request acts like a commit instruction.

---

# Why doesn't S3 just use every uploaded part?

Imagine this scenario.

You uploaded

```text
Part 1 ✓

Part 2 ✓

Part 3 ✓

Part 4 ✗
```

Maybe Part 4 kept failing.

You accidentally call Complete.

If S3 simply looked at "everything uploaded"

it has no idea whether

- Part 4 is intentionally missing
- you're still uploading
- the upload crashed
- you want to overwrite Part 4 later

Only **you** know when the upload is logically complete.

---

# Another scenario

Suppose this happened:

```
Upload Part 5
↓

Timeout
↓

Client retries Part 5
```

Now S3 has received multiple uploads for Part 5 during the session (internally it keeps only the latest successful version for that part number, but from the protocol perspective the client still explicitly specifies the final mapping).

When the client says

```text
Part 5
ETag XYZ
```

it's confirming

> "Use this exact uploaded version."

---

# Think of Git

Imagine Git.

You create blobs

```
Blob A
Blob B
Blob C
```

Git stores them.

But nothing happens.

Only when you create a commit

```
Commit

Tree

Blob A
Blob B
Blob C
```

does Git know

> "These blobs belong together."

Multipart upload is similar.

Uploading parts

```
store blob

store blob

store blob
```

does **not** create an object.

CompleteMultipartUpload is the commit.

---

# Then why include the ETags?

The ETags serve as a consistency check.

S3 asks

> "You claim Part 2 should have ETag B."

S3 checks

```
UploadId U123

Part2

↓

ETag B ?

YES

Continue.
```

If instead you send

```
Part2

ETag Z
```

S3 replies

> "No such uploaded part."

and refuses to complete the upload.

---

# The protocol could have been different

You might ask:

> "Couldn't S3 just use the UploadId?"

Technically, AWS could have designed the API like this:

```http
POST CompleteUpload

UploadId
```

and internally do

```
Take all uploaded parts
Sort by PartNumber
Done
```

But that design is less flexible.

The current design gives the client explicit control over exactly which uploaded parts are assembled, and it lets S3 verify that the client and S3 have a consistent view of the uploaded data before making the object visible.

---

## Senior interview takeaway

The important mental model is:

- **`UploadPart`** stores temporary parts.
- **`CompleteMultipartUpload`** is an explicit **commit operation**.
- The `(PartNumber, ETag)` list is **not sent because S3 forgot the parts**.
- It's sent because the client is declaring: **"These are the exact uploaded parts that constitute the final object."**
- S3 validates that declaration against its temporary storage and, if everything matches, atomically creates the final object and cleans up the temporary multipart state.

This separation between **staging** (uploading parts) and **commit** (assembling the object) is a common pattern in distributed systems because it allows retries, resumability, and atomic visibility.

    What is S3 Event Notifications
    Why do we need it -> I mean once client has successfully CompleteMultipartUpload or commited file upload then the client can simply send a request to server to update the status as completed and server can verify it and mark complete

Excellent question. You're challenging whether **S3 Event Notifications are actually necessary**. This is exactly the kind of trade-off discussion that comes up in senior system design interviews.

The short answer is:

> **Your approach works and is often sufficient. S3 Event Notifications are not required for multipart uploads. They solve a broader class of problems where your backend should react to changes in S3, regardless of who or what caused them.**

Let's compare the two approaches.

---

# Approach 1: Client notifies the backend

This is what you're proposing.

```text
Browser
   |
   | CreateMultipartUpload
   v
Backend
   |
   | UploadId
   v
Browser
   |
   | Upload parts directly to S3
   |
   | CompleteMultipartUpload
   v
S3

Browser
   |
   | POST /upload/complete
   | uploadId
   v
Backend
   |
   | Verify object exists
   | Update DB
```

This is perfectly valid.

Many production systems do exactly this.

The backend can even verify by calling:

```text
HeadObject()
```

or

```text
ListParts()
```

before marking the upload as completed.

---

# Then why does S3 provide Event Notifications?

Because **the backend cannot always trust the client.**

Imagine this.

---

## Scenario 1: Client disappears

```text
Upload Parts ✓

↓

CompleteMultipartUpload ✓

↓

Browser crashes
```

The request

```text
POST /upload/complete
```

never reaches your backend.

Your database now says

```text
status = uploading
```

while S3 already has

```text
video.mp4
```

Your metadata is inconsistent.

With an S3 event:

```text
S3

↓

ObjectCreated

↓

Backend

↓

Update DB
```

The backend is eventually notified even if the client vanishes.

---

## Scenario 2: Multiple upload sources

Suppose objects can be uploaded by

```text
Browser

Mobile App

Backend Service

AWS CLI

Lambda

Partner APIs
```

If every uploader has to remember to call

```text
POST /complete
```

you now have many integration points.

Instead

```text
Anyone uploads

↓

S3 emits ObjectCreated

↓

Backend reacts
```

One integration.

Much simpler.

---

## Scenario 3: Backend shouldn't trust clients

Suppose a malicious client sends

```text
POST /upload/complete
```

without actually completing the upload.

Your backend has to verify

```text
Does object exist?
```

every time.

With an S3 event

```text
ObjectCreated
```

the notification comes from AWS.

It's much more trustworthy.

---

# The biggest reason: Event-driven architecture

Imagine your company stores images.

When an image arrives, many things happen.

```text
Image Uploaded

↓

Generate thumbnail

↓

Run virus scan

↓

Extract metadata

↓

AI moderation

↓

Send notification

↓

Update search index
```

Without events

```text
Browser

↓

Backend

↓

Call Thumbnail Service

↓

Call Virus Service

↓

Call AI Service

↓

Call Search Service

↓

Call Notification Service
```

The upload API becomes huge.

Instead

```text
Browser

↓

S3

↓

ObjectCreated Event

↓

EventBridge/SNS/SQS

├── Thumbnail Worker
├── Virus Scanner
├── AI Moderation
├── Search Indexer
└── Notification Worker
```

This is why large companies love event-driven systems.

---

# What exactly is S3 Event Notification?

Think of it as

```text
S3

↓

"Hey everyone,

an object was created!"
```

S3 publishes an event.

You configure where it goes.

For example

```text
S3

↓

SQS
```

or

```text
S3

↓

SNS
```

or

```text
S3

↓

Lambda
```

or

```text
S3

↓

EventBridge
```

Your application then reacts asynchronously.

---

# For Dropbox interview

If you're designing Dropbox, I'd probably do this:

```text
Browser
    |
    | CompleteMultipartUpload
    v
S3

Browser
    |
    | POST /uploads/complete
    v
Backend
    |
    | Mark upload complete
    v
DB
```

**AND**

```text
S3 ObjectCreated

↓

Thumbnail Worker

↓

Virus Scan

↓

Extract EXIF

↓

Generate Preview

↓

Index Search
```

Notice the separation:

- **Client → Backend** updates the user's upload state and UI.
- **S3 Event Notification** kicks off asynchronous background processing.

---

# So is your design wrong?

Not at all.

For simply marking an upload as complete:

> **Client → Backend notification is enough** (provided the backend verifies the object exists).

S3 Event Notifications become valuable when you need:

- Recovery if the client disappears after a successful upload.
- A trusted source of object creation events.
- Decoupled, asynchronous processing (thumbnails, virus scans, indexing, AI, analytics, etc.).
- Support for uploads coming from multiple independent producers.

### Interview insight

If asked, "Should we use S3 Event Notifications to mark uploads complete?", a nuanced answer is:

> "Not necessarily. For user-facing upload completion, I prefer the client notifying the backend immediately after `CompleteMultipartUpload`, since it provides instant feedback. However, I would still use S3 Event Notifications as a reliable, event-driven mechanism for downstream processing and as a safety net to reconcile state if the client disconnects before notifying the backend."

That answer demonstrates you understand both the **synchronous user workflow** and the **asynchronous distributed systems workflow**, along with the trade-offs.

Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a5b5c49-be8c-83ee-8283-4ef931558c4b
