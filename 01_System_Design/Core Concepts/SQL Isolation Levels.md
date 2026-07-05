![[Pasted image 20260705073356.png]]

**Note : Isolation between transactions (how much transparency does transactions have between them)**

![[Pasted image 20260705073638.png]]
![[Pasted image 20260705074507.png]]![[Pasted image 20260705074847.png]]
![[Pasted image 20260705075016.png]]

**==So basically in SQL the fundamental isolation levels are**==

1. ==**Repeatable Read - Means that the value that is read first during a transaction is used as the base value throughout the transaction**==
2. ==**Read Committed - Transactions can see only the committed values across transactions**==
3. ==**Read Uncommitted - Transactions can see even uncommitted values across transactions**==
4. ==**Serializable - The outcome of concurrent transactions must be exactly the same as if they had executed one after another, in some serial order.==**

**95% of transactions use the database's default isolation level. For business-critical operations (payments, inventory, ticket booking, wallet transfers, etc.), applications don't usually raise the isolation level globally. Instead, they use targeted concurrency control techniques.**

Honestly from above only Read Committed and Repeatable Reads are important in production most important are techniques to handle concurrency

Those techniques include:

1. **`SELECT ... FOR UPDATE`** (Pessimistic Locking)
2. **Optimistic Locking** (Version Column)
3. **Atomic Conditional Updates** (Let the database perform the check and update in a single statement.)
4. **Database Constraints**

Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a49c3b0-f0a8-83ee-9e78-64ce89b373bc

These are the **4 most important concurrency control techniques** used in production SQL systems. Every system design interview expects you to know **when** to use each one and their trade-offs.

---

# 1. `SELECT ... FOR UPDATE` (Pessimistic Locking)

## Idea

Instead of assuming conflicts are rare, assume **someone else might modify the row**, so lock it immediately.

Think:

> "I'm going to edit this row. Nobody else can edit it until I commit."

The database places an **exclusive row lock**.

---

## Example

Imagine a wallet.

```
wallet
---------
id | balance
1  | 100
```

Two users withdraw ₹80 simultaneously.

### Without locking

Transaction A

```
SELECT balance FROM wallet WHERE id=1;
```

Gets

```
100
```

---

Transaction B

```
SELECT balance FROM wallet WHERE id=1;
```

Also gets

```
100
```

Both think money exists.

---

A updates

```
100 - 80 = 20
```

B updates

```
100 - 80 = 20
```

One withdrawal disappears.

---

## With FOR UPDATE

Transaction A

```sql
BEGIN;

SELECT balance
FROM wallet
WHERE id = 1
FOR UPDATE;
```

Database locks that row.

---

Transaction B

Runs

```sql
SELECT balance
FROM wallet
WHERE id = 1
FOR UPDATE;
```

It **waits**.

It cannot continue.

---

Transaction A updates

```sql
UPDATE wallet
SET balance = balance - 80
WHERE id = 1;

COMMIT;
```

Only now Transaction B proceeds.

Now it reads

```
20
```

Realizes

```
20 < 80
```

Reject withdrawal.

No inconsistency.

---

## Timeline

```
T1
----
Lock row
Read 100
Update ->20
Commit

T2
----
Wait...
Read 20
Reject
Commit
```

---

## Advantages

✔ Very safe

✔ Simple reasoning

✔ Prevents lost updates

✔ Good when conflicts are frequent

---

## Disadvantages

Users wait.

```
A
|
|------lock------|

B
     waiting.....
```

Many concurrent requests

↓

Waiting

↓

Lower throughput.

---

## Use Cases

- Payments
    
- Inventory
    
- Seat booking
    
- Wallets
    
- Banking
    

Basically:

> "Only one person may modify this row at a time."

---

# 2. Optimistic Locking (Version Column)

Instead of locking,

assume

> "Conflicts are rare."

Everyone can read simultaneously.

Only during update do we check if somebody changed it.

---

## Table

```
wallet

id
balance
version
```

```
1
100
5
```

---

Both transactions read

```
balance =100

version=5
```

---

Transaction A updates

```sql
UPDATE wallet
SET
balance=20,
version=6
WHERE
id=1
AND version=5;
```

Row updated.

---

Transaction B

Still thinks

```
version=5
```

Runs

```sql
UPDATE wallet
SET
balance=20,
version=6
WHERE
id=1
AND version=5;
```

Database checks

```
Current version = 6

WHERE version=5
```

No row matches.

```
0 rows updated
```

Application knows

> Someone already modified it.

Retry.

---

## Timeline

```
A read version 5

B read version 5

A updates -> version 6

B update fails

Retry
```

---

## Advantages

No locking.

Maximum concurrency.

Excellent throughput.

---

## Disadvantages

Sometimes update fails.

Application must retry.

---

## Common Uses

- User profile editing
    
- CMS
    
- Product catalog
    
- Documents
    
- Shopping cart
    

Basically

> "Conflicts almost never happen."

---

# 3. Atomic Conditional Updates

This is one of the most elegant SQL techniques.

Instead of

```
Read

Check

Update
```

Do everything in **one SQL statement**.

---

Inventory

```
quantity=5
```

Need

```
Buy 3
```

Instead of

```sql
SELECT quantity
```

then

```sql
UPDATE...
```

do

```sql
UPDATE inventory
SET quantity = quantity - 3
WHERE
id=10
AND quantity >= 3;
```

The database performs

- check
    
- update
    

atomically.

Nobody can sneak in between.

---

## Suppose

Current stock

```
2
```

Update

```sql
UPDATE inventory
SET quantity=quantity-3
WHERE quantity>=3;
```

Condition fails.

```
0 rows updated
```

Application knows

```
Out of stock
```

---

## Why is this powerful?

Because

```
Read

Business Logic

Update
```

becomes

```
Database does everything
```

No race condition.

---

## Example

Wallet

```sql
UPDATE wallet
SET balance = balance - 80
WHERE
id=1
AND balance>=80;
```

No lock needed.

If balance insufficient

```
0 rows updated
```

---

## Advantages

Very fast.

Very scalable.

Minimal locking.

No application race condition.

---

## Used in

- Inventory
    
- Wallet balance
    
- Credits
    
- Rate limiting counters
    
- Quotas
    
- Likes
    
- Counters
    

Whenever logic is

```
IF condition
THEN update
```

---

# 4. Database Constraints

Instead of trusting the application,

tell the database

> "This must NEVER happen."

The DB rejects invalid data automatically.

---

## Unique Constraint

```sql
email UNIQUE
```

Two users try

```
abc@gmail.com
```

Second insert fails.

---

## Check Constraint

```sql
CHECK(balance>=0)
```

If code does

```sql
UPDATE wallet
SET balance=-100;
```

Database rejects.

---

## Foreign Key

Cannot create

```
Order

user_id=999
```

if user doesn't exist.

---

## Primary Key

Cannot duplicate IDs.

---

## Example

Seat booking

```
seat_id

movie_id
```

Constraint

```sql
UNIQUE(movie_id, seat_id)
```

Two users insert simultaneously.

Only one succeeds.

Database guarantees consistency.

---

## Advantages

Impossible to bypass accidentally.

Works even if multiple services write to DB.

Protects against buggy code.

---

## Disadvantages

Constraint violations become runtime errors that your application must handle.

Some constraints can slightly reduce write throughput because the database must maintain additional indexes and perform validation.

---

# Comparing the Four Techniques

|Technique|Locks Rows?|Best When|What Happens on Conflict?|Typical Use Cases|
|---|---|---|---|---|
|`SELECT ... FOR UPDATE`|Yes|Conflicts are common; correctness is critical|Other transactions wait until the lock is released|Payments, inventory reservation, seat booking, banking|
|Optimistic Locking|No|Conflicts are rare|Update affects 0 rows because the version changed; application retries|User profiles, documents, product catalogs|
|Atomic Conditional Updates|Briefly, only during the update operation|The business rule can be expressed directly in SQL|Update affects 0 rows because the condition isn't met|Wallet debits, inventory decrements, quotas, counters|
|Database Constraints|Internal locking as needed to enforce the constraint|Data invariants must always hold|Database rejects the write with an error|Unique emails, preventing negative balances, referential integrity|

---

# How They're Used Together in Real Systems

These techniques are **not mutually exclusive**. Production systems often combine them:

- **Inventory reservation:** Use an atomic conditional update (`UPDATE ... SET quantity = quantity - 1 WHERE quantity > 0`) to prevent overselling, plus a `CHECK (quantity >= 0)` constraint as a safety net.
    
- **Seat booking:** Use a `UNIQUE` constraint on `(event_id, seat_id)` to ensure only one booking exists for a seat, and in some workflows use `SELECT ... FOR UPDATE` to lock related rows while completing a transaction.
    
- **User profile editing:** Use optimistic locking with a `version` column so concurrent edits don't silently overwrite each other.
    
- **Bank transfers:** Use `SELECT ... FOR UPDATE` on the affected account rows to serialize updates, along with constraints (such as preventing negative balances where appropriate) to enforce invariants.
    

## Interview rule of thumb

For most L4/L5 system design interviews:

- Default to the database's standard isolation level (often **Read Committed**).
    
- Reach for **atomic conditional updates** whenever your business rule can be expressed in a single SQL statement—they're simple and highly scalable.
    
- Use **optimistic locking** when concurrent updates are uncommon but you don't want users waiting on locks.
    
- Use **`SELECT ... FOR UPDATE`** when concurrent modifications are expected and correctness outweighs throughput.
    
- Back all critical invariants with **database constraints** so correctness doesn't depend solely on application code.
Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a49f4ec-1180-83ee-9ed9-1e940e3dcb1f