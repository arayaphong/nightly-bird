-- Ripple line and lunar shimmer ported from legacy environment-painter.js.
local rig=require('shared.scenery.water.rig')
local M={MIN_LEVEL=0,MAX_LEVEL=1,DEFAULT_LEVEL=1-rig.base_y/rig.height}
function M.new() return {time=0,level=M.DEFAULT_LEVEL} end
function M.set_level(s,level)
    if type(level)~='number' or level~=level or math.abs(level)==math.huge then return false end
    s.level=math.max(M.MIN_LEVEL,math.min(M.MAX_LEVEL,level));return true
end
function M.step(s,dt) s.time=s.time+math.max(0,dt) end
function M.base_y(s) return rig.height*(1-s.level) end
function M.surface_y(s,x)
    local y=M.base_y(s)
    for _,w in ipairs(rig.waves) do y=y+w.amplitude*math.sin(w.k*x+w.rate*s.time+w.phase) end
    return y
end
function M.values(s)
    local base=M.base_y(s)
    -- Keep a non-zero paint axis at 0% water; the geometry is offscreen there.
    local v={water_alpha=1,water_gradient_y=math.min(base,rig.height-.001)}
    for i=0,rig.points-1 do
        local x=rig.min_x+i*rig.step
        v['water_y_'..i]=M.surface_y(s,x)
    end
    for i=0,rig.reflections-1 do
        local width=18+math.sin(s.time*2+i)*8+i*1.5
        v['water_reflect_x_'..i]=rig.moon_x-width/2+math.sin(s.time*1.7+i*1.3)*6
        v['water_reflect_y_'..i]=base+8+i*(rig.height-base)/14
        v['water_reflect_width_'..i]=width
        v['water_reflect_alpha_'..i]=.28*(1-i/14)
    end
    return v
end
return M
