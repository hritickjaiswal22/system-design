## Binary Search — Recognition Signals & Exhaustive Pattern Taxonomy

You already have the correct reframe from earlier work: **the precondition is a monotonic predicate over a search space — not "the array is sorted."** Sorted array is just the most common _instance_ of a monotonic predicate. Everything below builds on that. If you're pattern-matching on "is this array sorted?" you're solving 40% of what shows up in a 16+ LPA loop. The other 60% is binary search where there's no array at all — just a value space and a `isFeasible(x)` function.

So basically for any problem to be a binary search problem it MUST have

- **There is an ordered search space.**
- **There is a monotonic predicate over that search space.**

## Requirement 1: Ordered search space

There must be something you can arrange in increasing/decreasing order.

Examples:

```
Indices:
0 1 2 3 4

Numbers:
1 2 3 4 5

Capacities:
1...1000

Speeds:
1...1e9

Days:
1...1e9
```

Binary search always searches over some ordered domain.

## Requirement 2: Monotonic predicate

The predicate must change only once.

Either

```
F F F F T T T
```

or

```
T T T F F F
```

That's the key property that lets you discard half of the search space.

---

## Part 2: Exhaustive Pattern List

### Cluster A — Classic Index Search

|Pattern|Recognition|Example|
|---|---|---|
|Exact match|Sorted array, find target|Standard binary search|
|Search Insert Position|Sorted array, find where target _would_ go|LC 35|
|Search in Rotated Sorted Array|Sorted array rotated at unknown pivot, one discontinuity|LC 33|
|Search in Rotated Sorted Array w/ Duplicates|Same, but duplicates break the "which half is sorted" check|LC 81|
|Order-agnostic search|Told array is sorted but not told ascending/descending|Compare `arr[lo]` vs `arr[hi]` first|

### Cluster B — Boundary / Predicate Search

|Pattern|Recognition|Example|
|---|---|---|
|First/Last Occurrence|"Find first and last position of X"|LC 34|
|Lower Bound / Upper Bound|Count of elements ≤/< X|Building block for many others|
|Find Minimum in Rotated Sorted Array|Rotated array, find the pivot itself|LC 153|
|Find Peak Element|Bitonic / local-max, neighbors define direction|LC 162|
|Single Element in Sorted Array|Every element appears twice except one — use index-parity as the predicate|LC 540|
|Find K Closest Elements|Binary search for the left boundary of a window|LC 658|

### Cluster C — Binary Search on Answer (the interview differentiator)

This is index-space vs value-space — you're not searching an array, you're searching a _range of possible answers_ using a feasibility function.

|Pattern|Feasibility check|Example|
|---|---|---|
|Koko Eating Bananas|"Can Koko finish all piles at speed X within H hours?"|LC 875|
|Capacity to Ship Packages Within D Days|"Can we ship all packages within D days at capacity X?"|LC 1011|
|Split Array Largest Sum|"Can we split into ≤ M subarrays each with sum ≤ X?"|LC 410|
|Painter's Partition / Book Allocation|Same shape as Split Array, classic in Indian interview circuits|GfG classic|
|Minimize Max Distance to Gas Station|Real-valued binary search on distance|LC 774 (premium)|
|Aggressive Cows|"Can we place C cows with min distance ≥ X?"|Classic SPOJ/CodeChef|
|Smallest Divisor Given a Threshold|"Does dividing by X keep sum ≤ threshold?"|LC 1283|
|Kth Smallest Element in Sorted Matrix|Binary search on _value_, count elements ≤ mid via matrix staircase walk|LC 378|
|Kth Smallest Pair Distance|Binary search on distance value, count pairs ≤ mid via two-pointer|LC 719|
|Median of Two Sorted Arrays|Binary search on the _partition index_, not a value — hardest in this cluster|LC 4|

**Why this cluster matters more than the others:** almost every "optimize this" question in a real system-design-adjacent coding round (rate limiting thresholds, resource allocation, load balancing capacity) reduces to this shape. If you can say out loud _"the answer space is monotonic because increasing capacity never makes a feasible allocation infeasible, so I'll binary search on capacity and write an O(n) feasibility check"_ — that sentence alone signals seniority.

### Cluster D — Real-Number / Precision Binary Search

|Pattern|Recognition|Example|
|---|---|---|
|sqrt(x), Nth root|Continuous search space, need epsilon precision|LC 69|
|Pow(x, n)|Not strictly binary search but often paired in interviews (fast exponentiation)|LC 50|

### Cluster E — Interactive / API-constrained

| Pattern                      | Recognition                                                                          | Example |
| ---------------------------- | ------------------------------------------------------------------------------------ | ------- |
| Guess Number Higher or Lower | You call a black-box comparator, minimize calls                                      | LC 374  |
| Find in Mountain Array       | Interactive API + bitonic structure, combine Template 3 with call-budget constraints | LC 1095 |

### Cluster F — Matrix-Specific

|Pattern|Recognition|Example|
|---|---|---|
|Search a 2D Matrix I|Fully sorted if flattened → treat as 1D binary search with index math|LC 74|
|Search a 2D Matrix II|Sorted rows AND columns, but _not_ fully sorted flattened → staircase search (not pure binary search — know the distinction)|LC 240|
|Kth Smallest in Sorted Matrix|Cluster C + F combined|LC 378|

This is a **very good classification**, but if your goal is **16+ LPA interview preparation**, I'd make one important change.

Don't memorize **40 different problems**.

Instead, memorize **6 fundamental binary search patterns**. Almost every interview question is a variation of one of these.

# Binary Search Pattern 1 — Exact Search

## Search Space

Array indices

## Goal

Find one exact element.

## Predicate

```text
arr[mid] == target ?
```

Examples

- LC 704 - Binary Search
    
- Order Agnostic Binary Search
    

Recognition:

> "Find X in a sorted array."

---

# Binary Search Pattern 2 — Boundary Search (First / Last True)

This is one of the most important patterns.

Instead of finding an element,

you're finding **where a condition changes**.

Predicate looks like

```text
FFFFFTTTTT
```

or

```text
TTTTTFFFFF
```

Examples

- First occurrence
    
- Last occurrence
    
- Lower Bound
    
- Upper Bound
    
- Search Insert Position
    

Recognition:

> "Find the first..."
> 
> "Find the last..."
> 
> "Find the smallest index..."

---

# Binary Search Pattern 3 — Modified Sorted Array

The array is **almost sorted**, but something special happened.

Examples

- Rotated Sorted Array
    
- Rotated Array II
    
- Find Minimum in Rotated Array
    
- Mountain Array search
    

Recognition

> "The array was originally sorted..."

This family requires identifying which half still preserves enough order to discard the other half.

---

# Binary Search Pattern 4 — Binary Search on Answer ⭐

This is the most important interview pattern.

Search Space

```text
Possible answers
```

Examples

```text
Speed

Capacity

Distance

Days

Maximum Sum

Minimum Cost
```

Predicate

```ts
isFeasible(answer)
```

returns

```text
FFFFTTTT
```

Examples

- Koko
    
- Ship Packages
    
- Split Array
    
- Aggressive Cows
    
- Painter Partition
    
- Book Allocation
    
- Smallest Divisor
    
- Gas Station
    
- Bouquet Days
    

Recognition

The question asks

> "What is the minimum..."

or

> "What is the maximum..."

and checking one candidate answer is much easier than computing the optimal answer directly.

---

# Binary Search Pattern 5 — Binary Search on Value

This looks similar to Pattern 4, but the objective is different.

You're **not checking feasibility**.

Instead you're asking

> "How many values are ≤ X?"

Examples

- Kth Smallest in Sorted Matrix
    
- Kth Smallest Pair Distance
    

Typical predicate

```text
count(mid) >= k
```

instead of

```text
isFeasible(mid)
```

Recognition

Questions involving:

- kth smallest
    
- kth largest
    
- median
    
- rank
    
- order statistics
    

where counting is efficient.

> **Note:** You can think of this as a specialized form of "binary search on answer," but it's useful enough to recognize separately because the helper function is a **counting function** rather than a feasibility check.

---

# Binary Search Pattern 6 — Continuous Binary Search

Search Space

```text
Real numbers
```

Examples

- sqrt(x)
    
- nth root
    
- floating-point optimization
    

Stopping condition

```text
high - low < epsilon
```

instead of

```text
low <= high
```

Recognition

Answers require decimal precision.

---

# Where do the remaining problems fit?

|Problem|Fundamental Pattern|
|---|---|
|Exact Search|Pattern 1|
|Search Insert Position|Pattern 2|
|Lower Bound|Pattern 2|
|Upper Bound|Pattern 2|
|First Occurrence|Pattern 2|
|Last Occurrence|Pattern 2|
|Rotated Array|Pattern 3|
|Rotated Array II|Pattern 3|
|Find Minimum Rotated|Pattern 3|
|Mountain Array|Pattern 3|
|Koko|Pattern 4|
|Ship Packages|Pattern 4|
|Split Array|Pattern 4|
|Book Allocation|Pattern 4|
|Painter Partition|Pattern 4|
|Aggressive Cows|Pattern 4|
|Smallest Divisor|Pattern 4|
|Bouquet Days|Pattern 4|
|Gas Station|Pattern 4 / 6 (depending on implementation)|
|Kth Smallest Matrix|Pattern 5|
|Kth Pair Distance|Pattern 5|
|Median of Two Sorted Arrays|**Special partition-based binary search**|
|Search Matrix|Pattern 1|
|Guess Number|Pattern 1|
|Peak Element|**Direction-based binary search** (can be viewed as a special case where the slope determines which half contains a peak)|
|Single Element|**Invariant/parity-based binary search**|

## Two notable special cases

Two problems don't fit neatly into the six broad buckets:

- **Median of Two Sorted Arrays (LC 4):** This uses binary search on the **partition index**, maintaining the invariant that the left partition contains exactly half the elements. It's widely considered a category of its own because the predicate is based on partition validity rather than a simple boundary or feasibility check.
    
- **Single Element in a Sorted Array (LC 540):** The key idea is an **index parity invariant**. Pairs line up differently before and after the unique element, and binary search exploits that invariant.
    

---

## The mental model to carry into interviews

When you read a problem, ask these questions in order:

1. **What is my search space?**
    
    - Indices?
        
    - Possible answers?
        
    - Values?
        
    - Real numbers?
        
    - Partition positions?
        
2. **Can I define a monotonic predicate or invariant?**
    
    - `FFFFTTTT`
        
    - `TTTTFFFF`
        
    - Or another property that lets me safely discard half the search space (such as parity or partition validity).
        
3. **After checking `mid`, can I always eliminate half the search space?**
    

If the answer to the third question is **yes**, you're very likely looking at a binary search problem. That's the underlying idea connecting all of these patterns.

---
## Part 3: Recognition Signals

Ask these in order. The first one that fires tells you which cluster you're in.

| Signal                                                                                                                                           | What it means                     | Cluster |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------- |
| Array is explicitly sorted, find exact value/index                                                                                               | Classic search                    | A       |
| "Find first/last position of X", "insertion point", "lower/upper bound"                                                                          | Boundary search                   | B       |
| Array is sorted but rotated / has one discontinuity                                                                                              | Modified classic search           | A       |
| "Find peak", array is bitonic (increases then decreases)                                                                                         | Neighbor-predicate search         | B       |
| 2D grid, each row and/or column sorted                                                                                                           | Matrix search                     | F       |
| **"Minimize the maximum ___" / "maximize the minimum ___"**                                                                                      | Binary search on answer           | C       |
| "Find the smallest/largest X such that [condition] holds" — X is _not_ an array index, it's a value in a range (capacity, speed, days, distance) | Binary search on answer           | C       |
| Brute force is "try every possible answer and check feasibility in O(n)" → total O(n²) or worse, and answer space is monotonic                   | Binary search on answer           | C       |
| Need a value to some precision (sqrt, nth root, pow)                                                                                             | Real-number binary search         | D       |
| "Kth smallest/largest" combined with a matrix, pair of arrays, or distance metric                                                                | Binary search on value + counting | C/F     |
| You're told "you may call this API/function at most O(log n) times"                                                                              | Interactive binary search         | E       |

**The single highest-leverage habit to build:** when you see an optimization word — _minimize, maximize, smallest, largest, at least, at most_ — paired with a _feasibility check_ that's monotonic (if X works, does X+1 also work, or does X-1 also work?), your first move should be "can I binary search the answer space?" before reaching for DP or greedy. This is the single most under-recognized pattern at the senior level — juniors see "minimize max" and reach for DP; the O(n log(max-min)) binary-search-on-answer solution is what separates a 16+ LPA candidate.

---

## Part 4: The Three Core Templates

Internalize these as muscle memory. Every problem below reduces to one of these three loop shapes. Get the boundary conditions wrong and you'll waste 5 minutes in an interview debugging an infinite loop.

### Template 1 — Exact Match (`lo <= hi`)

Used when the target may not exist and you need to distinguish "found" from "not found."

```
function exactSearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // overflow-safe
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1; // lo == hi + 1, no match
}
```

### Template 2 — First True Boundary (`lo < hi`)

Used for "find the first index/value where predicate becomes true." This is the workhorse for cluster B and C.

```
function firstTrue(lo, hi, predicate) {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (predicate(mid)) hi = mid;       // mid could be the answer, keep it in range
    else lo = mid + 1;                  // mid is definitely not the answer
  }
  return lo; // lo === hi, this is the first true
}
```

```
Search space:  [F, F, F, F, T, T, T, T]
Index:          0  1  2  3  4  5  6  7
                          ^
                first True → this is `lo` when loop ends
```

### Template 3 — Neighbor-Comparison (peak-finding)

Used when there's no absolute predicate, only a _local_ comparison (bitonic arrays, peak element).

```
function findPeak(lo, hi, isDescendingAfter) {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (isDescendingAfter(mid)) hi = mid;   // slope going down, peak is at or before mid
    else lo = mid + 1;                       // slope going up, peak is after mid
  }
  return lo;
}
```

**Debugging checklist when your loop misbehaves:**

- Infinite loop → check if `mid` can equal `lo` when you set `lo = mid` (it should always be `lo = mid + 1` unless you also change the mid formula to round up)
- Off-by-one on the answer → verify what invariant `lo` and `hi` hold at _every_ iteration, not just at the end. Write it as a comment above the loop before you code it.
- Wrong initial `hi` → for boundary search on values (cluster C), `hi` must be a value known to satisfy the predicate (feasible), and `lo - 1` must be known to be infeasible. Get this wrong and the algorithm silently returns garbage.

---

---

## Part 5: Junior Habits to Kill Now

- **Reaching for DP before checking monotonicity.** "Minimize the maximum" is the #1 tell you're about to over-engineer with DP when O(n log(range)) binary search on answer solves it cleanly.
- **Writing `mid = (lo + hi) / 2`** instead of `lo + (hi - lo) / 2`. Integer overflow is a non-issue in JS practically, but say the safe version out loud anyway — interviewers at this bar notice the habit.
- **Not stating the loop invariant before coding.** At a 16+ LPA bar you're expected to say "I'm maintaining the invariant that `lo` is always infeasible and `hi` is always feasible" _before_ writing a single line. Silent coding reads as pattern-memorization, not understanding.
- **Conflating Template 1 and Template 2.** If you're not 100% sure the target exists, Template 1 (`lo <= hi`, return -1) is correct. If you're finding a boundary that's guaranteed to exist within `[lo, hi]`, Template 2 is correct. Mixing them is the most common bug I'd flag in a live round.
- **Forgetting to verify feasibility bounds in Cluster C.** Before you binary search on answer, you must be able to state: "at `hi`, the predicate is definitely true; at `lo - 1`, it's definitely false." If you can't justify both ends, you haven't earned the right to binary search yet.

---

## Next Step

Once you've internalized the recognition table, the move is: I give you 3-4 problems per cluster (starting with C, since it's the highest-leverage and least practiced), you solve without hints, we do post-failure diagnosis on whichever ones you miss. Say the word when you want the first batch — and tell me if you want to start with Cluster C directly given it's the differentiator, or go in order A→F for completeness.


References 

https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a5485d3-d9fc-83ee-a4d8-753589e39e6f
https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a548f62-7294-83ee-b706-1df8324e3fb4