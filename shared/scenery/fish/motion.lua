-- Autonomous swimmer in world units, x-right/y-down. Camera height is 720.
local water=require('shared.scenery.water.motion')
local fish=require('shared.characters.fish.motion')
local viewport=require('shared.display.viewport')
local attack=require('shared.scenery.fish.attack')
local M={ART_RADIUS=1100,BASE_SCALE=.05}
local function clamp(v,lo,hi) return math.max(lo,math.min(hi,v)) end
function M.new(random)
    return {pose=fish.new(),random=random or math.random,x=640,y=648,elapsed=0,duration=0,mode='swim'}
end
function M.bounds(w,width)
    width=width or viewport.WIDTH
    local top=water.base_y(w)+water.amplitude(w)+6
    local depth=viewport.HEIGHT-top-6
    if depth<=0 then return nil end
    local scale=math.min(M.BASE_SCALE,depth/(2*M.ART_RADIUS+80))
    local radius=M.ART_RADIUS*scale;local left=(viewport.WIDTH-width)/2
    return {left=left+radius+6,right=left+width-radius-6,top=top+radius,bottom=viewport.HEIGHT-6-radius,scale=scale,rx=radius,ry=radius}
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
function M.step(s,dt,w,width)
    dt=math.max(0,dt);local b=M.bounds(w,width);s.visible=b~=nil
    if not b then return end
    s.scale=b.scale
    s.bounds=b
    local launched=false
    if s.mode~='swim' then
        local remaining
        launched,remaining=attack.step(s,dt,w)
        if s.mode~='swim' then return launched end
        dt=remaining
    end
    local x,y=clamp(s.x,b.left,b.right),clamp(s.y,b.top,b.bottom)
    local changed=not s.previous_bounds or s.previous_bounds.left~=b.left or s.previous_bounds.top~=b.top or s.previous_bounds.bottom~=b.bottom
    s.x,s.y=x,y;s.previous_bounds=b
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
    return launched
end
function M.values(s)
    local values=fish.values(s.pose)
    if s.mode=='charge' or s.mode=='leap' then
        values.tail=math.sin(s.pose.sw)*.32;values.fin=math.sin(s.pose.sw*.8+1.2)*.35
    end
    return values
end
return M
