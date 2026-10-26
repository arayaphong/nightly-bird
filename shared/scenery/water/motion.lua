-- Ripple line and lunar shimmer ported from legacy environment-painter.js.
local rig=require('shared.scenery.water.rig')
local M={MIN_LEVEL=0,MAX_LEVEL=1,DEFAULT_LEVEL=.2,DEFAULT_ROUGHNESS=.6,LEGACY_ROUGHNESS=.25}
function M.new() return {time=0,wave_time=0,level=M.DEFAULT_LEVEL,roughness=M.DEFAULT_ROUGHNESS,width=rig.width} end
function M.set_width(s,width) s.width=width end
local function mesh(s)
    local width=s.width or rig.width
    return (rig.width-width)/2+rig.min_x,(width-2*rig.min_x)/(rig.points-1)
end
function M.sample_x(s,index) local left,step=mesh(s);return left+index*step end
function M.set_level(s,level)
    if type(level)~='number' or level~=level or math.abs(level)==math.huge then return false end
    s.level=math.max(M.MIN_LEVEL,math.min(M.MAX_LEVEL,level));return true
end
function M.set_roughness(s,value)
    if type(value)~='number' or value~=value or math.abs(value)==math.huge then return false end
    s.roughness=math.max(0,math.min(1,value));return true
end
local function profile(s)
    if s.roughness<=M.LEGACY_ROUGHNESS then
        local t=s.roughness/M.LEGACY_ROUGHNESS
        return t,.35+.65*t,0
    end
    local t=(s.roughness-M.LEGACY_ROUGHNESS)/(1-M.LEGACY_ROUGHNESS)
    return 1+4*t,1+1.5*t,t*t
end
-- Conservative crest/trough envelope, also used to keep swimmers submerged.
function M.amplitude(s)
    local height,_,chop=profile(s)
    return height*3.7+chop*5
end
function M.step(s,dt)
    dt=math.max(0,dt);local _,speed=profile(s)
    s.time=s.time+dt;s.wave_time=s.wave_time+dt*speed
end
function M.base_y(s) return rig.height*(1-s.level) end
function M.surface_y(s,x)
    local y=M.base_y(s);local height,_,chop=profile(s)
    for _,w in ipairs(rig.waves) do y=y+height*w.amplitude*math.sin(w.k*x+w.rate*s.wave_time+w.phase) end
    if chop>0 then
        y=y+chop*(3*math.sin(x*.071+s.wave_time*4.1+.7)+2*math.sin(x*.113-s.wave_time*3.3+2.2))
    end
    return y
end
local function rendered_y(s,x)
    local edge,step=mesh(s)
    local left=edge+math.floor((x-edge)/step)*step
    local t=(x-left)/step
    return M.surface_y(s,left)*(1-t)+M.surface_y(s,left+step)*t
end
local function glint_floor(s,left,right)
    local y=math.max(rendered_y(s,left),rendered_y(s,right))
    local edge,step=mesh(s)
    local first=math.ceil((left-edge)/step)
    local last=math.floor((right-edge)/step)
    for i=first,last do y=math.max(y,M.surface_y(s,edge+i*step)) end
    return y+1
end
function M.values(s)
    local base=M.base_y(s)
    -- Keep a non-zero paint axis at 0% water; the geometry is offscreen there.
    local v={water_alpha=1,water_gradient_y=math.min(base,rig.height-.001)}
    for i=0,rig.points-1 do
        local x=M.sample_x(s,i);v['water_x_'..i]=x
        v['water_y_'..i]=M.surface_y(s,x)
    end
    for i=0,rig.reflections-1 do
        local width=18+math.sin(s.time*2+i)*8+i*1.5
        local moon_x=rig.moon_x+((s.width or rig.width)-rig.width)/2
        local x=moon_x-width/2+math.sin(s.time*1.7+i*1.3)*6
        local y=base+8+i*(rig.height-base)/14
        if s.roughness>M.LEGACY_ROUGHNESS then y=math.max(y,glint_floor(s,x,x+width)) end
        v['water_reflect_x_'..i]=x
        v['water_reflect_y_'..i]=y
        v['water_reflect_width_'..i]=width
        v['water_reflect_alpha_'..i]=.28*(1-i/14)
    end
    return v
end
return M
