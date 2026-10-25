-- The shark's shortest-angle turn, shared by swimming and flying previews.
local M={}
function M.new() return {angle=0,target=0,direction=1,turning=false} end
function M.reverse(s)
    s.direction=-s.direction
    s.target=s.direction==1 and 0 or math.pi
    s.turning=true
end
function M.step(s,dt)
    local delta=math.atan2(math.sin(s.target-s.angle),math.cos(s.target-s.angle))
    s.angle=s.angle+delta*math.min(1,dt*8)
    s.turning=math.abs(delta)>=.001
end
function M.belly(angle) return math.cos(angle)<0 and -1 or 1 end
return M
