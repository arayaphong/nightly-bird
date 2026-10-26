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

`preview.go` owns the water presenter; `actor.go` owns the swimmer. The presenter
sends one frame snapshot to the active fish, so the water settings, viewport and
animation advance together. Navigation hides/pauses both, retaining their state.

`shared/scenery/fish/motion.lua` chooses random horizontal targets and alternates
random upper/lower depth targets. Smooth interpolation and the existing heading
animation preserve continuous swimming, turns, tail, fins and gills. This is a
kinematic fixture, not a gameplay or physics simulation.

Bounds include the complete animated artwork's rotational envelope and the
maximum displacement of the current wave profile. The fish uses world units/second and a 720-unit-high camera, preserving its
proportions on any viewport, shrinks uniformly in very shallow water and hides
when no submerged space remains. Changing water settings recomputes the bounds
before rendering, so no part of the fish emerges into the sky or leaves the view.
