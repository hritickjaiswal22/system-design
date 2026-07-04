# How to Recognize the Pattern in an Interview (VIMP)

Is the input a SORTED array/string, asking for a pair/triplet
satisfying a sum/difference condition OR is it a "Container" problem where water/area is trapped between two boundaries, and the boundary heights dictate which side is the **==bottleneck==**?
        │
        ├── YES → Opposite-direction two pointer
        │
Is it a LINKED LIST, asking about cycles, middle node,
or "Nth from end"?
        │
        ├── YES → Fast-slow pointer
        │
Does it ask "modify array IN-PLACE, O(1) extra space,
without extra array"?
        │
        ├── YES → Same-direction read/write pointer
        │
Are there TWO separate sorted arrays/lists to combine/compare?
        │
        ├── YES → Merge-style two pointer

# 4 distinct mechanics.

1. Opposite-direction (converging)
2. Fast-slow (Floyd's)
3. Same-direction (read/write) (Both move forward, different speeds)
4. Merge-style (dual array)

# Container problem

![[Pasted image 20260704111635.png]]

