# Fan-out on write

Symptom: Many users need to see updates from many other users. Example: Twitter timeline.

Solution: When a user posts, push the post to follower timelines/caches.

Tradeoff: Write amplification. Bad for celebrities or huge follower counts.

When to avoid: Very skewed follower distribution.

Related pattern: Hybrid fan-out, fan-out on read, celebrity problem.