[DynamoDB](https://aws.amazon.com/dynamodb/) is a fully-managed, highly scalable, key-value service provided by AWS. Cool, buzz-words. But what the hell does that mean and why does it matter?

- **Fully-Managed** - This means that **==AWS takes care of all the operational aspects==** of the database. The fully-managed nature allows AWS to handle all operational tasks — hardware provisioning, configuration, patching, and scaling — **freeing developers to concentrate on application development.**
- ==**Highly Scalable - DynamoDB can handle massive amounts of data and traffic. It automatically scales up or down to adjust to your application's needs, without any downtime or performance degradation.**==
- **Key-value** - DynamoDB is a **NoSQL** database, which means it doesn't use the traditional relational database model. Instead, **==it uses a key-value and document database model that allows for flexible data storage and retrieval.==**

The moral of the story is that DynamoDB is a super easy to use and can scale to support a wide variety of applications. For system design interviews in particular, it has just about everything you'd ever need from a database. **==It even supports transactions now!==** Which neutralizes one of the biggest criticisms of DynamoDB in the past.

# The Data Model

Unlike traditional RDBMS, DynamoDB is **==schema-less==**, **==meaning you don't need to define a schema before inserting data. This means items in the same table can have different sets of attributes, and new attributes can be added to items at any point without affecting existing items. This schema-less design provides high flexibility but requires careful data validation at the application level==**, as DynamoDB does not enforce attribute uniformity across items.

Consider a users table in DynamoDB, structured as follows:

```
{
  "PersonID": 101,
  "LastName": "Smith",
  "FirstName": "Fred",
  "Phone": "555-4321"
},
{
  "PersonID": 102,
  "LastName": "Jones",
  "FirstName": "Mary",
  "Address": {
    "Street": "123 Main",
    "City": "Anytown",
    "State": "OH",
    "ZIPCode": 12345
  }
},
{
  "PersonID": 103,
  "LastName": "Stephens",
  "FirstName": "Howard",
  "Address": {
    "Street": "123 Main",
    "City": "London",
    "PostalCode": "ER3 5K8"
  },
  "FavoriteColor": "Blue"
}
```

Each item represents a user with various attributes. Notice how some users have attributes not shared by others, like FavoriteColor, showing DynamoDB's flexibility in attribute management.

In DynamoDB, data is organized into tables, where each table has multiple items that represent individual records. This is just like a relational database, but with some distinct differences tailored for scalability and flexibility.

**Tables** - Serve as the top-level data structure in DynamoDB, each defined by a mandatory primary key that uniquely identifies its items. Tables support secondary indexes, enabling queries on non-primary key attributes for more versatile data retrieval.

**Items** - Correspond to rows in a relational database and contain a collection of attributes. Each item must have a primary key and can contain up to 400KB of data, including all its attributes.

**Attributes** - Key-value pairs that constitute the data within an item. They can vary in type, including scalar types (strings, numbers, booleans) and set types (string sets, number sets). Attributes can also be nested, allowing for complex data structures within a single item.

DynamoDB stores **Items**.

An Item is

```
Primary Key
+
Attributes
```

The **key** is simply the primary key.

Everything else belongs to the value.

## Flexible schema

Another important feature:

Item 1

```
PK = 101

{
    FirstName
    LastName
}
```

Item 2

```
PK = 102

{
    FirstName
    Address
}
```

Item 3

```
PK = 103

{
    FirstName
    FavoriteColor
    Phone
}
```

This is perfectly valid.

Only the primary key is mandatory.

Everything else is optional.

---

## Isn't this exactly MongoDB?

Very similar at first glance, but there is a major difference.

MongoDB stores **documents** and lets you query almost any field with appropriate indexes.

Example:

```
db.users.find({
    FavoriteColor: "Blue"
})
```

or

```
db.users.find({
    "Address.City": "London"
})
```

DynamoDB doesn't work like that.

You **must design around access patterns**.

If you need to retrieve users by `Address.City`, you typically need to model that with a suitable primary key or create a Global Secondary Index (GSI). Arbitrary querying across document fields is not DynamoDB's strength.

### MongoDB

Suppose you have

```
{
  "_id": 101,
  "name": "Fred",
  "city": "London",
  "favoriteColor": "Blue"
}
```

You can do

```
find({ city: "London" })

find({ favoriteColor: "Blue" })

find({ age: { $gt: 25 } })

find({
    city: "London",
    favoriteColor: "Blue"
})
```

If these become common queries, you add indexes on those fields.

The data model generally doesn't need to change.

---

### DynamoDB

Suppose you store

```
{
  "PersonID": 101,
  "City": "London",
  "FavoriteColor": "Blue"
}
```

You **cannot** efficiently say

```
Give me everyone in London.
```

unless `City` is:

- the partition key,
- the sort key,
- or part of a GSI/LSI that you created specifically for that access pattern.

Otherwise, your only option is a **Scan**, which reads the entire table and filters afterward—something you generally avoid in production for large datasets.

---

## This is why DynamoDB starts with access patterns

When designing a DynamoDB table, you don't begin with:

> "What does my entity look like?"

Instead, you begin with:

> "How will my application read this data?"

For example:

```
Access Pattern 1:
Get user by ID

Access Pattern 2:
Get users by company

Access Pattern 3:
Get active users by company

Access Pattern 4:
Get latest orders for a user
```

Those access patterns determine your primary key and any GSIs.


**==So basically with MongoDB if any attribute's query become very popular we can add it as index and get efficiency for it BUT With DynamoDB the primary key or secondary index should be defined at the time of creation otherwise it becomes a huge pain to optimize for any random attribute==**

Further Reading - https://chatgpt.com/g/g-p-6a49c2f6acc88191b2b24496fa57d7ac-system-design-masterclass-target-20-lpa/c/6a5a32d9-bf00-83ee-abb1-b55899c06ab9