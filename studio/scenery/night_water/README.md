# Night sky and water fixture

Studio → ฉากและฟิสิกส์ → ท้องฟ้าและผิวน้ำ opens this separate fixture.
`preview.go` reuses the sky presenter with `with_water=true`; its sky/wind/star
speed and wave clocks are independent from the original `night_sky` instance.
Only the selected instance updates/renders. The common collapsible controls
dispatch to the active fixture and ignore status messages from the other one.

The lower 35% is initially opaque water. Wave shape, timing, depth colors and
lunar shimmer are ported from `legacy/src/visuals/environment-painter.js`'s
`drawWater`: 8px surface samples with 2.2px and 1.5px ripples, phase speeds
+2.4 and −1.3, the original translucent 2px line, and 14 animated moon-light bars.
The bars use the current moon's x anchor. Star reflections are omitted so no
stars/dust appear in the water. All strokes, bars and fills remain Rive vectors.

The opaque body's upper edge follows the exact surface samples. This small
adaptation of the legacy rectangular fill masks dust cores, halos and pointed
tails below the moving wave. Its original depth gradient follows the level.

The horizontal slider below the star-speed toggle adjusts mean water level
from 0–100%, initially 35%. Touch or mouse dragging updates the surface/body
together while keeping the wave phase. Dragging beyond the track clamps to its
endpoints, and the fixture retains its level on reentry. The original sky has
no water slider. Global back/focus loss clears an unfinished drag.

Reusable wave math/layout: `shared/scenery/water/`. Vector exporter:
`scripts/defold_rive_water.py`, called by `scripts/defold_rive_night_sky.py`.
The common Rive artboard contains an optional water group; the original sky
keeps it at zero opacity. No physics or gameplay rules are added by this fixture.

`node scripts/check_water_parity.mjs` (set `DEFOLD_LUAJIT` if needed) compares
the actual legacy painter against Lua for 1,200 mixed-frame steps and five
water levels, including every visible wave sample and lunar shimmer rectangle.
