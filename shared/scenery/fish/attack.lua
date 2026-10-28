-- Legacy shark.js charge -> locked ballistic leap -> recovery, in world y-down.
local water=require('shared.scenery.water.motion')
local viewport=require('shared.display.viewport')
local mouth=require('shared.scenery.fish.mouth')
local M={RANGE=128,GRAVITY=viewport.HEIGHT*4.2}
local function clamp(v,a,b) return math.max(a,math.min(b,v)) end
function M.accepts(x,y,w,width)
    if type(x)~='number' or type(y)~='number' or x~=x or y~=y then return false end
    local left=(viewport.WIDTH-width)/2;local surface=water.surface_y(w,x)
    return x>=left and x<=left+width and y>=0 and y<surface and y>=surface-M.RANGE
end
local function charge(s)
    s.lock={x=s.target.x,y=s.target.y};s.mode='charge';s.charge_time=0
    s.vx=s.vx or 0;s.vy=s.vy or 0;s.pending=false
end
function M.place(s,x,y,w,width)
    if not M.accepts(x,y,w,width) then return false end
    s.target={x=x,y=y};s.caught=nil;s.excited_side=nil
    if s.mode=='leap' or s.mode=='recover' then s.pending=true else charge(s) end
    return true
end
function M.cancel(s)
    s.mode='swim';s.target=nil;s.caught=nil;s.lock=nil;s.pending=false;s.duration=0;s.elapsed=0
    s.vx=0;s.vy=0
    s.excited_side=nil
end
function M.step(s,dt,w)
    local launched=false
    -- Bounded integration preserves charge steering and landing on slow frames.
    while dt>1e-9 and s.mode~='swim' do
        local h=math.min(dt,1/120);dt=dt-h
        local mouth_x,mouth_y=mouth.position(s);local was_leaping=s.mode=='leap'
        -- Legacy k = size * 2.1 / FISH_SPAN, with the original 1336-unit SVG.
        local size=s.scale*1336/2.1
        if s.mode=='charge' then
            s.charge_time=s.charge_time+h
            -- Fixed design-world speeds, independent of responsive window width.
            local sprint=math.max(380,viewport.WIDTH*1.05)*1.5
            local dx=s.lock.x-s.x
            local desired=clamp(dx*8,-sprint*1.6,sprint*1.6)
            s.vx=s.vx+clamp(desired-s.vx,-sprint*2.6*1.6*2*h,sprint*2.6*1.6*2*h)
            local surf=water.surface_y(w,s.x)+size*.5
            s.vy=clamp((surf-s.y)*12,-viewport.HEIGHT*1.6,viewport.HEIGHT*1.6)
            local reach=math.max(size*2.2,math.abs(s.vx)*.12)
            if (s.y<surf+size*.5 and math.abs(dx)<reach) or s.charge_time>1.1 then
                local dy=s.lock.y-s.y
                s.flight_time=clamp(math.sqrt(math.abs(dy)*2/M.GRAVITY)*.85,.16,.4)
                s.vx=dx/s.flight_time
                s.vy=(dy-.5*M.GRAVITY*s.flight_time^2)/s.flight_time
                s.launch_x,s.launch_y,s.launch_vy=s.x,s.y,s.vy
                s.flight_elapsed=0;s.mode='leap';s.launch_count=(s.launch_count or 0)+1
                launched=true
            else s.x=s.x+s.vx*h;s.y=s.y+s.vy*h end
        elseif s.mode=='leap' then
            s.flight_elapsed=s.flight_elapsed+h
            local t=s.flight_elapsed
            s.x=s.launch_x+s.vx*t
            s.y=s.launch_y+s.launch_vy*t+.5*M.GRAVITY*t*t
            s.vy=s.launch_vy+M.GRAVITY*t
            if t>s.flight_time and s.vy>0 and s.y>water.surface_y(w,s.x)+size*.3 then
                s.vx=s.vx*.4;s.vy=s.vy*.25;s.mode='recover';s.rest=.55
            end
        elseif s.mode=='recover' then
            s.rest=s.rest-h
            local b=s.bounds
            local desired=clamp(s.y,b.top,b.bottom)
            s.y=s.y+(desired-s.y)*math.min(1,h*8)
            s.x=clamp(s.x+s.vx*h,b.left,b.right);s.vx=s.vx*(1-h*4)
            if s.rest<=0 then
                if s.pending then charge(s)
                else s.mode='swim';s.lock=nil;s.duration=0;s.elapsed=0 end
            end
        end
        -- Same shortest-angle steering and belly flip as the legacy painter.
        local want=math.atan2(s.vy*(s.mode=='leap' and 1 or .6),math.abs(s.vx)>1 and s.vx or s.pose.direction)
        local delta=math.atan2(math.sin(want-s.pose.angle),math.cos(want-s.pose.angle))
        s.pose.angle=s.pose.angle+delta*math.min(1,h*(s.mode=='leap' and 14 or 8))
        s.pose.direction=math.cos(s.pose.angle)<0 and -1 or 1
        s.pose.target=s.pose.direction==1 and 0 or math.pi
        s.pose.time=s.pose.time+h;s.pose.sw=s.pose.sw+h*(s.mode=='recover' and 4 or 20)
        if (was_leaping or s.mode=='leap') and s.target and s.caught~=s.target then
            local x,y=mouth.position(s)
            -- Swept contact prevents a fast leap/slow frame skipping the bird.
            local radius=14+size*.22
            if mouth.touches(mouth_x,mouth_y,x,y,s.target.x,s.target.y,radius) then
                s.caught=s.target;s.pending=false
            end
        end
    end
    return launched,dt
end
return M
