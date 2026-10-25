# Defold project refactor plan

Agreed with Arayaphong on 2026-10-25. Commit this plan before implementation.
Complete the three stages in order, with a separate Git checkpoint and relevant
verification for each stage. Work stays on `defold/development`; do not create a
PR into `development` or merge until Arayaphong explicitly approves the APK.

## Purpose and vocabulary

- **Studio** develops and tests individual characters, objects, animations,
  actions, scenery/platforms/physics/collisions/states, and rules/equipped items.
  The existing six-character gallery belongs here. Additional test categories
  can be added as they are implemented.
- **Scenarios** assembles components into independent test scenes. Its menu
  selects between scenes; it does not connect them into a story or game campaign.
- **Game** assembles the actual player-facing experience, with connected game
  progression/story. It may be incomplete or in development; the name does not
  imply production readiness.
- The initial main menu exposes **Studio** and **Scenarios**. Do not add a
  misleading playable Game entry or invent finished scenarios in this refactor.
- Components used by these three areas must be shared rather than duplicated.
  Preserve true 2D vector rendering with Rive and existing Thai font shaping.

## 1. Make Defold the root project

- [x] Move the Defold project from `defold/` to the repository root, including
  `game.project`, native-extension settings, resources and runtime entry point.
- [x] Move the original HTML/JS application, its package/scripts/tests/docs and
  complete reference assets into `legacy/`. Keep it runnable and available as
  a behavioral/art reference. Active vector sources belong to the Defold project;
  copies inside legacy are a frozen reference of the old implementation.
- [x] Update build/code-generation/test/parity tools, resource paths, docs,
  Git ignores and Web workflows for the new locations. Preserve local build
  caches/signing files without committing secrets or generated build outputs.
- [x] Make Defold the Pages site at `/`, with the legacy application at `/legacy/`.
  Do not deploy or change `development` as part of this branch refactor.
- [x] Verify the root Defold Web build, Lua tests, legacy tests/build, parity
  tools and assembled Pages paths before committing this stage.

## 2. Remove the old Defold sprite implementation

- [x] Remove the abandoned sprite-based game entry point, object factories,
  controllers, sprite scenery, sprite resources/atlases/tilesources/textures,
  raster-generation scripts and references that are exclusive to that prototype.
- [x] Retain useful rendering-independent rule logic and its tests, giving it
  a clear shared home in stage 3. Remove prototype-only state/glue if unused.
- [x] Preserve current Rive artwork, vector motion/actions/equipment, Thai fonts,
  audio in use, and the complete HTML/JS snapshot under `legacy/`.
- [x] Check that the active Defold project contains no sprite implementation
  or missing resource references. Verify the Web build and existing checks,
  then commit this stage separately.

## 3. Organize the project by responsibility

Use names that explain where each feature belongs:

```text
game.project
app/                 # bootstrap, navigation and main menu
studio/              # isolated component previews and their controls
  characters/        # current six-character/object gallery and previews
  scenery/           # future scenery, platform, physics/collision/state tests
  rules_and_items/   # future rule and equipped-item interaction tests
scenarios/           # independently selectable integrated test scenes
game/                # connected player-facing game; no fake completed game
shared/              # reusable character/object/item behavior and rule logic
assets/              # active vector source art, audio and fonts
input/               # Defold input bindings
scripts/             # build, vector generation, parity and packaging tools
tests/               # automated checks and font-proof fixtures
docs/                # architecture, workflow and this plan
legacy/              # frozen original HTML/JS application/reference
```

- [x] Separate the Studio presentation/controllers from reusable character,
  object, item, input and rendering resources/behavior. Group files by feature
  inside these folders; replace temporary `rive-demo` naming.
- [x] Add the Studio/Scenarios main menu. Studio exposes clear test categories;
  its Characters category contains the existing gallery. Keep future categories
  and scenario lists honest about what has not been implemented.
- [x] Keep the Game boundary explicit and document that progression/story is
  future work. Do not migrate additional gameplay during this structural change.
- [x] Update all references, generators, tests, workflows and documentation.
  Include a concise repository map and instructions for adding a preview,
  scenario and future Game integration using shared components.
- [x] Verify navigation, all six previews and their existing controls/audio,
  equipment, animation parity, vector geometry, Thai text, Web/Pages packaging
  and a manually built/signature-checked Android APK.
- [x] Commit this stage and send the APK for device testing. GitHub Actions
  builds Web only; APK remains a manual local build. No PR/merge yet.

## Behavior to preserve

- Bird flap/release phase continuity and wing sound; blink; three mouth movements
  per single chew sound; magnet/gun/helmet/suit toggles and drawing order.
- Fish swimming and turning; hawk flight and three-second dive with one sound.
- Firefly glow/wings, balloon motion and design-A vector rain cloud.
- Cloud: four silent dark/bright flashes in 0.2 s, original color restored before
  bolt/thunder start together; whole-screen or explicit targets in every direction.
- Touch/mouse/keyboard controls, swipe/tap distinction, page indicators, returning
  to menus, focus-loss/route-exit cancellation, and install-over signing identity.

## Execution record

Implementation has not started at the time this plan is first committed.
Record each stage's result and meaningful verification here as it is completed.

### Stage 1 completed

Defold now opens from root `game.project`. HTML/JS, its package/tools/tests/docs
and complete reference assets are isolated in `legacy/`. Root `assets/svg/`
contains the active vector sources. Local caches and signing identity moved
without entering Git. Web/Pages tools and workflows use the new paths.

Verification: root Web build and all Lua checks pass; legacy syntax/imports,
3 Node test files and static build pass; bird 300-frame and fish/hawk 3600-frame
JS/Lua parity pass. Regenerating all Rive assets produced identical bytes. Pages
assembly puts Defold at `/` and the complete original application at `/legacy/`.

### Stage 2 completed

Removed the abandoned sprite entry collection/UI, controller/scenery, object
factories/collisions, sprite sheets/atlas/tilesource and raster generator. Removed
the unused prototype session singleton and two prototype-only audio components
and recordings. The originals remain in legacy. Pure flight rules and their
tests remain; there is no retained sprite runtime.

Verification: root Web build and all Lua tests pass. `scripts/check_project.py`
checks active resource/Lua references and rejects sprite APIs/resources or PNG
artwork; it is now a normal build prerequisite. Current Rive artwork is unchanged.

### Stage 3 completed

Organized App bootstrap/navigation/menus, Studio preview presentation and shared
feature resources/behavior into the documented folders. Removed `rive-demo`
naming. Bird/fish/hawk vector bytes remain unchanged; firefly, balloon and rain
cloud now each have their own reusable Rive artboard/model and motion module.
Pure flight rules moved to `shared/rules/flight.lua`. Native config, input,
launchers, code generation and unit/browser/vector/font-proof tests use the new
paths. Root README and architecture/build docs explain where to add each kind
of work and how to reuse shared components.

The first menu exposes Studio and Scenarios. Studio contains Characters/Objects,
Scenery/Physics and Rules/Items categories. The current six-character gallery is
under Characters/Objects. The latter two suites and Scenarios truthfully show
empty states; their folders/catalog are ready for future implementation. Game
has a documented boundary for connected player-facing progression/story and no
misleading playable entry. Global input focus and nested back/Escape routing
are handled by App, ahead of component controls.

Verification:

- Root resource/module check (66 source/resources), all Lua behavior/navigation
  tests and vector geometry checks pass. No active sprite resources/APIs or PNG
  artwork remain.
- Bird 300-frame and fish/hawk 3600-frame comparisons match legacy JS.
- Actual mobile Web checks pass for the main menu, Studio categories, Scenarios
  empty state, nested back/keyboard navigation, six gallery icons/previews,
  fish turning/swipes, 3-second hawk dive/audio/recovery, two-finger equipment
  toggles/removal and the silent 0.5-second cloud charge followed by bolt/audio.
- Main menu restoration confirms preview art does not leak onto App menus.
  The frozen legacy snapshot matches all 96 original application/reference
  files. Thai font bytes and the full shaping manifest are unchanged.
- Final Web and Pages packaging pass; the legacy app also loads and runs at
  `/legacy/` over HTTP with no missing resources or JavaScript errors.
- Android ARM64 APK **0.8.0 (19)** built manually; v1/v2/v3 signatures pass and
  its certificate matches the previous APK. GLES-only check passes. Device
  runtime testing remains for Arayaphong; no APK GitHub Actions job was added.

Checkpoints: plan `e3fcf75`, stage 1 `fce51ec`, stage 2 `4e4703d`; this stage is
committed separately after verification. No PR or merge into development.

Post-refactor tuning: the charge was shortened from 0.5 s to 0.2 s at
Arayaphong's request. The bolt still follows immediately with thunder; its
0.28-second duration and targeting behavior are unchanged.
