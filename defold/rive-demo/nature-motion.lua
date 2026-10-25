local rig=require('rive-demo.nature-rig')
local M={strike_duration=.48}
function M.new() return {time=0,remaining=0} end
function M.strike(s)
    if s.remaining>0 then return false end
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
        cloud_y=math.sin(t*1.5)*1.5,bolt_alpha=0,flash_alpha=0}
    if page=='cloud' and s.remaining>0 then
        local age=M.strike_duration-s.remaining
        local alpha=age<.08 and 1 or age<.14 and .14 or age<.22 and .85 or .85*s.remaining/.26
        v.bolt_alpha=alpha;v.flash_alpha=alpha
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
