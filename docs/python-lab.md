# Python Lab

Python Lab is one editable Python workspace per page. No Python function is
built in or automatically exposed. A student imports a local `.py` file or
pastes code into a modal with a name, description, documented inputs, output
type, and usage example. The exact definitions become a reusable imported
library. Clicking **Usar** attaches those definitions to the Lab as a hidden
dependency and adds only the editable usage example to the visible page code.

Python runs locally in a module Web Worker through Pyodide 314.0.3. NumPy 2.4.3
is pinned and shipped with the application and static ZIP. The worker keeps a
long calculation from freezing the page and supports cancellation, but it is
not a secure sandbox for untrusted Python.

Interpreter and NumPy startup are allowed to finish without a timer because
their first browser load varies substantially by device. The interface reports
the loading phase and keeps **Cancelar** available. A page containing Python
Lab begins this preparation as soon as the page runtime opens; it does not run
the student's code automatically. **Ejecutar Python Lab** becomes available
when the worker reports that Python and NumPy are ready. Only after actual code
execution begins does the student code receive its 30-second safeguard.
Canceling clears any active execution timer.

The runtime-value bridge clones analyzed landmark JSON before sending it to the
worker. A small adapter exposes each frame as the attribute-based object shape
expected by the inspected Python reference (`pose_landmarks`,
`left_hand_landmarks`, and `right_hand_landmarks`). MediaPipe production,
detection, replay, and persistence are unchanged.

The optional example at `examples/python-libraries/landmark_utils.py` is not
loaded by the editor. Its functions are adapted from
`gabguerin/Sign-Language-Recognition--MediaPipe-DTW`, commit
`68948d87b1e57c3af41f5116728b3d264d6830d0`, under the MIT License. See
`THIRD_PARTY_NOTICES.md`.
