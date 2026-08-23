So the generic payment flow is 

1. User submits 'buy' button
2. The request reaches reaches our server where we update one or more tables with a entry with in-progress status
3. Return the generated id to client 
4. Upon receiving it the client redirects the user to payment page 
5. User enter card details where the client uses (SDK of the payment processor) and the details are not send to our server rather to the payment processor then the details are tokenized along with the id and these tokes details and id is sent to our server
6. Our server then updates the status to reserved (if required depending on product flow) + uses these tokens + id to create a payment intent and requests the payment processor to complete the transaction
7. The payment processor then completes the transaction (network/bank) and then calls the appropriate webhook (server to server communication)
8. Upon requesting the webhook our server updates the status to booked or sold or cancelled or failed according to webhook 
9. Transaction is hence completed

The webhook that payment processor uses must be **==idempotent==** (calling it multiple times should not have any side-effects) since it may happen that payment processor server calls the webhook multiple times

And while this process completes the client after submitting card or payment details is redirected to a waiting/status page which regularly polls(exponential backoff + jitter) the server for status update.

Note - webhook is the thing that updates our system that status needs to be changed if our system does not receive webhook (lets say ever) then our system should after some time (let's say 10mins) should apply for refund or whatever is applicable

The important distinction is:

> **Webhook = primary asynchronous notification. Reconciliation/timeout mechanism = safety net.**

Suppose:

```text
Booking B123
status = IN_PROGRESS
expiresAt = 10 minutes
```

Payment succeeds at the provider, but the webhook **never reaches your system**.

Your DB still says:

```text
Booking = IN_PROGRESS
Ticket = RESERVED
```

while the payment provider says:

```text
Payment = SUCCESS
```

That's a **distributed-systems consistency problem**.

### You need a reconciliation mechanism

For example:

```text
                Payment Provider
                       │
             ┌─────────┴─────────┐
             │                   │
          Webhook             API
             │                   │
             ▼                   ▼
        Booking Service ← Reconciliation Job
             │
             ▼
           Database
```

Your background worker periodically finds suspicious bookings:

```text
IN_PROGRESS
AND
expiresAt < now()
```

Then it **doesn't blindly refund**.

It asks the payment provider:

> "What is the actual payment status for booking B123/payment P456?"

### Case 1 — Payment never happened

```text
Provider: PAYMENT_NOT_FOUND / FAILED
```

Then:

```text
Booking → EXPIRED / FAILED
Ticket  → AVAILABLE
```

No refund necessary.

### Case 2 — Payment succeeded

```text
Provider: SUCCESS
```

Now you have a problem: the user **paid**, but your booking system hasn't confirmed the ticket.

The reconciliation worker can safely finalize:

```text
Booking → CONFIRMED
Ticket  → SOLD
```

If the business rules say the reservation can no longer be honored, then you may instead:

```text
Payment SUCCESS
      ↓
Booking cannot be fulfilled
      ↓
Refund
```

But **refund is a business decision**, not an automatic consequence of "webhook missing."

### Case 3 — Payment is still processing

```text
Provider: PENDING
```

Keep the booking in an appropriate pending state and retry reconciliation later.
