NIGHTLY BIRD / RIVE VECTOR DEMO - HOW TO PLAY

1. Extract ALL files from this ZIP, preserving the archive/ folder.
2. Start the local web server:
   Windows: double-click START-WINDOWS.cmd.
   macOS / Linux: open a terminal in this folder and run:
     python3 start_preview.py
3. Your default browser opens automatically. Keep the terminal window open.
4. Hold the screen or Space to flap; release to finish the current cycle.
5. Use the Blink / Chew buttons, or B / C. On touch devices, you can hold
   one finger and press a trigger with another. Requires WebGL2.

Python 3 is required for the preview launcher. Java and Defold are NOT required
to play this already-built bundle. No Python packages need to be installed.

Do not double-click index.html. Browser security prevents this WebAssembly game
from loading its files through file:// URLs. Use the http://127.0.0.1 address
printed by the launcher instead. The port is selected automatically.

Alternatively, upload all bundle files to a static web host that serves .wasm
files as application/wasm, then open its HTTPS URL.
