local rig=require('rive-demo.nature-rig')
local M={}
function M.new() return {time=0} end
function M.step(s,dt) s.time=s.time+math.max(0,dt) end
function M.values(s,page)
    local t=s.time;local pulse=.6+.4*math.sin(t*5)
    local v={show_firefly=page=='firefly' and 1 or 0,show_balloon=page=='balloon' and 1 or 0,
        show_cloud=page=='cloud' and 1 or 0,wing_left=(1.6+math.sin(t*40))/1.6,
        wing_right=(1.6-math.sin(t*40))/1.6,lamp_mix=.5+.5*math.sin(t*1.8),
        glow_scale=(16+8*pulse)/24,glow_alpha=.95*pulse,
        balloon_y=300+math.sin(t*1.2)*5,balloon_rotation=math.sin(t*2)*.035}
    for i,p in ipairs(rig.puffs) do v['puff_y_'..(i-1)]=p.y+math.sin(t*1.5+p.x)*1.5 end
    for i,d in ipairs(rig.drops) do
        local age=(t+d.phase*.7)%.7
        v['rain_x_'..(i-1)]=d.x-40*age
        v['rain_y_'..(i-1)]=18+180*age
        v['rain_alpha_'..(i-1)]=math.min(1,age/.06)*math.min(1,(.7-age)/.12)
    end
    return v
end
return M
