local rig=require('rive-demo.nature-rig')
local M={strike_duration=.72}
local function random(s,low,high)
    -- Local Park–Miller generator: no global random seed or per-frame changes.
    s.random=s.random*48271%2147483647
    return low+(high-low)*(s.random-1)/2147483646
end
function M.new(seed)
    return {time=0,remaining=0,random=math.floor(math.abs(seed or os.time()))%2147483646+1,bolt={},fork={}}
end
function M.strike(s)
    if s.remaining>0 then return false end
    local bounds=rig.target
    local x0,y0=random(s,-48,48),23
    local x1,y1=random(s,bounds.min_x,bounds.max_x),random(s,bounds.min_y,bounds.max_y)
    local direction=random(s,0,1)<.5 and -1 or 1
    s.bolt={}
    for i=1,rig.bolt_points do
        local t=(i-1)/(rig.bolt_points-1)
        local jitter=(i==1 or i==rig.bolt_points) and 0 or direction*random(s,7,17)*math.sin(t*math.pi)
        s.bolt[i]={x=x0+(x1-x0)*t+jitter,y=y0+(y1-y0)*t}
        direction=-direction
    end
    local branch=s.bolt[4];local side=random(s,0,1)<.5 and -1 or 1
    s.fork={{x=branch.x,y=branch.y}}
    for i=2,rig.fork_points do
        s.fork[i]={x=math.max(bounds.min_x,math.min(bounds.max_x,branch.x+side*random(s,13,22)*(i-1))),
                   y=math.min(bounds.max_y,branch.y+(i-1)*random(s,10,22))}
    end
    s.remaining=M.strike_duration;return true
end
function M.cancel(s) s.remaining=0 end
function M.step(s,dt)
    dt=math.max(0,dt);s.time=s.time+dt
    s.remaining=math.max(0,s.remaining-dt)
end
function M.values(s,page)
    local t=s.time;local pulse=.6+.4*math.sin(t*5)
    local v={show_firefly=page=='firefly' and 1 or 0,show_balloon=page=='balloon' and 1 or 0,
        show_cloud=page=='cloud' and 1 or 0,wing_left=(1.6+math.sin(t*40))/1.6,
        wing_right=(1.6-math.sin(t*40))/1.6,lamp_mix=.5+.5*math.sin(t*1.8),
        glow_scale=(16+8*pulse)/24,glow_alpha=.95*pulse,
        balloon_y=300+math.sin(t*1.2)*5,balloon_rotation=math.sin(t*2)*.035,
        cloud_y=math.sin(t*1.5)*1.5,bolt_alpha=0,flash_alpha=0,dark_alpha=0,
        strike_glow_x=0,strike_glow_y=45}
    if page=='cloud' and s.remaining>0 then
        local age=M.strike_duration-s.remaining
        if age<.12 then v.dark_alpha=.85
        elseif age<.22 then v.bolt_alpha=1;v.flash_alpha=1
        elseif age<.36 then v.bolt_alpha=.08;v.dark_alpha=.95
        elseif age<.46 then v.bolt_alpha=.9;v.flash_alpha=.85
        else v.bolt_alpha=.9*s.remaining/.26;v.dark_alpha=.55*s.remaining/.26 end
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
