DEFOLD HELLO WORLD - HOW TO PLAY

1. Extract ALL files from this ZIP, preserving the archive/ folder.
2. Start the local web server:
   Windows: double-click START-WINDOWS.cmd.
   macOS / Linux: open a terminal in this folder and run:
     python3 start_preview.py
3. Your default browser opens automatically. Keep the terminal window open.
4. Click SAY HELLO, tap it, or press Space to increase the counter.

Python 3 is required for the preview launcher. Java and Defold are NOT required
to play this already-built bundle. No Python packages need to be installed.

Do not double-click index.html. Browser security prevents this WebAssembly game
from loading its files through file:// URLs. Use the http://127.0.0.1 address
printed by the launcher instead. The port is selected automatically.

Alternatively, upload all bundle files to a static web host that serves .wasm
files as application/wasm, then open its HTTPS URL.
