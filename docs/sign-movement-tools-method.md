# Composable hand-movement preparation

Milestone 6 reproduces the preparation method inspected in
[`gabguerin/Sign-Language-Recognition--MediaPipe-DTW`](https://github.com/gabguerin/Sign-Language-Recognition--MediaPipe-DTW)
at commit `68948d87b1e57c3af41f5116728b3d264d6830d0`. It is an adaptation of the
method, not an automatic Python-to-JavaScript translation.

## Responsibility boundary

- **MediaPipe** detects the landmarks and defines the 21 hand connections.
- **Sign Movement Tools** selects left- or right-hand XYZ values from the
  existing `RuntimeLandmarkFrame[]` output. It ignores pose, face, visibility,
  timestamps, and the existing project comparison features.
- **Array Tools** visibly removes rows whose sum is exactly zero, matching the
  reference project's missing-hand-frame rule.
- **MediaPipe Data** supplies the documented hand connection index pairs.
- **Vector Tools** maps point connections to vectors and maps every vector to
  every vector as radian angles.
- **DTW is not present in Milestone 6.** The resulting numeric sequences are
  preparation outputs only. They do not determine linguistic correctness or
  whether an LSP sign is correct.

## Student-assembled pipeline

Students build the left and right paths independently:

```text
Analyze Video · Landmark frames
  → Extract Left Hand XYZ (or Extract Right Hand XYZ)
  → Remove Zero-Sum Rows
  → Connection Vectors ← MediaPipe Hand Connections
  → Ordered Pairwise Angles
  → number[][] with one 441-value row per retained hand frame
```

There is deliberately no student-facing `Create Hand Embedding` or `Create
Sign Model` block. The visible operations show the method's important choices
without requiring 21 manually wired subtractions or 441 manually wired angle
calculations.

## Shapes and exact behavior

1. Hand extraction returns `originalFrameCount × 63`. A present hand must have
   exactly 21 finite XYZ landmarks. Visibility is ignored. An absent hand is
   exactly 63 zeros. Partial or malformed hands are errors.
2. Remove Zero-Sum Rows omits a row when the sum of its 63 coordinates is
   exactly zero. It does not interpolate or insert a 441-zero row.
3. Connection Vectors groups each retained row into 21 XYZ points. For each
   connection `(a,b)`, it calculates `landmark[b] - landmark[a]`. With the
   MediaPipe connection source this produces `retainedFrames × 21 × 3` as JSON.
4. Ordered Pairwise Angles compares all 21 vectors with all 21 vectors in
   row-major order. It retains diagonal and symmetric pairs, producing
   `retainedFrames × 441`. Angles are radians. Exactly equal vectors produce
   zero. A non-finite angle caused by a zero vector or `Math.acos` also becomes
   zero, matching the reference fallback.
5. Left and right results remain separate and may contain different numbers
   of rows. No timestamp is reintroduced.

## Frozen MediaPipe hand-connection order

The Python reference iterates MediaPipe's `HAND_CONNECTIONS` `frozenset`, whose
portable ordering is unspecified. This project freezes the following order so
all JavaScript reference and learner sequences use identical feature columns:

```text
Palm:  (0,1), (0,5), (5,9), (9,13), (13,17), (0,17)
Thumb: (1,2), (2,3), (3,4)
Index: (5,6), (6,7), (7,8)
Middle:(9,10), (10,11), (11,12)
Ring:  (13,14), (14,15), (15,16)
Pinky: (17,18), (18,19), (19,20)
```

This intentional ordering choice is the only portable-order deviation from
the Python source. The connection set and calculations are unchanged.

## Python/NumPy correspondence

| Reference Python/NumPy | Standard JavaScript used here |
| --- | --- |
| loop | `map`, iteration, or a nested loop |
| reshape | `flat`, `slice`, and `Array.from` |
| `np.zeros` | `Array(...).fill(0)` |
| landmark subtraction | scalar subtraction |
| `np.dot` | multiply plus sum/`reduce` |
| `np.linalg.norm` | `Math.hypot` |
| `np.arccos` | `Math.acos` |
| `np.array_equal` | element-wise equality |
| `np.sum` | `reduce` |
| append | `push` |

No numerical library is added for these basic operations.

## Reference files and parity fixture

The inspected path is:

- `utils/landmark_utils.py`
- `models/hand_model.py`
- `models/sign_model.py`
- `sign_recorder.py`
- `utils/dataset_utils.py`

The deterministic parity fixture uses landmarks `(index, 0, 0)` for indexes
0–20. Every frozen connection therefore points along positive X, making all
441 expected pairwise angles exactly zero. This expected result is derived
directly from verifiable vector mathematics. The original Python environment
could not be executed locally without adding Python/NumPy dependencies, which
Milestone 6 intentionally does not introduce.

## Runtime chaining

Every successful function block publishes its typed `result` through the
provider-neutral runtime-value contract. A compatible downstream input can
select that source. Execution remains explicit: publishing a result never
automatically executes downstream blocks. Structured values are cloned for
each execution so a consumer cannot mutate its producer's stored result.

Large values remain available to downstream functions even when the editor
shows a compact message instead of serializing more than the 200 KB graphical
display limit.

## Research boundary

These functions create a numerical representation of hand geometry over time.
They do not perform DTW, classification, voting, scoring, confidence,
thresholding, feedback, or a linguistic evaluation of LSP.
