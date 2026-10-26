package.path='./?.lua;'..package.path
local m=require('shared.scenery.water.motion')
local rig=require('shared.scenery.water.rig')
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local s=m.new()
near(s.level,.2)
near(s.roughness,.6)
m.set_level(s,.2);m.set_roughness(s,m.LEGACY_ROUGHNESS)
local original=m.surface_y(s,100)
local storm=m.new();m.set_roughness(storm,m.LEGACY_ROUGHNESS);m.step(storm,2.3)
local old_time,old_wave,old_level=storm.time,storm.wave_time,storm.level
local function span(state)
    local lo,hi=math.huge,-math.huge
    for i=0,rig.points-1 do local y=m.surface_y(state,rig.min_x+i*rig.step);lo=math.min(lo,y);hi=math.max(hi,y) end
    return hi-lo
end
local legacy_span=span(storm)
assert(m.set_roughness(storm,1));near(storm.time,old_time);near(storm.wave_time,old_wave);near(storm.level,old_level)
assert(span(storm)>legacy_span*2,'Roughness did not raise the waves')
m.step(storm,.5);assert(storm.wave_time-old_wave>.5 and storm.time-old_time==.5)
assert(m.set_roughness(storm,-1));near(storm.roughness,0)
for i=0,rig.points-1 do near(m.surface_y(storm,rig.min_x+i*rig.step),m.base_y(storm)) end
assert(m.set_roughness(storm,2));near(storm.roughness,1)
assert(not m.set_roughness(storm,0/0) and not m.set_roughness(storm,math.huge) and not m.set_roughness(storm,'bad'))
for _,level in ipairs({0,.35,1}) do
    m.set_level(storm,level);m.step(storm,.13);local v=m.values(storm)
    for i=0,rig.points-1 do
        local y=v['water_y_'..i]
        assert(math.abs(y-m.base_y(storm))<=23.500001 and y<744,'Rough waves escaped the opaque body')
    end
    for i=0,rig.reflections-1 do
        local left=v['water_reflect_x_'..i];local right=left+v['water_reflect_width_'..i]
        for j=0,rig.points-1 do
            local x=rig.min_x+j*rig.step
            if x>=left and x<=right then assert(v['water_reflect_y_'..i]>v['water_y_'..j],'Rough wave exposed a lunar glint in the sky') end
        end
    end
end
local level_test=m.new();m.set_roughness(level_test,m.LEGACY_ROUGHNESS);m.step(level_test,2.3)
local phase=level_test.time;local before=m.values(level_test)
assert(m.set_level(level_test,.75));near(level_test.time,phase)
local after=m.values(level_test)
for i=0,rig.points-1 do
    near(after['water_y_'..i]-before['water_y_'..i],-396)
end
assert(m.set_level(level_test,-1));near(level_test.level,0)
assert(m.set_level(level_test,2));near(level_test.level,1)
assert(not m.set_level(level_test,0/0) and not m.set_level(level_test,math.huge) and not m.set_level(level_test,'bad'))
near(level_test.level,1)
for _,level in ipairs({0,.2,.35,.75,1}) do
    m.set_level(level_test,level)
    for i=0,rig.points-1 do
        local y=m.values(level_test)['water_y_'..i]
        assert(math.abs(y-720*(1-level))<=3.700001)
        assert(y<744,'Water surface passed below the opaque body bottom')
    end
end
for frame=1,240 do
    local dt=({.013,.025,.15})[(frame-1)%3+1];m.step(s,dt)
    local v=m.values(s);assert(v.water_alpha==1)
    near(v.water_gradient_y,m.base_y(s))
    for i=0,rig.points-1 do
        local y=v['water_y_'..i]
        assert(math.abs(y-rig.base_y)<=3.700001,'Legacy ripple became too large')
    end
    for i=0,rig.reflections-1 do
        assert(v['water_reflect_y_'..i]>m.base_y(s)+3.7,'Moon glint crossed above the waves')
        assert(v['water_reflect_width_'..i]>0)
        assert(v['water_reflect_alpha_'..i]>0 and v['water_reflect_alpha_'..i]<=.28)
        if i>0 then assert(v['water_reflect_alpha_'..i]<v['water_reflect_alpha_'..(i-1)]) end
    end
end
assert(rig.step==8 and rig.reflections==14)
assert(math.abs(m.surface_y(s,100)-original)>.1,'Water stayed still')
local time=s.time;m.step(s,-2);near(s.time,time)
local slow,fast=m.new(),m.new();m.step(slow,1);for i=1,60 do m.step(fast,1/60) end
near(m.surface_y(slow,117),m.surface_y(fast,117))
assert(rig.min_x<0 and rig.min_x+(rig.points-1)*rig.step>1280,'Wave must cover both viewport edges')
print('PASS water: legacy ripples/lunar shimmer, bounded heights, phase-preserving levels and frame-rate independence')
