-- Equipment preview only: independent toggles, without gameplay timers.
local M={keys={'magnet','gun','helmet','suit'}}
function M.new() return {magnet=false,gun=false,helmet=false,suit=false,time=0} end
function M.toggle(s,key)
    for _,valid in ipairs(M.keys) do
        if key==valid then s[key]=not s[key];return s[key] end
    end
    return nil
end
function M.step(s,dt) s.time=(s.time+dt)%(10/7) end
function M.values(s)
    local v={}
    for _,key in ipairs(M.keys) do v['equip_'..key]=s[key] and 1 or 0 end
    v.equip_coat=v.equip_suit;v.equip_hood=v.equip_suit;v.equip_field=v.equip_magnet
    v.crest_visible=1-v.equip_suit
    for i=0,2 do
        -- Same inward movement and phase offsets as items-painter.js.
        local phase=(s.time*.7+i/3)%1
        v['field_scale_'..i]=1-phase
        v['field_alpha_'..i]=.22*phase
    end
    return v
end
return M
