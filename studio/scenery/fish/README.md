# ฉากทดสอบปลา

Studio → ฉากและฟิสิกส์ → ฉากทดสอบปลา opens the third scenery fixture.
It reuses the night sky/water vectors and the character Studio's fish Rive asset.
Its own water defaults to 20% level and 60% height/roughness. The fixture has only
two action toggles: hide/show the water together with the fish, and hide/show
only the fish while keeping the water. Wind, star-speed and water sliders remain
available in the other scenery fixtures. Hidden water and fish stop updating;
the fish-only preference is retained when water is hidden and restored. The
fish-only button is unavailable while the water is hidden. Navigation retains
these settings independently of the other fixtures.

Tap/click above the animated water surface, within **128 world units**, to place
a stationary dead red bird. The fixed 720-unit world camera keeps this range the
same through portrait/landscape changes; it is not 128 physical device pixels.
The bird reuses the original SVG/Rive geometry, including its crossed-out eyes.
Taps below the surface or beyond the band, drags and multitouch do not place it.
Controls retain their existing two buttons, with no extra attack action button.

`shared/scenery/fish/attack.lua` ports the above-water strike from
`legacy/src/objects/shark.js`: accelerate toward the locked point and surface,
solve a ballistic leap with gravity `720 * 4.2` that passes through the point,
then land, recover for 0.55 seconds and resume autonomous swimming. Tail/fin beats
accelerate during charge/leap and `fish-strike.wav` plays once at launch. Speeds
use the fixed 1280×720 design world rather than the current screen width.

Placing another bird during a leap retains the current trajectory and queues a
strike at the replacement point after recovery. The bird stays still after a
strike: this fixture tests aiming/motion, without capture, damage or corpse
physics. Hiding fish/water or leaving the fixture clears the target and cancels
the attack and sound. Re-entering resumes ordinary swimming.

`preview.go` owns the water presenter; `actor.go` owns the swimmer; `target.go`
owns the dead bird. The presenter
sends one frame snapshot to the active fish, so the water settings, viewport and
animation advance together. Navigation hides/pauses both, retaining their state.

`shared/scenery/fish/motion.lua` chooses random horizontal targets and alternates
random upper/lower depth targets. Smooth interpolation and the existing heading
animation preserve continuous swimming, turns, tail, fins and gills. This is a
kinematic fixture, not a gameplay or physics simulation.

During ordinary swimming, bounds include the animated artwork's rotational envelope and the
maximum displacement of the current wave profile. The fish uses world units/second and a 720-unit-high camera, preserving its
proportions on any viewport, shrinks uniformly in very shallow water and hides
when no submerged space remains. Changing water settings recomputes the bounds
before rendering, so no part of the fish emerges into the sky or leaves the view.
