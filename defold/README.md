# Defold Web and Android Hello World

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

This example has no sound, physics, or migrated gameplay. Build
size and memory usage are a baseline, not estimates for the finished game.

## Android test APK

```sh
python3 scripts/defold.py build --target android
```

This creates a universal ARMv7/ARM64 APK under `dist/android/`. Bob generates a
local debug signing key for testing. This is not a Play Store release; signing
keys are ignored by Git. Builds made on another machine may use a different key,
in which case Android requires uninstalling the earlier test app before installing
the new build. Playing the APK requires no Python, Java, or Defold installation.

Application ID: `com.arayaphong.nightlybird.defoldhello`.

## Play a downloaded HTML5 ZIP

Extract the entire ZIP, including `archive/`. On Windows, double-click
`START-WINDOWS.cmd`. On macOS or Linux, run `python3 start_preview.py` from the
extracted folder. The launcher requires Python 3 (no extra packages), opens the
browser automatically, selects a free local port, and serves WebAssembly with
the correct MIME type. Keep its terminal window open while playing. Java and
Defold are not needed to play an already-built bundle.

Double-clicking `index.html` opens a `file://` URL and cannot run this game.

The Defold GitHub Actions workflow builds Web and Android on `defold/development`,
uploads `defold-hello-html5` and `defold-hello-android` artifacts, and deploys one
combined GitHub Pages site. The original JavaScript game stays at the site root;
the Defold demo is at `/nightly-bird/defold/` and the APK is at
`/nightly-bird/downloads/nightly-bird-defold-hello.apk`.

To reproduce the combined site locally, build in this order (the first command
cleans `dist/`):

```sh
npm run build
python3 scripts/defold.py build
python3 scripts/defold.py build --target android
python3 scripts/defold_pages.py
```

Upload only `dist/pages/` to Pages. Future deployments from another branch must
also include these paths if they are to preserve the Defold demo and APK.
