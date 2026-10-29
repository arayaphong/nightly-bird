components { id: "sky" component: "/shared/scenery/night_sky/visual.rivemodel" }
components {
  id: "script"
  component: "/studio/scenery/night_sky/preview.script"
  properties { id: "with_water" value: "true" type: PROPERTY_TYPE_BOOLEAN }
  properties { id: "with_fish" value: "true" type: PROPERTY_TYPE_BOOLEAN }
}
components { id: "bubbles" component: "/shared/scenery/water/bubbles/visual.rivemodel" position { z: -0.05 } }
