# Exact DTW movement-sequence comparison

Milestone 6 turns every retained hand frame into a vector of 441 angles. The
result for one hand is therefore a numeric matrix:

```text
number[retained frames][441 angle features]
```

Milestone 7 compares two such matrices with two generic operations. **Manhattan
Vector Distance** compares two individual frames. **DTW Distance** compares the
complete frame sequences. Neither operation knows that the values originated
from MediaPipe or represent a sign.

## Local frame distance

For equal-width vectors `a` and `b`, Manhattan/L1 distance is:

```text
d(a,b) = |a₀-b₀| + |a₁-b₁| + ... + |aₖ-bₖ|
```

For the Milestone 6 representation, each local comparison contains 441
absolute differences. The result is not divided by 441.

## Exact Dynamic Time Warping

DTW builds an accumulated-cost matrix. Let `c(i,j)` be the Manhattan distance
between frame `i` from sequence A and frame `j` from sequence B:

```text
D(0,0) = c(0,0)
D(i,j) = c(i,j) + min(D(i-1,j), D(i,j-1), D(i-1,j-1))
```

Cells outside the matrix are treated as infinity. The returned value is the
last cell, `D(n-1,m-1)`: the lowest accumulated alignment cost. It is not
normalized by the path length, sequence length, feature count, or any other
quantity.

Because the recurrence may repeat frames while moving horizontally or
vertically through the matrix, it can align two performances in which one
student moves through the gesture faster or slower than the other.

Both inputs must be nonempty `number[][]` sequences. Every frame must be a
nonempty finite vector, and all frames in both sequences must have the same
width. Empty or malformed input is an error, not a distance of zero or
infinity.

## Performance safeguard

Exact DTW performs approximately `n × m × dimension` component comparisons
and stores an `n × m` accumulated-cost matrix. The browser runtime rejects work
above 25,000,000 component comparisons. This is a work-based limit rather than
an arbitrary frame-count limit; current short gesture sequences remain well
within it.

## Relationship to the inspected Python reference

The reference project
`gabguerin/Sign-Language-Recognition--MediaPipe-DTW` uses FastDTW with its
default radius of 1 and the default Manhattan/L1 local frame metric. This
editor intentionally keeps the same local metric but uses **exact DTW**. Exact
DTW is easier to inspect and returns the optimal accumulated cost without an
approximation radius. Consequently, its distances may differ from the Python
reference's FastDTW distances.

Left and right hand sequences are compared independently. DTW does not inspect
hand-presence flags and does not combine the two distances.

## Interpretation boundary

A smaller value means the two prepared sequences are closer under this
angle-feature representation and alignment method. A larger value means they
are farther apart. The result is a distance—not a correctness percentage,
confidence, linguistic judgment, score, or pass/fail decision.

The exact recurrence is a self-contained adaptation of
`dynamic-time-warping` 1.0.0. See `THIRD_PARTY_NOTICES.md` for its source and
MIT license notice.
