-- Autonomous Studio swimmer. Positions are in the sky's 480x800, y-down space.
local water=require('shared.scenery.water.motion')
local fish=require('shared.characters.fish.motion')
local M={ART_RADIUS=1100,BASE_SCALE=.05}
local function clamp(v,lo,hi) return math.max(lo,math.min(hi,v)) end
function M.new(random)
    return {pose=fish.new(),random=random or math.random,x=240,y=720,elapsed=0,duration=0}
end
function M.bounds(w,sx,sy)
    sx,sy=sx or 1,sy or 1
    local top=water.base_y(w)+water.amplitude(w)+6
    local depth=800-top-6
    if depth<=0 then return nil end
    local scale=math.min(M.BASE_SCALE*math.min(sx,sy),depth*sy/(2*M.ART_RADIUS+80))
    local rx,ry=M.ART_RADIUS*scale/sx,M.ART_RADIUS*scale/sy
    return {left=rx+6,right=474-rx,top=top+ry,bottom=794-ry,scale=scale,rx=rx,ry=ry}
end
local function choose(s,b)
    s.from_x,s.from_y=s.x,s.y
    s.to_x=b.left+s.random()*(b.right-b.left)
    s.to_y=b.top+s.random()*(b.bottom-b.top)
    -- Alternate vertical direction while allowing random distances and both headings.
    local middle=(b.top+b.bottom)/2
    if s.y>=middle then s.to_y=b.top+s.random()*(middle-b.top)
    else s.to_y=middle+s.random()*(b.bottom-middle) end
    local dx,dy=s.to_x-s.x,s.to_y-s.y
    s.elapsed=0;s.duration=math.max(1.2,math.sqrt(dx*dx+dy*dy)/(30+s.random()*25))
    if math.abs(dx)>1 and (dx>0 and 1 or -1)~=s.pose.direction then fish.turn(s.pose) end
end
function M.step(s,dt,w,sx,sy)
    dt=math.max(0,dt);local b=M.bounds(w,sx,sy);s.visible=b~=nil
    if not b then return end
    s.scale=b.scale
    local x,y=clamp(s.x,b.left,b.right),clamp(s.y,b.top,b.bottom)
    local changed=not s.bounds or s.bounds.left~=b.left or s.bounds.top~=b.top or s.bounds.bottom~=b.bottom
    s.x,s.y=x,y;s.bounds=b
    if changed then s.duration=0 end
    -- Consume segment boundaries so a slow frame cannot skip a change of direction.
    local remaining=dt
    repeat
        if s.elapsed>=s.duration then choose(s,b) end
        local step=math.min(remaining,s.duration-s.elapsed)
        s.elapsed=s.elapsed+step;remaining=remaining-step
        local t=s.elapsed/s.duration;t=t*t*(3-2*t)
        s.x=s.from_x+(s.to_x-s.from_x)*t;s.y=s.from_y+(s.to_y-s.from_y)*t
        fish.step(s.pose,step)
    until remaining<=0
end
function M.values(s) return fish.values(s.pose) end
return M
