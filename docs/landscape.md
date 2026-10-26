# Landscape Studio

All active menus, the six character fixtures and three scenery fixtures use a
1280×720 design frame. Character previews and GUI fit that frame uniformly;
the character gallery is a three-column, two-row grid. Bird equipment/actions
occupy the right panel, with the animated bird on the left. Other action buttons
use the right side. Scenery controls share a top row and a collapsible wind panel. Cloud lightning
uses the complete visible canvas, including the extra sides on ultrawide screens.

`shared/display/viewport.lua` defines the world/camera contract. Scenery fixes
vertical world coverage at 720 units and uses one uniform world-to-screen scale.
Wider displays see more horizontal world, centered on x=640. Stars/dust wrap
within those visible bounds; water samples and the opaque fill reach both edges.
The moon stays 80 units from the visible right edge and keeps its circular arcs.

Fish motion, bounds and wave sampling use world coordinates, not physical pixels
or independent X/Y scaling. The random 30–55 world-unit/second travel profile
and smooth easing remain unchanged. Mean water level defaults to 20% and wave
height/roughness to 60%. Each fixture retains its own controls and animation state.

`scripts/web_preview/landscape.js` only frames Defold's canvas in the browser.
Landscape/ultrawide windows use their available width. Narrow/portrait windows
keep the complete 16:9 frame with a rotation hint; no UI is cropped or stretched.
The fullscreen control attempts landscape orientation where the browser supports
locking. All Studio layout, buttons and game visuals remain Defold GUI/Rive.
The project display dimensions select landscape for future native builds.

The CLI build applies `scripts/defold_rive_resize.py` to the pinned public Rive
OpenGL renderer. On WebGL resize it recreates the offscreen target instead of
using Bob 1.14.0's failing depth/stencil reattachment path. Rive contexts,
artboards and motion states remain intact. The repair is guarded by RIVE_WEBGL;
native backends retain the upstream path. The helper checks the upstream Git
blob hash and changes only this C++ source inside the ignored dependency cache.


Scenarios and game flow are still unimplemented. The historical flight-rule
module retains its original prototype constants until gameplay integration.

Web is the default test delivery through the existing private Sites URL:
https://nightly-bird-studio-arayaphong.arme555.chatgpt.site
Build APK only when the user requests it. Do not create a PR or merge into
`development` until the user approves; source checkpoints use `defold/development`.
