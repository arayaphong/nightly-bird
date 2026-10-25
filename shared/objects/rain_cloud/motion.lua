local rig=require('shared.objects.rain_cloud.rig')
local M={charge_duration=.2,bolt_duration=.28}
M.strike_duration=M.charge_duration+M.bolt_duration
local function random(s,low,high)
    -- Local Park–Miller generator: no global random seed or per-frame changes.
    s.random=s.random*48271%2147483647
    return low+(high-low)*(s.random-1)/2147483646
end
function M.new(seed)
    return {time=0,remaining=0,elapsed=0,random=math.floor(math.abs(seed or os.time()))%2147483646+1,bolt={},fork={}}
end
function M.preview_target(x,y)
    -- Preview artboard coordinates are x-right/y-down. The motion model itself
    -- accepts a target relative to the cloud, so a game can supply its bird pose.
    return {x=(x-rig.preview.x)/rig.preview.scale,y=(y-rig.preview.y)/rig.preview.scale}
end
function M.strike(s,target)
    if s.remaining>0 then return false end
    local bounds=rig.target
    local x1,y1
    if target then x1,y1=target.x,target.y
    else x1,y1=random(s,bounds.min_x,bounds.max_x),random(s,bounds.min_y,bounds.max_y) end
    -- Start inside the cloud on the side facing the target. Perpendicular
    -- jitter works equally for upward, sideways and downward shots.
    local dx,dy=x1,y1+6
    local radius=math.sqrt((dx/80)^2+(dy/34)^2)
    local anchor=radius>0 and math.min(.7/radius,.35) or 0
    local x0,y0=dx*anchor,-6+dy*anchor
    dx,dy=x1-x0,y1-y0
    local length=math.sqrt(dx*dx+dy*dy)
    local ux,uy=0,1
    if length>0 then ux,uy=dx/length,dy/length end
    local nx,ny=-uy,ux
    local amplitude=math.min(17,length*.12)
    local direction=random(s,0,1)<.5 and -1 or 1
    s.bolt={}
    for i=1,rig.bolt_points do
        local t=(i-1)/(rig.bolt_points-1)
        local jitter=(i==1 or i==rig.bolt_points) and 0 or direction*random(s,amplitude*.4,amplitude)*math.sin(t*math.pi)
        s.bolt[i]={x=x0+dx*t+nx*jitter,y=y0+dy*t+ny*jitter}
        direction=-direction
    end
    local branch=s.bolt[4];local side=random(s,0,1)<.5 and -1 or 1
    s.fork={{x=branch.x,y=branch.y}}
    for i=2,rig.fork_points do
        local along=(i-1)*random(s,.07,.13)*length
        local across=side*(i-1)*random(s,.6,1)*amplitude
        s.fork[i]={x=branch.x+ux*along+nx*across,y=branch.y+uy*along+ny*across}
    end
    s.elapsed=0;s.remaining=M.strike_duration;return true
end
function M.cancel(s) s.remaining=0;s.elapsed=0 end
function M.step(s,dt)
    dt=math.max(0,dt);s.time=s.time+dt
    if s.remaining==0 then return false end
    local before=s.elapsed
    s.elapsed=math.min(M.strike_duration,s.elapsed+dt)
    if math.abs(s.elapsed-M.charge_duration)<1e-9 then s.elapsed=M.charge_duration end
    s.remaining=math.max(0,M.strike_duration-s.elapsed)
    -- A one-shot event at the exact boundary; even a long frame crosses it once.
    return before<M.charge_duration and s.elapsed>=M.charge_duration
end
function M.values(s,page)
    local t=s.time
    local v={show_cloud=(page==nil or page=='cloud') and 1 or 0,
        cloud_y=math.sin(t*1.5)*1.5,bolt_alpha=0,flash_alpha=0,dark_alpha=0,
        strike_glow_x=0,strike_glow_y=45}
    if (page==nil or page=='cloud') and s.remaining>0 then
        local age=s.elapsed
        if age<M.charge_duration then
            local phase=math.floor(age/(M.charge_duration/4)+1e-9)
            if phase%2==0 then v.dark_alpha=.9 else v.flash_alpha=1 end
        else
            -- Restore the original cloud before showing the bolt. No cloud or
            -- sky flash is carried into the discharge phase.
            v.bolt_alpha=math.min(1,s.remaining/.12)
        end
    end
    for _,name in ipairs({'bolt','fork'}) do
        for i=1,rig[name..'_points'] do
            local p=s[name][i] or {x=0,y=23+(i-1)*15}
            v[name..'_x_'..(i-1)]=p.x;v[name..'_y_'..(i-1)]=p.y
        end
    end
    if #s.bolt>0 then
        local a,b=s.bolt[1],s.bolt[#s.bolt]
        v.strike_glow_x=(a.x+b.x)/2;v.strike_glow_y=(a.y+b.y)/2
    end
    for i,d in ipairs(rig.drops) do
        local age=(t+d.phase*.7)%.7
        v['rain_x_'..(i-1)]=d.x-40*age
        v['rain_y_'..(i-1)]=36+150*age
        v['rain_alpha_'..(i-1)]=math.min(1,age/.06)*math.min(1,(.7-age)/.12)
    end
    return v
end
return M
