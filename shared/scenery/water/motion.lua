-- Travelling swells, shared by the opaque water body and its surface strokes.
local rig=require('shared.scenery.water.rig')
local M={}
function M.new() return {time=0} end
function M.step(s,dt) s.time=s.time+math.max(0,dt) end
function M.surface_y(s,x)
    local y=rig.base_y
    for _,w in ipairs(rig.waves) do y=y+w.amplitude*math.sin(w.k*x+w.rate*s.time+w.phase) end
    return y
end
function M.slope(s,x)
    local slope=0
    for _,w in ipairs(rig.waves) do slope=slope+w.amplitude*w.k*math.cos(w.k*x+w.rate*s.time+w.phase) end
    return slope
end
function M.values(s)
    local v={water_alpha=1}
    for i=0,rig.points-1 do
        local x=rig.min_x+i*rig.step;local slope=M.slope(s,x)
        v['water_y_'..i]=M.surface_y(s,x)
        v['water_in_'..i]=math.atan2(-slope,-1)
        v['water_out_'..i]=math.atan2(slope,1)
        v['water_length_'..i]=rig.step/3*math.sqrt(1+slope*slope)
    end
    return v
end
return M
