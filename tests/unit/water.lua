package.path='./?.lua;'..package.path
local m=require('shared.scenery.water.motion')
local rig=require('shared.scenery.water.rig')
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local s=m.new();local original=m.surface_y(s,100)
near(s.level,.35)
local level_test=m.new();m.step(level_test,2.3)
local phase=level_test.time;local before=m.values(level_test)
assert(m.set_level(level_test,.75));near(level_test.time,phase)
local after=m.values(level_test)
for i=0,rig.points-1 do
    near(after['water_y_'..i]-before['water_y_'..i],-320)
    near(after['water_out_'..i],before['water_out_'..i])
    near(after['water_length_'..i],before['water_length_'..i])
end
assert(m.set_level(level_test,-1));near(level_test.level,0)
assert(m.set_level(level_test,2));near(level_test.level,1)
assert(not m.set_level(level_test,0/0) and not m.set_level(level_test,math.huge) and not m.set_level(level_test,'bad'))
near(level_test.level,1)
for _,level in ipairs({0,.2,.35,.75,1}) do
    m.set_level(level_test,level)
    for i=0,rig.points-1 do
        local y=m.values(level_test)['water_y_'..i]
        assert(math.abs(y-800*(1-level))<=8.5)
        assert(y<824,'Water surface passed below the opaque body bottom')
    end
end
local function cubic(a,b,c,d,t) return (1-t)^3*a+3*(1-t)^2*t*b+3*(1-t)*t*t*c+t^3*d end
for frame=1,240 do
    local dt=({.013,.025,.15})[(frame-1)%3+1];m.step(s,dt)
    local v=m.values(s);assert(v.water_alpha==1)
    for i=0,rig.points-1 do
        local x=rig.min_x+i*rig.step;local y=v['water_y_'..i];local slope=m.slope(s,x)
        assert(y>rig.base_y-8.5 and y<rig.base_y+8.5)
        local numeric=(m.surface_y(s,x+.001)-m.surface_y(s,x-.001))/.002
        assert(math.abs(numeric-slope)<1e-7,'Wave tangent discontinuity')
        local length=v['water_length_'..i]
        near(math.cos(v['water_out_'..i])*length,rig.step/3)
        near(math.sin(v['water_out_'..i])*length,slope*rig.step/3)
        near(math.cos(v['water_in_'..i])*length,-rig.step/3)
        if i<rig.points-1 then
            local next_y=v['water_y_'..(i+1)];local next_slope=m.slope(s,x+rig.step)
            for _,t in ipairs({.25,.5,.75}) do
                local rendered=cubic(y,y+slope*rig.step/3,next_y-next_slope*rig.step/3,next_y,t)
                assert(math.abs(rendered-m.surface_y(s,x+t*rig.step))<.03,'Cubic water surface lost its smooth wave')
            end
        end
    end
end
assert(math.abs(m.surface_y(s,100)-original)>.1,'Water stayed still')
local time=s.time;m.step(s,-2);near(s.time,time)
local slow,fast=m.new(),m.new();m.step(slow,1);for i=1,60 do m.step(fast,1/60) end
near(m.surface_y(slow,117),m.surface_y(fast,117))
assert(rig.min_x<0 and rig.min_x+(rig.points-1)*rig.step>480,'Wave must cover both viewport edges')
print('PASS water: continuous animated cubics, shared body/surface geometry, bounded swells and frame-rate independence')
