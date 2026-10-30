# ฉากทดสอบปลา

Studio → ฉากและฟิสิกส์ → ฉากทดสอบปลา opens the third scenery fixture.
It reuses the night sky/water vectors and the character Studio's fish Rive asset.
Its own water defaults to 20% level and 60% height/roughness. The two buttons
hide/show water together with the fish, or hide/show only the fish. Wind,
star-speed and water sliders remain in the other fixtures. Hidden fish/water
stop updating; the fish-only visibility preference is retained independently.

## Three states and one prey

The fish has exactly three public `mode` values:

- `swim`: ordinary random swimming without a catch.
- `attack`: surface approach, then committed leap and return into the water.
- `excited`: carrying a caught bird and swimming rapidly back and forth.

Placement only creates, moves or removes the single full-size dead bird. It
never opens an attack lock. On each update, patrol detects any existing prey and
locks its current location itself, including prey introduced without a tap.
Before launching, the fish cancels its approach if prey disappears or moves
outside a **72-world-unit decision radius** around the locked point. A remaining
prey can be acquired at its new position by patrol after cancellation recovery. Once
launched, prey changes do not alter the lock, launch, bite attempt or landing.
After a miss lands, patrol immediately acquires any
remaining prey at its current position and starts another attack automatically;
there is no queued placement command or extra tap requirement. Removing a carried
bird ends excitement, allowing patrol to detect its replacement next update.
Drags, multitouch and UI controls do not count as placement attempts. Hiding
fish/water or leaving still cancels the fixture.

A valid point is above the animated water surface and within **128 world
units** of it. The fixed 720-unit world camera keeps this range consistent
through portrait/landscape changes; it is not 128 physical device pixels.
The dead bird reuses the original SVG/Rive geometry and crossed-out eyes.

## Motion and capture

`shared/scenery/fish/attack.lua` keeps the legacy above-water strike mechanism:
fast swimming to the surface and within **96 horizontal world units** of the
locked point, then a locked ballistic leap with gravity `720 * 4.2`. The decision
circle is centered on that lock (not the fish) and is exactly three times the
24-unit bite radius; prey between 24 and 72 units keeps the approach but is not
close enough to be caught. Approach
speed is capped at 480 world units/s. There is no timeout or velocity-based
exception that launches from far away. The trajectory does not steer at a moved
bird. At the single bite attempt near the locked point, the current bird must
still be within a **24-world-unit radius** of that point to be caught. Removing
or moving it outside the circle causes a miss; a bird appearing after the bite
cannot be collected by the old attack.

While prey remains within the decision circle, public mode remains `attack`
through approach, leap and submerged return, even
when carrying a catch. Only after returning fully into the water bounds does it
switch to `excited` if still holding a bird, or `swim` otherwise, then clear the
lock. The carried bird shrinks to 40% of its original scale at default fish size
and follows the exact rendered mouth position, heading and belly. It uses the
same complete bird Rive model as Studio without a circular mask or cropped catch
asset. The whole bird draws in front so the fish cannot hide wings, tail or feet.
The held bird sits 140 SVG units toward the lower jaw from the legacy contact
point (7 world units at normal fish size), rotated and mirrored with the fish
so it remains centered in the mouth in either direction. This visual offset
does not move the locked target or its bite radius.
Left-facing prey uses a half turn about the X axis after its heading rotation,
with positive uniform game-object scale. Defold rejects nonpositive scale;
using negative Y scale here previously aborted the fish's visual update while
its motion continued, causing apparent pauses followed by jumps.
`fish-strike.wav` plays once at each launch. A prey change during an attack does not stop it; leaving or hiding the fixture does.

Internal `phase` values (`charge`, `leap`, `return`) describe movement within
these modes. A fresh attack started while outside submerged bounds first returns
to the water, then approaches its lock; this pre-launch return also cancels if
prey leaves the decision circle. Cancellation preserves the fish's position and
animation phase. It brakes from its current velocity over **0.2s**, then remains
in place stunned for **0.5s**, with slower existing fin animation and a subtle
2-degree body sway. During recovery its heading eases level; no new artwork is
used. New prey cannot interrupt or restart the recovery timer. Afterward patrol
swims gently back into submerged bounds with a level heading instead of diving
head-first. Hiding/leaving still clears recovery immediately. Landing returns continuously instead
of clamping an overshooting x-coordinate back to an edge. A missed attack leaves
any remaining bird at its current position, and patrol immediately locks it for a new attack.

After landing with a catch, excited swimming crosses alternating submerged
bounds at an average segment speed of 300 world units/s, with smooth
acceleration/deceleration. Ordinary swimming chooses random 30–55-unit/s targets
and alternating random upper/lower depths. Fin phase increases from 7.5 to 20
radians/s with stronger swings while attacking/carrying. Speeds use the fixed
1280×720 design world rather than responsive window width.

The fish's outer Rive artboard does not clip to its original 1536×1024 rectangle,
so steeply rotated mouths/fins remain intact. Original SVG body/tail clips remain.
Bounds include the complete animated artwork's rotational envelope and maximum
wave displacement. Shallow water shrinks the fish uniformly or hides it if no
submerged room remains. A viewport/water bounds change uses a continuous return.

`preview.go` owns the water presenter, `actor.go` the fish and `target.go` the
single bird. Water snapshots keep viewport, waves and fish synchronized. Hiding
fish/water or leaving the fixture cancels the round and removes the bird.
This is a kinematic Studio fixture, not a complete gameplay physics simulation.

## Water-owned bubbles

`shared/scenery/water/bubbles/` manages and draws a pooled vector effect. The
fish reports tail/dorsal world anchors; water emits 5/3 bubbles every 2 seconds in patrol and 0.5 seconds in other modes.
Old bubbles float independently toward the animated surface, including after
hiding just the fish. Hiding water or leaving clears them. Fish artwork is unchanged.
