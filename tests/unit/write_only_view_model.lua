package.path='./?.lua;'..package.path
local binding=require('shared.render.write_only_view_model')
local sky=require('shared.scenery.night_sky.motion')
local water=require('shared.scenery.water.motion')
local channels=sky.values(sky.new())
for name,value in pairs(water.values(water.new())) do channels[name]=value end
for _,name in ipairs({'moon_scale_x','moon_scale_y','moon_x','sky_left','sky_right'}) do channels[name]=0 end
local available,initialized=false,false
local removed,reads={},0
local api={get_view_model_instance=function(component) assert(component=='#sky');return available and 7 or nil end,
    cmd={getViewModelInstanceNumber=function(instance,name)
        reads=reads+1;assert(instance==7 and name=='water_alpha')
        if not initialized then error('Initial property request pending') end
        return 0
    end,unsubscribeToViewModelProperty=function(instance,name,kind)
        assert(instance==7 and kind==2 and channels[name]~=nil)
        assert(not removed[name],'Unsubscribe must happen once per instance')
        removed[name]=true
    end}}
local state=binding.new(api,'#sky',channels,'water_alpha')
assert(binding.prepare(state)==nil and reads==0 and not next(removed))
available=true
assert(binding.prepare(state)==nil and not state.ready and not next(removed))
initialized=true
assert(binding.prepare(state)==7 and state.ready)
local count=0;for _ in pairs(removed) do count=count+1 end
assert(count==637,'The schema must include all particles, moon, water mesh and reflection properties')
assert(removed.star_71_x and removed.dust_25_alpha and removed.water_y_162 and removed.water_reflect_alpha_13)
local previous=reads
for _=1,100 do assert(binding.prepare(state)==7) end
assert(reads==previous,'Ready bindings must not poll property values each frame')
-- Readiness belongs to the instance; another fixture must await its own priming.
initialized=false;removed={}
local other=binding.new(api,'#sky',channels,'water_alpha')
assert(binding.prepare(other)==nil and not next(removed))
initialized=true;assert(binding.prepare(other)==7 and removed.water_alpha)
assert(not pcall(binding.new,api,'#sky',channels,'missing'))
print('PASS write-only Rive models: async readiness, full 637-channel schema, one-time unsubscription and fixture isolation')
