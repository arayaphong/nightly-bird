# ท้องฟ้ากลางคืน

The night-sky and water fixtures expose independent count sliders: stars 0–72,
dust 0–26, in whole particles. Existing default counts remain 72 and 26. Zero
means off: hidden particles stop advancing in Lua, publish zero opacity once,
and send no changing Rive position/opacity properties while disabled. Restoring
counts resumes the selected subset; the moon and background remain visible.

Each fixture retains its own counts across navigation. Fish scenery keeps its
two water/fish action buttons. Its sky uses the original particle counts.
All sky artwork remains vector geometry; these sliders do not change resolution.
