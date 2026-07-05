https://claude.ai/chat/5d84f8e2-c1e6-460b-84a3-d1c733eb16d8
# Composite B-Tree Indexes

A **Composite B-Tree Index** (also known as a multicolumn index) is a single B-Tree index built on two or more columns of a table.

If you frequently filter queries using the same combination of columns, a composite index can drastically speed up performance compared to searching through multiple single-column indexes.

## How They Work: The "Phonebook" Analogy

The most crucial thing to understand about a composite index is that **column order matters immensely.** PostgreSQL sorts the index data lexicographically—meaning it sorts by the first column, then by the second column within the first, then the third, and so on.

Think of a composite index on `(last_name, first_name)` exactly like a traditional printed phone book:

- All the "Smiths" are grouped together.
    
- Within the "Smith" section, they are sorted by their first name (Adam, Ben, Charlie).
    

Because of this structure, PostgreSQL can traverse the B-Tree efficiently if your query provides constraints from left to right.

## Pros & Cons

### Pros

- **High Efficiency:** Can satisfy complex queries with a single index scan instead of scanning and merging multiple single-column indexes.
    
- **Index-Only Scans:** If your query only selects columns that are part of the composite index, PostgreSQL can return the data directly from the index without touching the actual table heap.
    
- **Prefix Matching:** An index on `(A, B, C)` automatically acts as an index for just `(A)` or `(A, B)`. You get multiple index use cases for the price of one.
    

### Cons

- **Size and Overhead:** They take up more disk space and RAM than single-column indexes.
    
- **Write Penalty:** Every time a row is inserted, updated, or deleted on _any_ of the indexed columns, the composite index must be updated, which slows down write operations.
    
- **Strict Ordering:** They are highly inflexible if your query doesn't match the leading columns of the index definition.
    

## How and When to Use Them

### 1. Equality + Inequality Combos

If your query has an equality condition on one column and a range condition on another, place the **equality column first** and the **range column second**.

SQL

```
-- Optimal Index: CREATE INDEX idx_orders ON orders (user_id, created_at);
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2026-01-01';
```

### 2. Frequently Paired Columns

If your application almost always queries two columns together (e.g., `tenant_id` and `user_id` in a multi-tenant app), a composite index on `(tenant_id, user_id)` is a perfect fit.

### 3. Covering Queries (Index-Only Scans)

If you have a high-throughput query where you only need a couple of columns, adding the extra column to the index can prevent PostgreSQL from ever having to look at the table.

SQL

```
-- Index: CREATE INDEX idx_users_lookup ON users (email, username);
SELECT username FROM users WHERE email = 'test@example.com';
```

## When NOT to Use Them

### 1. When the Leading Column is Missing

If you create an index on `(last_name, first_name)`, and your query is:

SQL

```
SELECT * FROM users WHERE first_name = 'John';
```

PostgreSQL **cannot** efficiently use this index. It would be like trying to find everyone named "John" in a phone book without knowing their last names; you'd have to read the entire book.

### 2. When the Redundancy is High

Don't create an index on `(A, B)` if you already have an index on `(A)`. The composite index handles queries for `A` perfectly fine on its own. You can safely drop the single-column index on `A`.

### 3. High Write/Low Read Environments

If a table experiences thousands of inserts per second but is rarely queried using those specific column combinations, the overhead of maintaining a heavy composite index will hurt your database performance.

## Best Practices Checklist

- **Put the most restrictive/frequently used column first.**
    
- Limit composite indexes to **2 or 3 columns** in most scenarios. While PostgreSQL allows up to 32, indexes with 4+ columns are rarely efficient due to massive size and write overhead.
    
- Consider using `INCLUDE` clauses (`CREATE INDEX ... ON table (A) INCLUDE (B)`) if column `B` is only needed for the `SELECT` clause but isn't actually being used to filter (`WHERE`) or sort (`ORDER BY`) the data.

==**So basically**== 

==**Use only for columns which are actually used in WHERE, GROUP BY AND JOINs**==
==**Order matters a lot**==
==**Use INCLUDE for covering indexes for frequently accessed columns when creating composite index**==
==**Slows down writes**==

Source - https://gemini.google.com/app/dde3bc3c724fef71

# **Partial Indexes**

A **Partial Index** in PostgreSQL is an index built over a _subset_ of a table's rows rather than the entire table. It is defined by specifying a conditional `WHERE` clause when creating the index.

Only the rows that satisfy this condition are included in the index tree, making it incredibly efficient for specific, frequent queries.

## How They Work

Normally, when you create a B-Tree index, PostgreSQL maps every single row of the table into the index structure.

With a partial index, PostgreSQL evaluates the `WHERE` clause during writes (INSERT/UPDATE). If a row matches the condition, it gets indexed. When executing a query, the query planner checks if the query's `WHERE` clause is guaranteed by (or matches) the index's condition. If it does, PostgreSQL uses the smaller index to find the data instantly.

## Pros & Cons

### The Pros 👍

- **Massively Reduced Index Size:** Because you are only indexing a fraction of the data, the index takes up significantly less disk space and memory (RAM).
    
- **Faster Write Performance:** Since PostgreSQL doesn't need to update the index for rows that don't meet the condition, `INSERT`, `UPDATE`, and `DELETE` operations on those skipped rows are much faster.
    
- **Easier to Keep in RAM:** Smaller indexes are more likely to fit entirely into PostgreSQL’s shared buffers (RAM), leading to faster read times.
    

### The Cons 👎

- **Inflexible:** The index is only useful for queries that explicitly match or imply the index's `WHERE` clause. If your query filters for something slightly different, PostgreSQL will ignore the index.
    
- **Maintenance Overhead:** If you change your application logic, you might have to drop and recreate the partial index with a new condition.
    
- **Query Planner Reliance:** The query planner must be able to mathematically prove that the query is a subset of the index condition. Hardcoded values or specific structures are required for it to work reliably.
    

## How and When to Use Them

You create a partial index by appending a standard `WHERE` clause to your `CREATE INDEX` statement.

### Common Use Cases

#### 1. Indexing Filtered/Status Columns (The "Active" Data Pattern)

If you have a massive `orders` table, but 95% of your queries only care about `active` or `pending` orders, you don't need to index the millions of `completed` orders.

SQL

```
CREATE INDEX idx_orders_active_user_id 
ON orders (user_id) 
WHERE status = 'active';
```

- **Matches queries like:** `SELECT * FROM orders WHERE user_id = 42 AND status = 'active';`
    

#### 2. Excluding Nulls (To Save Space)

If you have a column that is mostly `NULL` (e.g., `referral_code`), and you only query rows where it exists:

SQL

```
CREATE INDEX idx_users_referral_code 
ON users (referral_code) 
WHERE referral_code IS NOT NULL;
```

#### 3. Enforcing Partial Uniqueness

If you want a column to be unique, but _only_ under a certain condition. For example, a user can only have one "primary" shipping address, but multiple secondary ones:

SQL

```
CREATE UNIQUE INDEX idx_unique_primary_address 
ON addresses (user_id) 
WHERE is_primary = true;
```

## When NOT to Use Them

- **When queries are highly dynamic:** If your application queries the table using a wide variety of changing filters, a partial index will likely be bypassed.
    
- **When the filter clause uses dynamic values:** You cannot use functions like `NOW()` or `CURRENT_DATE` in a partial index definition (e.g., `WHERE created_at > NOW() - INTERVAL '1 day'` is invalid because the index condition must be static).
    
- **When the conditional data distribution changes:** If a status like `'pending'` eventually grows to encompass 90% of the table, the partial index loses all its size and speed advantages over a normal index.

**==So basically**== 

==**Create with Binary index using WHERE clause**==
==**Helps to index a specific static subset of data**== 
==**Should be used only for FREQUENT specific static subset of data**== 
==**Useful for columns with lots of null data and want to frequently query non-null data==**

Reference - https://gemini.google.com/app/27b6f7fd5e28b9c4
# GIN Indexes

PostgreSQL’s **GIN (Generalized Inverted Index)** is a powerful tool designed for handling data types that contain multiple values within a single column—think arrays, JSONB, or full-text search documents.

Here is everything you need to know about how they work, their pros and cons, and when to deploy them.

## What is a GIN Index?

A standard B-Tree index maps a column value to a row. A **GIN index does the exact opposite: it maps the _components_ inside a column value to the rows they appear in.** Think of it like the index at the back of a textbook. Instead of searching through every page (a sequential scan) to find where a specific word is mentioned, you look up the word in the index, which immediately points you to the exact page numbers.

## How They Work

Instead of indexing the entire composite value (like the whole array or the entire JSON object), GIN splits the value into individual elements (keys, words, or array items).

1. **Extraction:** When a row is inserted, GIN uses an internal function to break the data into individual "keys" (e.g., splitting the array `['apple', 'banana']` into `'apple'` and `'banana'`).
    
2. **The B-Tree of Keys:** GIN stores these individual keys in a standard B-Tree structure.
    
3. **The Posting List/Tree:** Each key in the B-Tree points to a list of regular row identifiers (TIDs) where that key exists. If a key appears in a vast number of rows, the list converts into a "posting tree" (a mini B-Tree of row IDs) to keep lookups fast.
    

## Pros and Cons

### Pros

- **Multi-Value Efficiency:** It excels at indexing data structures where a single row can match multiple search criteria simultaneously.
    
- **Fast Read Queries:** Searching for a specific key inside a JSONB object or an element in an array is incredibly fast, even across millions of rows.
    
- **Flexible Search:** It supports complex queries, like checking if an array contains a specific subset of elements (`@>`), or matching multiple terms in full-text search.
    

### Cons

- **Slow Updates/Inserts:** Because one row might contain 50 words or 50 array elements, inserting _one_ row means GIN has to update 50 different parts of its index tree.
    
- **Large Index Size:** GIN indexes can become significantly larger than standard B-Tree indexes because they duplicate row references for every key extracted.
    
- **Write Buffer Overhead:** To mitigate slow writes, GIN uses a temporary `fastupdate` buffer. While this speeds up inserts, it means queries occasionally experience a performance dip when the buffer fills up and flushes to the main index.
    

## How and When to Use Them

Use GIN indexes when you are querying multi-valued data types and your workload is **read-heavy** or can tolerate slower write speeds.

### Common Use Cases:

1. **JSONB Documents:** When you need to query nested keys and values inside JSONB columns using operators like `@>`, `?`, `?|`, or `?&`.
    
2. **Full-Text Search (FTS):** When searching `tsvector` columns for specific words or combinations of words.
    
3. **Arrays:** When you frequently search arrays using the overlap (`&&`) or contains (`@>`) operators.
    

### Implementation Examples:

SQL

```
-- 1. Indexing an Array column
CREATE INDEX idx_user_tags ON users USING gin (tags);
-- Query that uses it: SELECT * FROM users WHERE tags @> ARRAY['postgres'];

-- 2. Indexing a JSONB column (Indexes all keys and values)
CREATE INDEX idx_books_data ON books USING gin (data);
-- Query that uses it: SELECT * FROM books WHERE data @> '{"author": "Stephen King"}';

-- 3. Indexing a JSONB column for specific path operations (jsonb_path_ops)
-- (Creates a smaller, faster index, but only supports the @> operator)
CREATE INDEX idx_books_data_path ON books USING gin (data jsonb_path_ops);
```

## When NOT to Use Them

- **Standard Scalar Data Types:** Never use GIN for simple data types like integers, text, timestamps, or uuids where you are doing basic comparisons (`=`, `<`, `>`). Use a **B-Tree** instead.
    
- **Write-Heavy Tables:** If your table handles thousands of inserts, updates, or deletes per second and write latency is critical, a GIN index will cripple your performance.
    
- **Low-Cardinality Arrays/JSON:** If your arrays only ever contain 1 or 2 static elements that don't vary much across rows, the overhead of a GIN index isn't worth it.
    
- **When `jsonb_path_ops` fits better:** If you are indexing JSONB but _only_ ever use the containment operator (`@>`), avoid the default GIN operator class. Use `jsonb_path_ops` because it is notably smaller and faster.

**==So basically use GIN index only for columns which stores**== 

==**JSON data or arrays of data or array of tags**==
==**And only create them if those type of searches are actually queried in production as**==
==**They have massive Write lag==**

Reference - https://gemini.google.com/app/9717e6d1d6784c27
