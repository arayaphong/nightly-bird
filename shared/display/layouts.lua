-- Both presentations share the same interaction and simulation scripts.
return {
    portrait={menu=require('shared.display.layouts.portrait.menu'),characters=require('shared.display.layouts.portrait.characters'),
        scenery=require('shared.display.layouts.portrait.scenery'),system_info=require('shared.display.layouts.portrait.system_info')},
    landscape={menu=require('shared.display.layouts.landscape.menu'),characters=require('shared.display.layouts.landscape.characters'),
        scenery=require('shared.display.layouts.landscape.scenery'),system_info=require('shared.display.layouts.landscape.system_info')},
}
