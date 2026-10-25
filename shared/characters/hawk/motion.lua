-- Flight/flap and dive flutter from hawk-painter.js and Hawk.afterPhysics.
local blades=require('shared.characters.hawk.rig')
local M={DIVE_TIME=3}
function M.new() return {time=0,flap=0,remaining=0,direction=1} end
function M.turn(s) s.direction=-s.direction end
function M.dive(s)
    if s.remaining>0 then return false end
    s.remaining=M.DIVE_TIME;return true
end
function M.cancel(s) s.remaining=0 end
function M.step(s,dt)
    dt=math.max(0,dt)
    local diving=math.min(dt,s.remaining)
    s.flap=s.flap+diving*2+(dt-diving)*5
    s.time=s.time+dt;s.remaining=math.max(0,s.remaining-diving)
    if s.remaining<1e-9 then s.remaining=0 end
end
function M.values(s)
    local diving=s.remaining>0
    local v={flight_visible=diving and 0 or 1,dive_visible=diving and 1 or 0,
             wing_rotation=math.sin(s.flap)*math.rad(-48),facing=s.direction}
    local flutter=math.sin(s.time*45)*5
    for i,b in ipairs(blades) do
        local dx=b.targetX-b.x
        local dy=b.targetY+flutter*(1-b.targetX/1000)-b.y
        v['blade_'..(i-1)..'_angle']=math.atan2(dy,dx)
        v['blade_'..(i-1)..'_scale']=math.sqrt(dx*dx+dy*dy)/b.length
    end
    return v
end
return M
