# Nightly Bird — Defold migration

The first playable migration replaces the Hello World. Game objects, sprite
flipbooks, Box2D trigger collisions, sound, input and GUI run inside Defold. The
HTML file only hosts its WebAssembly engine. The original HTML/JS game remains at
the repository root as the behavior reference.

## Play and build without the editor

Requirements: Python 3.11+ and Java 25+. No GUI editor, npm dependency, Python
package or separately installed Lua interpreter is required for normal builds.

```sh
python3 scripts/defold.py build
python3 scripts/defold.py serve
```

Open <http://127.0.0.1:8080>. Hold the screen or **Space** to climb, release to
fall. Collect fireflies to increase AGI. Rainbow fireflies give eight seconds of
4x speed. Water allows three diminishing bounces; climb back to safety to refill
them. The fourth water contact ends the flight. Use the on-screen pause button,
**P**, or **Escape** to pause/resume. Losing window focus automatically pauses and
clears held input. Best distance is saved through Defold's `sys.save`.

The logical play area is currently **480 × 800**, fitted with its aspect ratio
preserved on other screen sizes. Thai text uses the bundled Mitr font under its
OFL license, so no web font service or DOM layout is involved.

The builder downloads/checksums official Bob **1.14.0**, runs the Lua rule tests
using Bob's bundled LuaJIT, then builds the release HTML5 bundle in
`dist/defold/Nightly Bird/`. An existing bundle for that target is replaced.

Optional environment variables: `DEFOLD_JAVA`, `DEFOLD_BOB_JAR`,
`DEFOLD_JAVA_OPTS`, `DEFOLD_BUILD_SERVER` (optional build-server URL). See `scripts/defold.py` for the pinned Bob SHA-256. A normal
HTTPS proxy and trusted Java certificate store can be supplied with these
options. Full text layout requires the Defold build service to link the engine with
HarfBuzz/SkriBidi. Bob caches these engine builds. Game Lua, sprites, audio, fonts
and Android signing keys are bundled locally; this project has no native source
extensions to upload. Engine configuration, standard platform manifests and
default Android icons are the build-service inputs.

`serve --port 8090` selects another port. Serve the full generated folder over
HTTP(S); opening `index.html` as `file://` cannot run the WASM game. `.wasm` must
be served as `application/wasm`. This non-threaded build needs no cross-origin
isolation headers.

## Current migration scope

| System | First playable status |
| --- | --- |
| Flight, gravity, ceiling, held input | Ported using the original constants, with upward-positive Y |
| Water bounces, recharge, drowning, restart | Ported |
| Fireflies, AGI cap, worm overflow, rainbow speed | Ported; native trigger collision, collection guarded once |
| Night scene, bird, wings, blink, eating pose, water reflections | Original art/palette; native sprite components and flipbooks |
| HUD, Thai labels, pause, focus loss, best-distance save | Ported with Defold GUI and persistence |
| Flap, water, crunch, sinking sounds | Original WAVs through Defold sound components |
| Fish, hawk, storms, wind progression | Next milestone |
| Balloon gifts, magnet, armor, gun, projectiles | Next milestone |
| Shop, revive, predator death animations | Next milestone |
| Full animation/particle parity, dynamic viewport layout | Follow-up after gameplay parity |

This is a flight/pickup slice, **not the completed migration**. Enemy distance
unlocks are not active yet. Existing JS tests remain the detailed specification
for later milestones; `tests/defold/rules.lua` covers the rules already ported.

## Code and assets

- `game/rules.lua`: plain Lua flight, water, score and pickup rules; no renderer,
  custom collision engine, scene graph or browser API.
- `game/controller.script`: Defold lifecycle, factories, sound, bird presentation,
  focus events and persistence.
- `objects/firefly.*`: native factory/sprite/Box2D trigger and its Lua behavior.
- `game/scenery.script`: native sprite instances for water waves/reflections.
- `main/game.gui_script`: GUI and input; UI taps are consumed before flight input.
- `assets/game.png`, `assets/scene.png`: committed runtime textures.
- `scripts/defold_assets.py`: optional artwork regeneration from the original SVGs.

To regenerate artwork only, install **Inkscape** and Python **Pillow**, then run
`python3 scripts/defold_assets.py`. Runtime builds use the committed PNGs and do
not need either dependency. Bird flipbook frames are generated from the named
SVG layers, preserving the repository's original source artwork and license.
`assets/fonts/OFL.txt` covers Mitr; the repository license covers original art/audio.

Standalone Lua rule tests can also run with Lua 5.1/LuaJIT:
`lua tests/defold/rules.lua` from the repository root.

## Android test APK — manual only

```sh
python3 scripts/defold.py build --target android
```

This creates a universal ARMv7/ARM64 APK under `dist/android/`. Release Android
bundles strip engine debug symbols before signing, including custom text-layout
engines. The generated local
debug signing key is ignored by Git. It is a test APK; another machine's key may
require uninstalling an older build. The application ID stays
`com.arayaphong.nightlybird.defoldhello` so this build can update the earlier demo
when signed with the same local key. Version code is now 3 (version 0.2.1).

**GitHub Actions never builds or uploads APKs.**

## Deploy and preview

The **Build Defold Web** workflow checks `defold/development` and uploads the
`nightly-bird-defold-html5` artifact. Send a manual APK to Arayaphong for testing
and wait for explicit approval before opening a PR into `development` or merging.
After approval, merge into `development` to deploy through
**Check and deploy GitHub Pages**. The `github-pages` environment rules stay
unchanged. The original JS game stays at `/nightly-bird/`; the migrated game is
at `/nightly-bird/defold/`. The original development commit is preserved on
`backup/development-before-defold-2026-10-24`.

To assemble both sites locally (the first command cleans `dist/`):

```sh
npm run build
python3 scripts/defold.py build
python3 scripts/defold_pages.py
```

Upload only `dist/pages/`. APKs and local preview launchers are excluded.

For a downloaded HTML5 ZIP, extract everything including `archive/`. On Windows
run `START-WINDOWS.cmd`; on macOS/Linux run `python3 start_preview.py`. The
launcher needs Python 3, opens a browser and serves WASM with the correct MIME
type. Keep its terminal open. Android users should install the APK or play the
deployed HTTPS site.

## Thai text shaping (0.2.1)

`font.runtime_generation = 1` and `app.appmanifest` enable Defold 1.14.0's full
text layout system (HarfBuzz/SkriBidi) on supported platforms. Keep both enabled:
runtime rasterization alone does not position Thai combining marks. Mitr's
OpenType substitutions and anchors position vowels and tones in context; there
are no manual per-character vertical offsets or substituted Unicode characters.
The font's prewarm text includes real UI clusters as well as the character set.

The optional `tests/font-proof.collection` is a native GUI proof sheet, separate
from the game bootstrap. It covers plain vowels/tones, stacked marks, sara am,
tall consonants, lower forms, real UI strings, small labels and mixed digits.

Using the same pinned Bob/Java as the normal builder, add these arguments to a
Web debug build from the repository root:

- `--settings defold/tests/font-proof-legacy.settings` for the old offline layout.
- `--settings defold/tests/font-proof.settings` for the corrected runtime layout.
- Use different `--bundle-output` directories for the two captures.

Do not pass a settings path outside the Defold project root: Bob 1.14.0 expects
it to be available as a project resource during the build. The normal game build
passes neither proof setting, so the proof page is not included in its bundle.

Capture each proof's canvas at viewport 480×840, device scale factor 2. With
optional Pillow installed, verify the unchanged simple-mark positions and the
separated stacked marks:

```sh
python3 tests/defold/check_font_proof.py before.png after.png
```

This checks the native rendered ink: single vowels and single tones retain their
positions; stacked marks separate while the vowel and consonant stay in place.
Keep visual review of the full sheet alongside this focused regression check.
