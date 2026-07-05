# A polished interview summary

If I were answering in an interview, I'd say:


> 1. Choose an immutable, high-cardinality **(key which should be immutable , used for almost all queries)** sharding key (typically `user_id` or `tenant_id`) and colocate related data on the same shard.
> 2. Distribute data using a deterministic routing strategy such as hashing or a shard map, ensuring even load and enabling future rebalancing.
> 3. Each shard is an independent PostgreSQL cluster with one primary and multiple replicas—sharding scales writes, while replication scales reads and provides high availability.
> 4. Design the schema so most queries stay within a single shard. Avoid cross-shard joins through data modeling, denormalization, or application-side composition.
> 5. Avoid distributed transactions by keeping transactional boundaries within a shard and using asynchronous patterns like Sagas when workflows span shards.
> 6. Use a routing layer (application logic, proxy, or shard map service) to direct requests to the correct shard.
> 7. Plan for online resharding and rebalancing from the beginning, since adding or splitting shards is one of the most challenging operational tasks.

Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a49cfd0-5db4-83ee-a8c1-c660ba8d9593

# How Does Live Resharding Work?

Suppose we add

```
Shard D
```

### Step 1

Update routing layer

```
Router↓KnowsUsers 1000–5000now belong to D
```

No data moved yet.

---

### Step 2

Background copy

Copy rows

```
Shard A↓Shard D
```

This happens slowly.

```
Millions of rows/hour
```

No downtime.

---

### Step 3

Dual writes

While migration is happening

New writes go to

```
Old shardANDNew shard
```

This keeps both copies synchronized.

---

### Step 4

Validation

Compare

```
Row countsChecksumsMissing rowsIndexes
```

Ensure both shards contain identical data.

---

### Step 5

Traffic switch

Router changes

```
Reads↓New shard
```

Old shard stops serving those keys.

---

### Step 6

Cleanup

Delete migrated rows from old shard.

Migration complete.

Reference - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac/c/6a49ed22-c954-83ee-884f-4eba5466d789