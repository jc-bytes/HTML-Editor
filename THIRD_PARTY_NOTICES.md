# Third-party notices

## Pyodide and NumPy

Python Lab runs locally in the browser with Pyodide `314.0.3` and its pinned
NumPy `2.4.3` WebAssembly wheel. Runtime files are bundled with preview/export;
no CDN is required after the project is built.

- Pyodide: <https://github.com/pyodide/pyodide>, Mozilla Public License 2.0
- NumPy: <https://github.com/numpy/numpy>, BSD-3-Clause license

Python Lab uses a Web Worker to avoid blocking the page. This is an isolation
and responsiveness boundary, not a security sandbox for untrusted code.

## Sign-Language-Recognition--MediaPipe-DTW

The Sign Movement Tools method is adapted from:

- Repository: `gabguerin/Sign-Language-Recognition--MediaPipe-DTW`
- Inspected commit: `68948d87b1e57c3af41f5116728b3d264d6830d0`
- Reference files: `utils/landmark_utils.py`, `models/hand_model.py`,
  `models/sign_model.py`, `sign_recorder.py`, and `utils/dataset_utils.py`

The JavaScript implementation is project code adapted from that reference. It
is not official MediaPipe functionality.

MIT License

Copyright (c) 2022 gabguerin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## MediaPipe hand connections

The 21 hand landmark connection pairs are derived from MediaPipe's
`mediapipe/python/solutions/hands_connections.py` in the 0.8.7 series. The
source is provided by Google under the Apache License 2.0:
<https://www.apache.org/licenses/LICENSE-2.0>.

This project changes the upstream unordered set representation into an
explicit documented order for deterministic JavaScript feature columns.

## dynamic-time-warping 1.0.0

The exact Dynamic Time Warping recurrence used by Time Series Tools is a
self-contained adaptation of:

- Package: `dynamic-time-warping` 1.0.0
- Repository: `GordonLesti/dynamic-time-warping`
- Inspected commit: `37fca6cbae9b1f5e017019d51ffbed70cfba585a`

This project adds strict input validation, a work-based browser safeguard, and
Manhattan/L1 distance between numeric vector frames. The L1 frame metric
matches the inspected Python sign-language reference, but that project uses
approximate FastDTW while this editor intentionally uses exact DTW. The
resulting distances may therefore differ.

MIT License

Copyright (c) 2016 PART <info@gordonlesti.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
