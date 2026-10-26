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
It switches all background stars together between fixed 32 and 64 reference
pixels/second, initially 32. Speed changes preserve positions and twinkle phases;
the chosen speed survives leaving and reentering. Dust still follows its wind.

Artwork, initial layout and motion live in `shared/scenery/night_sky/`.
Regenerate the committed vector and layout with
`python3 scripts/defold_rive_night_sky.py` (fontTools required only to regenerate).
No sprite artwork, web layout or raster glow is used. Rive paths and radial
gradient fills draw the dots/soft halos. Counts are 72 background stars and 26
foreground dust flecks, with maximum dust core diameter below 2 reference pixels.
