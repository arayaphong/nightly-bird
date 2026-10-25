# Build and verification

Commands run from the repository root. Defold 1.14.0 and Rive remain pinned.

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

- Web: `dist/defold/Nightly Bird/`. Serve the full directory over
  HTTP(S); opening `index.html` as `file://` cannot run WASM. The downloaded ZIP
  includes a Python preview launcher and a Windows launcher.
- Android: `dist/android/NightlyBird/NightlyBird.apk`.
  Android uses **OpenGL ES only**, matching this Rive pin. The app manifest
  excludes the Vulkan adapter; the builder verifies that the APK does not bundle
  the VkQuality automatic backend selector.
  **ARM64 only**: the current Rive extension excludes Android ARMv7. Engine symbols
  are stripped before signing. App ID stays `com.arayaphong.nightlybird.defoldhello`,
  with an increasing version code, so the same local signing key can update
  the earlier test app. Keep `debug.keystore` and its password file local.

Web needs WebGL2. The Rive extension is pinned to commit
`0283d4ecb604953057385ca5a4fae7130c776ae9` and requires Defold 1.14.0.

## Runtime layout and Thai fonts

See [architecture.md](architecture.md) for the current App/Studio/Scenarios/Game
boundaries and shared feature paths. Lua updates numeric Rive channels without
baked sprite frames. The renderer framebuffer is a per-frame GPU render target,
not a raster source asset.

Keep `font.runtime_generation` and the full-layout native manifest enabled for
SDF Mitr with HarfBuzz/SkriBidi. Thai proof fixtures are in `tests/font_proof/`;
`check.py` compares actual rendered marks without adding manual vowel offsets.

## Regenerate and verify

Artwork regeneration is optional and requires Python `fontTools`:

```sh
python3 scripts/defold_rive_bird.py
python3 scripts/defold_rive_fish.py
python3 scripts/defold_rive_hawk.py
python3 scripts/defold_rive_gallery.py
python3 tests/vector/check_geometry.py
```

It parses the named SVG layers and their affine transforms, converts SVG arcs to
cubic Beziers, preserves RGBA paint, linear gradients and clip paths (including
the suit hood's even-odd opening), and writes the public Rive 7 runtime format.
Radial paints retain the focal highlight with Rive's concentric gradient.
`../assets/svg/environment/rain-cloud.svg` is the editable design-A cloud source;
rain uses a fixed preview layout derived from the original procedural painter. The
SVG and generation code are the editable source; the `.riv` is the generated
runtime asset. The original art's repository license applies; Mitr's OFL license
is in `../assets/fonts/OFL.txt`. The renderer and extension use their upstream
licenses.

Normal builds check active resource/module references and reject sprite
implementations, then run the behavior and navigation checks in `tests/unit/`
with Bob's bundled LuaJIT. An additional 300-frame comparison runs the original JS animation
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
python3 tests/browser/check_equipment_browser.py http://127.0.0.1:8080/
python3 tests/browser/check_fish_browser.py http://127.0.0.1:8080/
python3 tests/browser/check_hawk_browser.py http://127.0.0.1:8080/
python3 tests/browser/check_gallery_browser.py http://127.0.0.1:8080/
python3 tests/browser/check_cloud_browser.py http://127.0.0.1:8080/
```

The fish browser check exercises actual swipes in both directions, automatic
swimming, the turn button and upright facing, restoration of the bird page, and
swiping over an equipment card without activating it. Fish parity compares the
Lua channels with the actual JS painter and `Shark.afterPhysics` over 3600 frames,
including swimming continuously across the 50-tail-cycle boundary.
Hawk parity compares 3600 flight/dive frames with the original JS painter and
flap update. Its browser check covers three-page navigation, dive sound,
the three-second button/pose recovery, repeat locking and cancellation on exit.


See [architecture.md](architecture.md) for the current folder responsibilities.
