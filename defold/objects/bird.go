components { id: "collision" component: "/objects/bird.collisionobject"  }
embedded_components { id: "sprite" type: "sprite" data: "default_animation: \"idle\"\nmaterial: \"/builtins/materials/sprite.material\"\nblend_mode: BLEND_MODE_ALPHA\ntextures { sampler: \"texture_sampler\" texture: \"/assets/game.tilesource\" }\n" position { x: -2.649 y: 10.333 } scale { x: .28977 y: .28977 z: 1 } }
