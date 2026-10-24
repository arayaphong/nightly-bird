# Defold HTML5 Hello World

An isolated smoke test before migrating Nightly Bird. The JavaScript game remains
at the repository root. This example uses real Defold GUI nodes and Lua input
handling; the HTML page only hosts the WebAssembly engine.

## Build without the Defold editor

Requirements: Python 3.11+ and Java 25+. No Python packages, npm packages, or GUI
editor are required. Use the normal HTTPS proxy and trusted certificates, if any.

From the repository root:

```sh
python3 scripts/defold.py build
python3 scripts/defold.py serve
```

Open <http://127.0.0.1:8080>. Click/tap **SAY HELLO** or press **Space**. The counter
must increase once per press. Refreshing resets the counter.

The build command downloads the official Bob **1.14.0** into `.cache/defold/`,
verifies its SHA-256, and creates a release `wasm-web` bundle under `dist/defold/`.
The first build may download additional engine resources. Native extensions, if
added later, may also require access to Defold's build service.

Optional environment variables:

- `DEFOLD_JAVA`: path to the Java 25+ executable when the default Java is older.
- `DEFOLD_BOB_JAR`: path to an existing official Bob 1.14.0 JAR (checksum verified).
- `DEFOLD_JAVA_OPTS`: Java options, for example a trusted certificate store required
  by your organization's HTTPS proxy. Keep certificate verification enabled.

`serve --port 8090` selects another local port. Serve the entire generated bundle
over HTTP(S); opening `index.html` with `file://` does not work. Hosts must serve
`.wasm` files as `application/wasm`. This non-threaded build does not require
cross-origin isolation headers.

## Files

- `game.project`: 960 x 640 reference resolution, 64 MiB initial Web heap.
- `main/main.collection`: one object with the GUI component.
- `main/hello.gui`: built-in font and GUI material references.
- `main/hello.gui_script`: creates the screen and handles click/touch/keyboard input.
- `input/game.input_binding`: mouse/primary touch and Space mappings.

This example has no sound, physics, migrated gameplay, or publishing step. Build
size and memory usage are a baseline, not estimates for the finished game.

## Play a downloaded HTML5 ZIP

Extract the entire ZIP, including `archive/`. On Windows, double-click
`START-WINDOWS.cmd`. On macOS or Linux, run `python3 start_preview.py` from the
extracted folder. The launcher requires Python 3 (no extra packages), opens the
browser automatically, selects a free local port, and serves WebAssembly with
the correct MIME type. Keep its terminal window open while playing. Java and
Defold are not needed to play an already-built bundle.

Double-clicking `index.html` opens a `file://` URL and cannot run this game.

The **Build Defold HTML5 example** GitHub Actions workflow also builds this folder
on `defold/development` and uploads the `defold-hello-html5` artifact. Download and
extract it, then serve the folder containing `index.html` with an HTTP server.
It does not replace or deploy the existing JavaScript game's GitHub Pages site.
