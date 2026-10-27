# System Info

Open **System Info** from the in-game home menu (keyboard: **3**). The page is
Defold GUI using the same font and portrait framing as the rest of the game.
It does not add interface elements or diagnostics to the HTML wrapper.

On HTML5, `shared/diagnostics/system.lua` reads the existing game canvas/context
through `html5.run`: active WebGL version, context loss, masked renderer/vendor,
optional `WEBGL_debug_renderer_info` GPU details, CSS size, backing buffer size
and device pixel ratio. It never creates a second probe canvas. Known software
renderers are identified explicitly; a masked/unknown renderer does not imply
hardware acceleration. A GPU name is descriptive, not proof of GPU utilization.
Browsers do not expose general GPU utilization (%) through this API.

The FPS badge and page share wall-clock frame sampling (0.5-second windows),
independent of simulation dt. The page shows average interval and the slowest
interval in the latest sample. These are whole-frame intervals, not GPU timings.
Page transitions and window focus reset the sample without mixing idle/menu
frames into the latest tested scene. Its last completed sample remains visible
after returning home to open System Info. On native platforms, the page reports
available OS/engine information and explicitly marks browser-only GPU and
resolution details as unavailable.

CSS size versus backing resolution helps explain pixel cost: DPR 3 commonly
renders nine times the CSS pixel count. Rendering resolution is unchanged by
this feature. FPS or a renderer string alone cannot locate a CPU/GPU bottleneck.
