# Scenery and physics Studio

Isolated scenery, platform, physics, object-collision and state fixtures belong
here. Reuse shared features when adding fixtures.

`night_sky/` is the first scenery fixture: black night sky, a slowly scrolling
twinkling star layer and sparse glowing wind dust. Enter it through Studio →
ฉากและฟิสิกส์ → ท้องฟ้ากลางคืน. The collapsible wind panel selects left/right
and five elevations per side (−80°, −40°, 0°, +40°, +80°). Positive elevation
means up on either side. It starts folded with left 0° selected; folding leaves
the animation and wind untouched. Space folds, T swaps sides, arrow keys change
the elevation. Wind and panel state survive leaving and reentering the fixture.
The separate star-speed toggle remains visible with the wind panel folded.
It switches all background stars together between fixed 32 and 64 world
units/second, initially 32. Speed changes preserve positions and twinkle phases;
the chosen speed survives leaving and reentering. Dust still follows its wind.
Dust flares and fades smoothly over six seconds, with a different phase per
fleck. The short tails are filled vector wedges with curved edges, fading to
pointed tips behind the travel direction. The halo brightens with the flare;
particle count, core size and the 32/64 star speeds stay the same.
A static crescent moon sits 80 world units from the visible right edge and 86
units below the top of the 720-unit-high world. Layer order is stars → moon →
dust → Studio controls. The native vector crescent and halo preserve their
proportions because the complete scene uses a uniform fixed-height camera.
Wider screens reveal more world at the sides; sky wrapping, the opaque water
mesh and the moon anchor follow the camera's visible world bounds.

`night_water/` is the next selectable fixture: the same sky above animated
opaque water, with no sky particles visible beneath its curved surface.
See that fixture's README for wave geometry, controls and layer ordering.

Artwork, initial layout and motion live in `shared/scenery/night_sky/`.
Regenerate the committed vector and layout with
`python3 scripts/defold_rive_night_sky.py` (fontTools required only to regenerate).
No sprite artwork, web layout or raster glow is used. Rive paths and radial
gradient fills draw the dots/soft halos. Counts are 72 background stars and 26
foreground dust flecks, with maximum dust core diameter below 2 world units.
