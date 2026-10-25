-- Cruise pose from fish-painter.js; heading interpolation from shark.js.
local M={}
function M.new() return {time=0,sw=0,angle=0,target=0,direction=1,turning=false} end
function M.turn(s)
    s.direction=-s.direction
    s.target=s.direction==1 and 0 or math.pi
    s.turning=true
end
function M.step(s,dt)
    s.time=s.time+dt;s.sw=s.sw+7.5*dt
    local delta=math.atan2(math.sin(s.target-s.angle),math.cos(s.target-s.angle))
    s.angle=s.angle+delta*math.min(1,dt*8)
    s.turning=math.abs(delta)>=.001
end
function M.values(s)
    local angle=s.angle+math.sin(s.sw)*.035
    local gill=1+.28*math.max(0,math.sin(s.time*2.6))
    return {angle=angle,belly=math.cos(angle)<0 and -1 or 1,
        tail=math.sin(s.sw)*.2,fin=math.sin(s.sw*.8+1.2)*.22,
        gill_x=gill,gill_y=1+(gill-1)*.35}
end
return M
