# Portrait Studio

Version 0.8.23 restores the 480×800 portrait GUI and character layouts. Home,
Studio categories, character cards, equipment, actions and System Info all fit
that reference uniformly. The wall-clock FPS badge remains at the physical top
right; System Info retains the most recent scene sample and wraps long GPU names.

For the orientation comparison, the latest sky/water Rive file, 72/26 default
particle counts, 0-count sliders, 163-point water mesh and 720-world-unit-high
scenery camera are preserved. `shared/display/viewport.lua` separates this world
camera (1280×720 design coordinates) from the 480×800 GUI/character fit. Scene
artwork remains vector geometry. Fish scenery keeps only its two visibility
buttons; water defaults and per-fixture settings are unchanged.

`scripts/web_preview/portrait.js` frames the existing Defold canvas and attempts
portrait locking in fullscreen where supported. Tall phones use the available
height and width; wide windows center a portrait canvas. DPR is unchanged and
uncapped. All interface content remains Defold GUI, not HTML. The native display
reference also selects portrait; no APK is built unless requested.

The Rive WebGL resize repair remains active. Browser QA covers portrait routes,
controls, rotation, artwork visibility and System Info. FPS comparisons run the
same sky with full particles and with both sliders at zero, recording actual
backing dimensions and renderer at DPR 1 and 3. Cloud SwiftShader results do not
measure performance on the user's phone. Web delivery uses the existing private
Sites URL, and source checkpoints stay on defold/development without a PR.
