# Project responsibilities

The root `game.project` starts `app/main.collection`. The renderer is
`shared/render/vector.render`; all character/object graphics are Rive paths.
The old HTML/JS application is a frozen reference under `legacy/`, including its
original docs/tools/tests/assets. Active SVG sources live in root `assets/svg/`.

## App and menus

`app/navigation.script` owns routes, preview activation and focus cancellation.
`app/routes.lua` defines valid routes, parent navigation and character swipe order.
`app/menu.gui_script` presents the main Studio/Scenarios menu, Studio categories,
and Scenarios scene list. Game has no menu entry until its connected experience
is implemented. Escape/back climbs one level: character → gallery → Studio → home.
The menu acquires input focus after GUI initialization so global back/Escape
works ahead of the Studio controls; ordinary preview input falls through to them.

Studio's `characters/preview.gui_script` owns character input and action controls.
It requests navigation from App and responds to route/status messages. Preview
controllers fit artwork into the inspection viewport and report status; reusable
motion modules never depend on Studio/App navigation or GUI APIs.

`studio/catalog.lua` lists component-test categories. `scenarios/catalog.lua`
currently has no entries; its menu truthfully says no integrated scenes exist.
The other Studio categories likewise mark their test suites as future work.

## Shared features

- `shared/characters/red_bird/`: vector bird, numeric animation channels, motion.
- `shared/characters/fish/`: fish vector/rig channels and swim/turn motion.
- `shared/characters/hawk/`: flight/dive vector, feather rig and timed motion.
- `shared/objects/firefly/`, `balloon/`, `rain_cloud/`: each has its own Rive
  model/scene/art and motion. The cloud also contains its generated rain/bolt rig.
- `shared/items/equipment.lua`: independent equipment flags/field-ring animation.
- `shared/rules/flight.lua`: rendering-independent flight/pickup/water/score rules
  retained from the old prototype with unit tests. There is no sprite controller,
  session singleton, factory, atlas, sheet or raster scenery left in Defold.
- `shared/input/gestures.lua`: touch/mouse swipe and tap distinction.
- `shared/render/`: Rive/GUI render passes. SDF Mitr and full font shaping remain.

Each Rive feature's `visual.riv` is generated from SVG into native vector paths.
The gallery artwork and equipment icon layout are Studio presentation resources.
Firefly/balloon/cloud have separate reusable artboards rather than one bundled
three-object preview. `studio/characters/objects/preview.script` coordinates their
inspection screens; it does not define their motion or lightning rules.

Cloud motion accepts a cloud-local target with `strike(state, {x=..., y=...})`.
Omit the target for full-artboard random aiming. `preview_target(x,y)` converts
480×800 x-right/y-down coordinates for the Studio controller's optional
`lightning` message fields `target_x`/`target_y`. Future game code converts bird
world coordinates to cloud-local coordinates before calling the same model.
Charging flashes dark/bright twice in 0.2 s while silent; the cloud returns to
its original color and the one discharge event starts bolt and thunder together.

## Add work in the right place

1. **A component**: put reusable vector resources/motion in a named feature under
   `shared/characters`, `shared/objects` or `shared/items`. Keep root SVG sources
   in `assets/svg`; update the corresponding `scripts/defold_rive_*.py` exporter.
   Add its Studio inspection GO/controller under `studio/characters/<feature>`
   and wire it through `app/main.collection`, routes and Studio controls.
2. **A component test suite**: implement fixtures/controllers in `studio/scenery`
   or `studio/rules_and_items`, then replace that category's empty state with
   those tests. Tests exercise the shared production component, not a copy.
3. **An integrated scenario**: give it `scenarios/<scene_name>/scene.collection`
   plus scene-only setup/control. Reuse shared features; do not connect scenarios
   into a campaign. Add its route/presenter or collection proxy to App and its
   `{route,title,description}` entry to `scenarios/catalog.lua`. The menu renders
   registered entries; implement loading/unloading alongside the first scene.
   No synthetic or empty "playable" scenario is shipped by this refactor.
4. **The actual game**: put connected session/progression/story/scene orchestration
   in `game/`. Reuse the same shared motion, items and rules as Studio/Scenarios.
   An incomplete connected game still belongs here; production readiness is not
   the distinction between Game and Scenarios.

## Verification boundaries

`tests/unit/` exercises behavior and App route/focus orchestration without a GPU.
`tests/browser/` tests actual rendered mobile controls/navigation/audio.
`tests/vector/` checks SVG geometry; `tests/font_proof/` retains Thai shaping
fixtures and screenshot checks. Parity tools compare Lua directly to the original
JS under `legacy/src`. The normal build checks resource/module references and
rejects sprite resources/APIs or raster artwork outside the legacy snapshot.
