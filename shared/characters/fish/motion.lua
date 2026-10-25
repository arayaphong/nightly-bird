-- Cruise pose from fish-painter.js; heading interpolation from shark.js.
local heading=require('shared.motion.heading')
local M={}
function M.new() local s=heading.new();s.time=0;s.sw=0;return s end
function M.turn(s) heading.reverse(s) end
function M.step(s,dt)
    s.time=s.time+dt;s.sw=s.sw+7.5*dt
    heading.step(s,dt)
end
function M.values(s)
    local angle=s.angle+math.sin(s.sw)*.035
    local gill=1+.28*math.max(0,math.sin(s.time*2.6))
    return {angle=angle,belly=heading.belly(angle),
        tail=math.sin(s.sw)*.2,fin=math.sin(s.sw*.8+1.2)*.22,
        gill_x=gill,gill_y=1+(gill-1)*.35}
end
return M
