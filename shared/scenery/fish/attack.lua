-- Three public modes: swim / attack / excited. Flight phases are internal.
local water=require('shared.scenery.water.motion')
local viewport=require('shared.display.viewport')
local mouth=require('shared.scenery.fish.mouth')
local M={RANGE=128,LAUNCH_RANGE=96,HIT_RADIUS=24,APPROACH_SPEED=480,
    GRAVITY=viewport.HEIGHT*4.2,RETURN_SPEED=360,NORMAL_RETURN_SPEED=120}
local function clamp(v,a,b) return math.max(a,math.min(b,v)) end
function M.accepts(x,y,w,width)
    if type(x)~='number' or type(y)~='number' or x~=x or y~=y then return false end
    local left=(viewport.WIDTH-width)/2;local surface=water.surface_y(w,x)
    return x>=left and x<=left+width and y>=0 and y<surface and y>=surface-M.RANGE
end
function M.cancel(s)
    s.mode='swim';s.phase=nil;s.target=nil;s.caught=nil;s.lock=nil
    s.vx=0;s.vy=0;s.duration=0;s.elapsed=0;s.excited_side=nil
    s.from_x=nil;s.from_y=nil;s.to_x=nil;s.to_y=nil
    s.charge_time=nil;s.flight_time=nil;s.flight_elapsed=nil
    s.launch_x=nil;s.launch_y=nil;s.launch_vy=nil;s.launch_count=nil
    s.resume_attack=nil;s.bite_done=nil
    -- Remove the previous controller's queue/recovery state as well.
    s.pending=nil;s.rest=nil;s.excited=nil
end
local function charge(s)
    s.phase='charge';s.charge_time=0;s.resume_attack=nil
end
function M.place(s,x,y,w,width)
    local valid=M.accepts(x,y,w,width)
    -- Placement owns only prey existence/position, never the attack lock.
    -- Removing a carried bird ends excitement; a committed attack stays intact.
    if s.mode=='excited' then M.cancel(s) end
    s.target=valid and {x=x,y=y} or nil;s.caught=nil
    return valid
end
function M.acquire(s)
    if s.mode~='swim' or not s.target or s.caught then return false end
    local prey=s.target
    M.cancel(s)
    s.target=prey;s.lock={x=prey.x,y=prey.y};s.mode='attack';charge(s)
    return true
end
function M.outside(s,b)
    return s.x<b.left or s.x>b.right or s.y<b.top or s.y>b.bottom
end
function M.return_to_water(s,resume_attack)
    s.phase='return';s.resume_attack=resume_attack or nil
    s.duration=0;s.elapsed=0
end
function M.step(s,dt,w)
    local launched=false
    -- Consume time in bounded steps so a slow frame cannot skip contact or
    -- re-entry. No recovery timer and no queued placement survive a reset.
    while dt>1e-9 and s.phase do
        local h=math.min(dt,1/120);dt=dt-h
        local mouth_x,mouth_y=mouth.position(s);local was_leaping=s.phase=='leap'
        local size=s.scale*1336/2.1
        if s.phase=='charge' then
            s.charge_time=s.charge_time+h
            local sprint=M.APPROACH_SPEED
            local dx=s.lock.x-s.x
            local desired=clamp(dx*6,-sprint,sprint)
            s.vx=s.vx+clamp(desired-s.vx,-1600*h,1600*h)
            local surf=water.surface_y(w,s.x)+size*.5
            s.vy=clamp((surf-s.y)*12,-sprint,sprint)
            -- Both range and surface approach are required; never force a
            -- distant launch because a timer expired or velocity is high.
            if math.abs(s.y-surf)<=math.max(4,size*.5) and math.abs(dx)<=M.LAUNCH_RANGE then
                local dy=s.lock.y-s.y
                s.flight_time=clamp(math.sqrt(math.abs(dy)*2/M.GRAVITY)*.85,.16,.4)
                s.vx=dx/s.flight_time
                s.vy=(dy-.5*M.GRAVITY*s.flight_time^2)/s.flight_time
                s.launch_x,s.launch_y,s.launch_vy=s.x,s.y,s.vy
                s.flight_elapsed=0;s.phase='leap';s.launch_count=(s.launch_count or 0)+1
                launched=true
            else s.x=s.x+s.vx*h;s.y=s.y+s.vy*h end
        elseif s.phase=='leap' then
            s.flight_elapsed=s.flight_elapsed+h
            local t=s.flight_elapsed
            s.x=s.launch_x+s.vx*t
            s.y=s.launch_y+s.launch_vy*t+.5*M.GRAVITY*t*t
            s.vy=s.launch_vy+M.GRAVITY*t
            if t>s.flight_time and s.vy>0 and s.y>water.surface_y(w,s.x)+size*.3 then
                M.return_to_water(s,false)
            end
        elseif s.phase=='return' then
            local b=s.bounds
            local dx,dy=clamp(s.x,b.left,b.right)-s.x,clamp(s.y,b.top,b.bottom)-s.y
            local distance=math.sqrt(dx*dx+dy*dy)
            local speed=s.mode=='swim' and M.NORMAL_RETURN_SPEED or M.RETURN_SPEED
            if distance<=speed*h then
                s.x=s.x+dx;s.y=s.y+dy;s.vx=0;s.vy=0
                s.phase=nil;s.duration=0;s.elapsed=0
                if s.resume_attack then charge(s)
                else
                    s.mode=s.caught and 'excited' or 'swim';s.lock=nil
                end
            else
                s.vx=dx/distance*speed;s.vy=dy/distance*speed
                s.x=s.x+s.vx*h;s.y=s.y+s.vy*h
            end
        end
        local want=math.atan2(s.vy*(s.phase=='leap' and 1 or .6),math.abs(s.vx)>1 and s.vx or s.pose.direction)
        local delta=math.atan2(math.sin(want-s.pose.angle),math.cos(want-s.pose.angle))
        s.pose.angle=s.pose.angle+delta*math.min(1,h*(s.phase=='leap' and 14 or 8))
        s.pose.direction=math.cos(s.pose.angle)<0 and -1 or 1
        s.pose.target=s.pose.direction==1 and 0 or math.pi
        s.pose.time=s.pose.time+h;s.pose.sw=s.pose.sw+h*(s.mode=='swim' and 7.5 or 20)
        if s.mode=='attack' and was_leaping and not s.bite_done and s.lock then
            local x,y=mouth.position(s)
            -- Bite once at the locked location, even when no prey remains.
            if mouth.touches(mouth_x,mouth_y,x,y,s.lock.x,s.lock.y,14+size*.22)
                or s.flight_elapsed>=s.flight_time then
                s.bite_done=true
                local p=s.target
                if p and (p.x-s.lock.x)^2+(p.y-s.lock.y)^2<=M.HIT_RADIUS^2 then
                    s.caught=p
                end
            end
        end
    end
    return launched,dt
end
return M
