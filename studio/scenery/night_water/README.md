# Night sky and water fixture

Studio → ฉากและฟิสิกส์ → ท้องฟ้าและผิวน้ำ opens this separate fixture.
`preview.go` reuses the sky presenter with `with_water=true`; its sky/wind/star
speed and wave clocks are independent from the original `night_sky` instance.
Only the selected instance updates/renders. The common collapsible controls
dispatch to the active fixture and ignore status messages from the other one.

The lower 35% is opaque dark blue water. A pair of travelling swells animates
the cubic surface line and water body's upper edge with identical vertices and
tangents. The opaque body is drawn in front of all sky graphics, hiding stars,
dust cores, halos and pointed tails anywhere below the moving surface.
The thin bright surface stroke and its soft edge remain native Rive vectors.

The horizontal slider below the star-speed toggle adjusts mean water level
from 0–100%, initially 35%. Touch or mouse dragging updates the surface/body
together while keeping the wave phase. Dragging beyond the track clamps to its
endpoints, and the fixture retains its level on reentry. The original sky has
no water slider. Global back/focus loss clears an unfinished drag.

Reusable wave math/layout: `shared/scenery/water/`. Vector exporter:
`scripts/defold_rive_water.py`, called by `scripts/defold_rive_night_sky.py`.
The common Rive artboard contains an optional water group; the original sky
keeps it at zero opacity. No physics or gameplay rules are added by this fixture.
