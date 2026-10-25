# Nightly Bird — Defold / Rive vector proof

Version 0.7.3 opens with a six-character vector gallery. Artwork is drawn from
real cubic vector paths in `rive-demo/bird.riv`; no PNG sprite or flipbook is used
for it. The original SVG remains the artwork source. The abandoned sprite-based Defold prototype has been removed.
Rendering-independent flight rules and their tests remain for later reuse.

## Try it

- The first screen is a **3 × 2 icon grid**: red bird, fish, hawk, firefly,
  balloon and rain cloud. Tap a card (or press **1–6**) to open that preview.
  Every preview has a **หน้ารวม** button at the top left; **Esc** returns too.
- Swipe **left** through those six previews; swipe **right** to go back.
  Six vector dots show the current character. The gallery itself hides them.
  The current dot is larger and lime green; the others are muted.
  Mouse drags and the Right/Left arrow keys also navigate. The fish page has
  exactly one action button, **กลับตัว** (turn), also available on **Space**.
  The fish swims automatically: tail, fin, gill and body wobble follow the JS
  cruise pose. Turning follows the original smoothed heading and belly-down
  rendering rule, without restarting the swim phase. It stays centered for inspection.
- The hawk page has one **พุ่งตัว** (dive) button, also available on **Space**.
  It switches to the original dive SVG for **3 seconds**, plays the original
  `hawk-strike.wav` once, and shows a disabled countdown on the button.
  Flight and the ready button return automatically. Repeated input cannot
  restart or extend a dive. Leaving the page or losing focus cancels it and
  stops its sound. Wing phase continues through the action.
- Firefly and balloon pages show complementary wings and a pulsing lamp, and
  a floating pink balloon. The rain cloud uses **design A**: one asymmetric
  silhouette with broad flowing shadow bands, shared by its gallery thumbnail
  and preview. The original blue-purple palette and falling rain remain.
- The cloud's **ฟ้าแลบ** button (or **Space**) first flashes the cloud
  **dark → bright → dark → bright** in exactly **0.5 seconds**, without a bolt
  or thunder. At 0.5 seconds the original cloud color returns and the vector
  bolt and original `thunder.wav` start together. The bolt lasts 0.28 seconds.
  Each action samples a new endpoint across the **whole 480 × 800 screen**,
  including above/beside the cloud, and a new jagged path/branch. Its geometry
  stays fixed throughout that action.
  A local random generator varies strikes without resetting global randomness.
  Thunder plays once after charging. The button pauses during
  the action and returns automatically; repeated input cannot extend it.
  Leaving the page or losing focus cancels the flash and stops thunder.
- Bird input/audio stops when leaving its page; equipment stays equipped on return.
  Button taps activate on release; a horizontal swipe over a button does not
  activate it. Multitouch stays dedicated to the bird's independent controls.
- Hold the screen or **Space** to flap. Release to finish the current revolution
  and settle at the same rest angle as the original JavaScript bird.
- Press **Blink** / **B** to blink once, and **Chew** / **C** to chew three times.
- Chewing plays the original `crunch.wav` once when the three-bite animation
  starts. Restarting chewing replaces the old sound; losing focus stops it.
- Wing, eye and mouth channels can run together. On touch devices, keep one
  finger held and use another to press the blink/chew buttons.
- The original wing WAV starts when flapping begins. Each recording finishes
  naturally; continued input repeats it without overlap. Releasing stops renewal.
- Losing focus clears held input and stops sound.
- Toggle the four vector icon cards (or **1–4**) to equip/remove a foot-held
  magnet with three inward-pulsing field rings, a slung laser gun, a yellow
  safety helmet, and the lightning suit (coat + hood). All 16 combinations work
  independently of flapping, blinking and chewing. A second finger can toggle
  equipment while the first holds flight. Green frames and เปิด/ปิด show state.
- The magnet has no additional painted toes. It renders under the original
  bird body/feet, so the existing foot paths overlap its grip.
- The lightning suit has a plain blue hood without red crest decorations.
  Either the safety helmet or hood hides the bird's crest. Removing both
  restores the original crest; removing just one keeps it hidden.

Equipment stays equipped until toggled off. This preview does not apply pickup
timers, attraction to collectibles, laser firing or damage protection yet.

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
  with an increasing version code, so the same local signing key can update
  the earlier test app. Keep `debug.keystore` and its password file local.

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
- `rive-demo/pages.lua`: gallery selection, six-character order and route bounds.
- `rive-demo/gallery.riv`: static vector thumbnails and cards, with native GUI
  labels/hit targets. The first three reuse the original character SVGs.
- `rive-demo/nature.riv`: firefly/balloon SVGs, design-A cloud SVG, and procedural
  rain/lightning paths. `nature-motion.lua` drives wings, light, bobbing, rain
  and the timed lightning action; `nature.script` handles its audio and status.
  `motion.strike(state, {x=..., y=...})` accepts an exact target in cloud-local
  vector coordinates for later bird targeting; omit it for a full-screen random
  preview. A `lightning` message can supply `target_x` / `target_y` in the preview's
  480 × 800 artboard coordinates (x right, y down), converted by `preview_target`.
- `rive-demo/gestures.lua`: shared touch/mouse swipe recognition, tap cancellation
  and multitouch exclusion so equipment taps cannot turn into page navigation.
- `rive-demo/fish.riv`: original fish SVG layers, clipped tail segments and pivots.
  `fish-motion.lua` reproduces cruise pose/heading; `fish.script` drives its view model.
- `rive-demo/hawk.riv`: original flight/dive paths, feather pivots and insets,
  plus view-model-controlled flutter of all thirteen dive blades. `hawk-rig.lua`
  is generated from SVG metadata; `hawk-motion.lua` controls the timed pose.
- `rive-demo/equipment.lua`: independent equipment flags and the original
  inward field-ring phases. No equipment action resets bird motion.
- `rive-demo/equipment-icons.riv`: original item SVGs, vector card backgrounds
  and bound active frames, aligned with transparent GUI hit targets.
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
under `tests/font-proof.*` and `tests/defold/check_font_proof.py`.

## Regenerate and verify

Artwork regeneration is optional and requires Python `fontTools`:

```sh
python3 scripts/defold_rive_bird.py
python3 scripts/defold_rive_fish.py
python3 scripts/defold_rive_hawk.py
python3 scripts/defold_rive_gallery.py
python3 tests/defold/check_rive_geometry.py
```

It parses the named SVG layers and their affine transforms, converts SVG arcs to
cubic Beziers, preserves RGBA paint, linear gradients and clip paths (including
the suit hood's even-odd opening), and writes the public Rive 7 runtime format.
Radial paints retain the focal highlight with Rive's concentric gradient.
`assets/svg/environment/rain-cloud.svg` is the editable design-A cloud source;
rain uses a fixed preview layout derived from the original procedural painter. The
SVG and generation code are the editable source; the `.riv` is the generated
runtime asset. The original art's repository license applies; Mitr's OFL license
is in `assets/fonts/OFL.txt`. The renderer and extension use their upstream
licenses.

Normal builds run `tests/defold/rules.lua`, `rive-motion.lua`, `equipment.lua`,
`fish-motion.lua`, `gestures.lua`, `hawk-motion.lua`, `pages.lua` and
`nature-motion.lua` with Bob's
bundled LuaJIT. An additional 300-frame comparison runs the original JS animation
and Lua model with the same mixed time steps, press/release/repress and triggers:

```sh
DEFOLD_LUAJIT=/path/to/luajit node scripts/check_rive_parity.mjs
DEFOLD_LUAJIT=/path/to/luajit node scripts/check_fish_parity.mjs
DEFOLD_LUAJIT=/path/to/luajit node scripts/check_hawk_parity.mjs
```

An optional browser check (Playwright, Chromium and Pillow) tests the rendered
mobile UI: a second finger toggles all four items while the first keeps flight
held, releasing settles, and tapping again removes each item exactly once:

```sh
python3 tests/defold/check_equipment_browser.py http://127.0.0.1:8080/
python3 tests/defold/check_fish_browser.py http://127.0.0.1:8080/
python3 tests/defold/check_hawk_browser.py http://127.0.0.1:8080/
python3 tests/defold/check_gallery_browser.py http://127.0.0.1:8080/
python3 tests/defold/check_cloud_browser.py http://127.0.0.1:8080/
```

The fish browser check exercises actual swipes in both directions, automatic
swimming, the turn button and upright facing, restoration of the bird page, and
swiping over an equipment card without activating it. Fish parity compares the
Lua channels with the actual JS painter and `Shark.afterPhysics` over 3600 frames,
including swimming continuously across the 50-tail-cycle boundary.
Hawk parity compares 3600 flight/dive frames with the original JS painter and
flap update. Its browser check covers three-page navigation, dive sound,
the three-second button/pose recovery, repeat locking and cancellation on exit.

## Review and deployment

Work stays on `defold/development`. Send a **manual APK** to Arayaphong for testing
and wait for explicit approval before creating a PR into `development` or merging.
GitHub Actions builds only Web artifacts; it never builds/uploads APKs.
Defold is the root project (`game.project`). The original HTML/JS application is
under `legacy/`; run `npm --prefix legacy run check`, `npm --prefix legacy test`
and `npm --prefix legacy run build` to verify it. `assets/svg/` is the active
vector source; copies in `legacy/assets/` are the frozen original reference.
`development` is the GitHub Pages deployment branch. Pages serves Defold at `/`
and the reference application at `/legacy/`. Pushing the preview branch
only builds a Web artifact. The pre-Defold HTML/JS snapshot is kept at
`backup/development-before-defold-2026-10-24`.
