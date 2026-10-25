-- Coordinates are GUI reference points, shared by touch and mouse drags.
local M={}
function M.new() return {} end
function M.begin(s,id,x,y,button)
    local c={x=x,y=y,last_x=x,last_y=y,button=button,eligible=true,moved=false}
    s[id]=c
    local count=0;for _ in pairs(s) do count=count+1 end
    if count>1 then for _,other in pairs(s) do other.eligible=false end end
    return c
end
function M.move(s,id,x,y)
    local c=s[id];if not c then return nil end
    c.last_x,c.last_y=x,y
    local dx,dy=x-c.x,y-c.y
    if dx*dx+dy*dy>18*18 then c.moved=true end
    if c.eligible and math.abs(dx)>18 and math.abs(dx)>math.abs(dy)*1.4 then c.horizontal=true end
    return c
end
function M.finish(s,id,x,y)
    local c=M.move(s,id,x,y);if not c then return {} end
    s[id]=nil
    local dx,dy=x-c.x,y-c.y
    if c.eligible and math.abs(dx)>=64 and math.abs(dx)>math.abs(dy)*1.4 then
        return {swipe=dx<0 and -1 or 1}
    end
    if not c.moved then return {tap=c.button} end
    return {}
end
return M
