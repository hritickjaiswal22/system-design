---
type: Core Concept
status: Studying
tags:
  - system-design
  - core-concept
Instruction: Each Answer should be in your own words NOT FUCKING AI and NOT MORE THAN 2-3 LINES
created:
updated:
---
## What it is (2-3 lines, your own words, not the textbook's)

Handling large binary/blobs data transfers between client-server or systems.

---

## Problem it solves

The problem with Large File Uploads to DB directly are

1. If a network issue happens at (90%) or in-between entire progress lost
2. Connection timeouts - proxies and app servers have Connection timeouts in seconds large uploads requires at least mins if not hours
3. Storing raw bytes in DB leads to catastrophic decrement in db performance think each query requires entire file reads

---

## When to use 

Use these **==4 Moves (DB only store metadata, pre-signed urls to keep data bytes away from app server, chunk file uplods and use of CDN for public data)==** whenever any system moving large blobs follows this shape.

---

## When not to use

N/A

---


## Key trade-off

1. The key trade off is that each file chunk upload requires 2-3 separate network requests so in cases of large number of chunks the number of network requests explode

---

## Interview-ready answer


---

## Came up in

1. Dropbox / Mega
2. Youtube 

---

## How it works (If can be explained in 2-3 lines otherwise Depth Dump)

To solve above mentioned problems for Large File Uploads

1. Do not store file data in DB only file meta data (e.g. S3 file object key)
2. Use parallel chunked file uploads which allows for transfers resumable
3. Use pre-signed urls (plural) for each chunk file upload to keep data bytes away from app server **(the client uploads directly to storage)**.
4. Use CDN for public data while use app server to provide pre-signed download urls