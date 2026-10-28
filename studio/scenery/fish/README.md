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
- `attack`: fast approach to launch a leap at the newly placed bird.
- `excited`: carrying a caught bird and swimming rapidly back and forth.

Every single background tap starts a new round. It first removes the previous
bird (including one held in the mouth), clears the old lock, flight/segment
timers, velocities, celebration direction and strike sound, and restores normal
state. A valid tap then creates exactly one new bird and begins a new attack.
An invalid tap leaves no bird and normal swimming. There is no queued placement
or recovery cooldown left over from the previous round. Drags, multitouch and
clicks on UI controls do not count as placement attempts.

A valid point is above the animated water surface and within **128 world
units** of it. The fixed 720-unit world camera keeps this range consistent
through portrait/landscape changes; it is not 128 physical device pixels.
The dead bird reuses the original SVG/Rive geometry and crossed-out eyes.

## Motion and capture

`shared/scenery/fish/attack.lua` keeps the legacy above-water strike mechanism:
fast steering up to the surface, then a locked ballistic leap with gravity
`720 * 4.2`. The trajectory passes through the chosen point and does not steer
at a moving target. Swept mouth contact changes the public mode to `excited`
immediately, even while the fish is still airborne. The carried bird shrinks to
40% of its original scale at default fish size and follows the exact rendered
mouth position, heading and belly. The original jaws/teeth draw over it.
The held bird sits 140 SVG units toward the lower jaw from the legacy contact
point (7 world units at normal fish size), rotated and mirrored with the fish
so it remains centered in the mouth in either direction. Contact detection
keeps the legacy strike point.
Left-facing prey uses a half turn about the X axis after its heading rotation,
with positive uniform game-object scale. Defold rejects nonpositive scale;
using negative Y scale here previously aborted the fish's visual update while
its motion continued, causing apparent pauses followed by jumps.
`fish-strike.wav` plays once at each launch and stops on a new placement/reset.

Internal `phase` values (`charge`, `leap`, `return`) describe movement within
these modes, not extra public states. Resetting never teleports the fish or
restarts its animation phase. If reset while airborne/outside the submerged
bounds, it actively returns to the water for the newly selected mode; a valid
new target starts a fresh charge after that return. It does not finish the old
leap or wait through the old 0.55-second recovery. Landing likewise returns
continuously instead of clamping an overshooting x-coordinate back to an edge.
A missed strike returns to normal swimming with the stationary bird available
for inspection until the next placement attempt.

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
