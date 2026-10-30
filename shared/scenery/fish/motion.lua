-- Autonomous swimmer in world units, x-right/y-down. Camera height is 720.
local water=require('shared.scenery.water.motion')
local fish=require('shared.characters.fish.motion')
local viewport=require('shared.display.viewport')
local attack=require('shared.scenery.fish.attack')
local M={ART_RADIUS=1100,BASE_SCALE=.05,CARRIED_SPEED=300,CARRIED_BEAT=20}
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
    if s.mode=='excited' then
        -- Celebrate the catch by crossing the available water repeatedly.
        -- Choose the far side first, then alternate without random short hops.
        s.excited_side=s.excited_side and -s.excited_side or (s.x>=(b.left+b.right)/2 and -1 or 1)
        s.to_x=s.excited_side==1 and b.right or b.left
    else s.to_x=b.left+s.random()*(b.right-b.left) end
    s.to_y=b.top+s.random()*(b.bottom-b.top)
    -- Alternate vertical direction while allowing random distances and both headings.
    local middle=(b.top+b.bottom)/2
    if s.y>=middle then s.to_y=b.top+s.random()*(middle-b.top)
    else s.to_y=middle+s.random()*(b.bottom-middle) end
    local dx,dy=s.to_x-s.x,s.to_y-s.y
    local distance=math.sqrt(dx*dx+dy*dy)
    s.elapsed=0
    s.duration=s.mode=='excited' and math.max(.28,distance/M.CARRIED_SPEED)
        or math.max(1.2,distance/(30+s.random()*25))
    if math.abs(dx)>1 and (dx>0 and 1 or -1)~=s.pose.direction then fish.turn(s.pose) end
end
function M.place(s,x,y,w,width)
    return attack.place(s,x,y,w,width)
end
function M.step(s,dt,w,width)
    dt=math.max(0,dt);local b=M.bounds(w,width);s.visible=b~=nil
    if not b then return end
    s.scale=b.scale
    s.bounds=b
    local launched=false
    attack.cancel_lost_approach(s)
    if s.soft_return and not attack.outside(s,b) then s.soft_return=nil end
    while true do
        -- Patrol detects existing prey on every update, including the instant
        -- an unsuccessful attack returns underwater. No placement event needed.
        if attack.acquire(s) then
            if attack.outside(s,b) then attack.return_to_water(s,true) end
        elseif not s.phase and not s.soft_return and attack.outside(s,b) then
            attack.return_to_water(s,false)
        end
        if not s.phase then break end
        local fired,remaining=attack.step(s,dt,w)
        launched=launched or fired;dt=remaining
        if s.phase then return launched end
        if not (s.mode=='swim' and s.target and not s.caught) then break end
    end
    local changed=not s.previous_bounds or s.previous_bounds.left~=b.left or s.previous_bounds.top~=b.top or s.previous_bounds.bottom~=b.bottom
    s.previous_bounds=b
    if changed then s.duration=0 end
    -- Consume segment boundaries so a slow frame cannot skip a change of direction.
    local remaining=dt
    repeat
        if s.elapsed>=s.duration then choose(s,b) end
        local step=math.min(remaining,s.duration-s.elapsed)
        s.elapsed=s.elapsed+step;remaining=remaining-step
        local t=s.elapsed/s.duration;t=t*t*(3-2*t)
        s.x=s.from_x+(s.to_x-s.from_x)*t;s.y=s.from_y+(s.to_y-s.from_y)*t
        fish.step(s.pose,step,s.mode=='excited' and M.CARRIED_BEAT or nil)
    until remaining<=0
    return launched
end
function M.values(s)
    local values=fish.values(s.pose)
    if s.mode=='attack' or s.mode=='excited' then
        values.tail=math.sin(s.pose.sw)*.32;values.fin=math.sin(s.pose.sw*.8+1.2)*.35
    end
    return values
end
return M
