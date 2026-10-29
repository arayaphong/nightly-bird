# Water-owned fish bubbles

The water presenter owns the pool, 0.5-second emission clock, world motion and
Rive view model. The fish only reports its SVG tail and dorsal-fin attachment
points, including heading, belly flip and animated tail pivot. Every active
half-second emits 5 tail bubbles and 3 dorsal bubbles together. Origins above
the surface are skipped and airborne fish do not emit.

Released bubbles stay in world space, rise at 64–88 world units/s and disappear
when their top reaches the animated water surface. The 192 preallocated slots
share one vector Rive model, positioned above the water body and behind the fish;
no sprites, textures, per-bubble game objects or physics bodies are created.
Numeric channels use the existing write-only binding to avoid property polling.
Hiding the fish stops emission while old bubbles keep rising. Hiding water or
leaving the fixture clears the pool. Both aspect ratios use the same world units.

Regenerate geometry with `python3 scripts/defold_rive_bubbles.py`.
