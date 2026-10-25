components { id: "script" component: "/objects/firefly.script"  }
components { id: "collision" component: "/objects/firefly.collisionobject"  }
embedded_components { id: "sprite" type: "sprite" data: "default_animation: \"fly\"\nmaterial: \"/builtins/materials/sprite.material\"\nblend_mode: BLEND_MODE_ALPHA\ntextures { sampler: \"texture_sampler\" texture: \"/assets/game.tilesource\" }\n" scale {x: .078125 y: .078125 z: 1} }
