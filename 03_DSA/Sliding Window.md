# The 4 Recognition Signals

SIGNAL 1 — The word "subarray" or "substring"
───────────────────────────────────────────────
  Any question about a contiguous portion of an array/string
  is a sliding window candidate. Always.


SIGNAL 2 — Optimization over a contiguous range
────────────────────────────────────────────────
  "Find the LONGEST / SHORTEST / MINIMUM / MAXIMUM
   subarray/substring that satisfies [condition]"

  The optimization keyword + contiguous range = very high probability.


SIGNAL 3 — A constraint that acts as a "budget"
────────────────────────────────────────────────
  "at most K distinct elements"
  "sum equals target"
  "at most K replacements allowed"
  "contains all characters of T"

  A budget you're tracking while scanning = sliding window.


SIGNAL 4 — Brute force is O(n²) with nested loops
───────────────────────────────────────────────────
  If your first instinct is "outer loop picks start,
  inner loop picks end" → that's the O(n²) signal.
  Sliding window is the O(n) upgrade to that exact pattern.

# The fix: Constraint Extraction Drill

Before writing a single line of code on any unseen problem, answer these 5 questions out loud. Force yourself. Time limit: 3 minutes.

1. What is the input structure?

(array of ints / string / binary array)

2. What am I optimizing?

(max length / min length / count / exists?)

3. What is the constraint on a valid window?

(sum ≥ k / at most k distinct / no repeats /

window_size - maxFreq ≤ k)

4. Is this constraint monotonic?

(if I grow the window, does it only get worse/better

in one direction? YES → sliding window works)

5. What breaks my window?

(this IS your shrink condition — write it explicitly)

If you can answer Q3 and Q5 before coding, you will solve the problem. Every time. The code is just mechanical after that.


# The types of Sliding Window problems

1. **Fixed-size window** - Window size k is given. Pure mechanical sliding — no shrink logic. Master this template first.
2. **Variable-size window (expand + shrink)** - The core dynamic pattern. Grow right freely, shrink left when constraint breaks.
3. **Sliding window with frequency map** - Anagrams, permutations, character matching. Maintains a freq hashmap as window state.
4. **Longest/shortest with replacement budget (k-budget windows)** - The "you can change at most k elements" family. Non-obvious window invariant — separates 16 LPA from the rest.
5. **Exactly K / at-most-K meta-trick - exactlyK = atMostK − atMost(K−1).**  - The insight that unlocks a whole class of "count subarrays" problems.
6. **Sliding window with monotonic deque** - A completely different sub-skill. When you need the max/min inside each window in O(1). Separate pattern, separate template.
7. **Prefix sum + sliding window hybrid** - Where pure sliding window breaks down (negatives, non-monotonic sums). Prefix sums do the range math; window finds the target.

# The Elimination Test (Rule Out Other Patterns First)

Before committing to sliding window, verify:

  Does the answer require CONTIGUOUS elements?
  → NO  → probably two-pointer on sorted array, or DP

  Does the problem scan LEFT TO RIGHT without jumping?
  → NO  → probably binary search or graph

  Is there a "running state" I track as I scan?
  → NO  → might just be a simple linear scan

  All YES? → Sliding Window. Commit.

# The 3-Step "In the Wild" Checklist for Exactly(k) = Atmost(k) - Atmost(k - 1)

1. It asks for a contiguous "Subarray", not a "Subsequence"
	Why this matters: A sliding window only works if the elements are side-by-side. If the problem allows you to skip elements or reorder them (subsequences/subsets), this trick is instantly disqualified.

2. It asks you to COUNT total valid subarrays, rather than finding a Max/MinWhy this matters:
	If a problem asks for the maximum length of a subarray with exactly $K$ elements, you don't need this trick. You can just use a standard sliding window or hash map to find the longest one.

	But if it asks, "How many total subarrays exist that satisfy X?", your brain should immediately think about accumulating window sizes (right - left + 1).

3. The constraint is "Exactly $K$" on a property that grows when you add elements

	Why this matters: Think about what happens when you expand a sliding window to the right. Properties like the number of distinct integers, the sum of positive numbers, or the count of odd numbers can only stay the same or increase. They can never decrease when you add elements.


Because the property only goes up, an "Exactly $K$" constraint is incredibly awkward. If you have exactly $K$ elements, expanding further might break it, but shrinking from the left might also break it. You are trapped.
The realization: While "Exactly $K$" is unpredictable, "At Most $K$" is perfectly predictable (monotonic). If a window has $\le K$ distinct elements, shrin