# Nightly Bird — Defold / Rive vector proof

Version 0.3.2 is an isolated, interactive Rive bird proof. The bird is drawn from
real cubic vector paths in `rive-demo/bird.riv`; no PNG sprite or flipbook is used
for it. The original SVG remains the artwork source. The earlier flight slice
is retained under `game/`, `objects/` and `main/` for later migration work.

## Try it

- Hold the screen or **Space** to flap. Release to finish the current revolution
  and settle at the same rest angle as the original JavaScript bird.
- Press **Blink** / **B** to blink once, and **Chew** / **C** to chew three times.
- Wing, eye and mouth channels can run together. On touch devices, keep one
  finger held and use another to press the blink/chew buttons.
- The original wing WAV starts when flapping begins. Each recording finishes
  naturally; continued input repeats it without overlap. Releasing stops renewal.
- Losing focus clears held input and stops sound.

Autonomous idle flaps and random blinks are deliberately disabled in this manual
proof. Motion equations, pivots, rotations, compression, blink timing and three
chewing cycles otherwise follow the JS reference. The UI shows flapping,
finishing-the-cycle and resting states.

## Build without the editor

Use Python 3.11+ and a **Java 25 JDK** (including `javac`):

```sh
python3 scripts/defold.py build
python3 scripts/defold.py serve
python3 scripts/defold.py build --target android
```

The first build downloads/checksums Bob 1.14.0 (about 219 MiB) and downloads the
pinned official Rive dependency archive (about 211 MiB). The engine is linked by
Defold's build service and cached locally. Normal builds use the committed `.riv`
and need neither a Rive GUI editor nor Python packages.

Optional environment variables: `DEFOLD_JAVA`, `DEFOLD_BOB_JAR`,
`DEFOLD_JAVA_OPTS`, `DEFOLD_BUILD_SERVER`. Keep HTTPS certificate verification
on when configuring a proxy/trust store. Bob's native build uploads engine flags,
standard manifests/default icons and the public Rive extension sources/libraries.
Game Lua, SVG/RIV artwork, fonts, audio and signing keys are bundled locally.

The pinned extension's shipped Java pipeline builders use an older protobuf
method descriptor. `scripts/defold_rive_plugin.py` recompiles its three public
Java builder classes against the pinned Bob in the ignored local dependency
cache. The native extension sources/libraries are unchanged. This compatibility
step runs after dependency resolution, and is repeated for a fresh archive.

Outputs:

- Web: `dist/defold/Nightly Bird - Rive Demo/`. Serve the full directory over
  HTTP(S); opening `index.html` as `file://` cannot run WASM. The downloaded ZIP
  includes a Python preview launcher and a Windows launcher.
- Android: `dist/android/NightlyBirdRiveDemo/NightlyBirdRiveDemo.apk`.
  Android uses **OpenGL ES only**, matching this Rive pin. The app manifest
  excludes the Vulkan adapter; the builder verifies that the APK does not bundle
  the VkQuality automatic backend selector.
  **ARM64 only**: the current Rive extension excludes Android ARMv7. Engine symbols
  are stripped before signing. App ID stays `com.arayaphong.nightlybird.defoldhello`,
  version code 6, so the same local signing key can update the earlier test app.

Web needs WebGL2. The Rive extension is pinned to commit
`0283d4ecb604953057385ca5a4fae7130c776ae9` and requires Defold 1.14.0.

## How it works

- `rive-demo/bird.riv`: original SVG cubic geometry, colors, layers and pivot
  nodes, with a `BirdControls` view model and a `Bird` state machine.
- `rive-demo/motion.lua`: continuous JS-derived phase/timing, including coasting
  after release and immediate continuation on a renewed press.
- `rive-demo/demo.script`: sends numeric channel values through the official
  `rive.cmd.setViewModelInstanceNumber` API, and handles native sound callbacks.
- `rive-demo/demo.gui_script`: independent touch/keyboard input and native GUI.
- `rive-demo/demo.render_script`: Rive pass followed by GUI, explicitly restoring
  stencil/color/blend state so the native vector pass does not hide the controls.

Rive applies bound properties and renders vectors each frame. Lua preserves the
original procedural animation equations rather than resampling them into an
image sequence or resetting a timeline when input changes. There are no baked
raster bird frames in this proof. The renderer's framebuffer is a per-frame GPU
render target, not pre-rasterized source artwork.

The Thai UI retains runtime SDF Mitr + HarfBuzz/SkriBidi. Both
`font.runtime_generation` and the full-layout app manifest must remain enabled.
The native Thai font proof and its visual regression checker remain available
under `tests/font-proof.*` and `../tests/defold/check_font_proof.py`.

## Regenerate and verify

Artwork regeneration is optional and requires Python `fontTools`:

```sh
python3 scripts/defold_rive_bird.py
python3 tests/defold/check_rive_geometry.py
```

It parses the named SVG layers and their affine transforms, converts SVG arcs to
cubic Beziers, and writes the public Rive 7 runtime object/property format. The
SVG and generation code are the editable source; the `.riv` is the generated
runtime asset. The original art's repository license applies; Mitr's OFL license
is in `assets/fonts/OFL.txt`. The renderer and extension use their upstream
licenses.

Normal builds run both `tests/defold/rules.lua` and `rive-motion.lua` with Bob's
bundled LuaJIT. An additional 300-frame comparison runs the original JS animation
and Lua model with the same mixed time steps, press/release/repress and triggers:

```sh
DEFOLD_LUAJIT=/path/to/luajit node scripts/check_rive_parity.mjs
```

## Review and deployment

Work stays on `defold/development`. Send a **manual APK** to Arayaphong for testing
and wait for explicit approval before creating a PR into `development` or merging.
GitHub Actions builds only Web artifacts; it never builds/uploads APKs.
`development` currently retains the pre-Defold HTML/JS game and publishes that to
GitHub Pages. The original commit is also kept at
`backup/development-before-defold-2026-10-24`.
