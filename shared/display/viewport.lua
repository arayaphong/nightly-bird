-- World units stay constant. The camera fixes vertical coverage at 720 units.
local M={WIDTH=1280,HEIGHT=720,UI_WIDTH=480,UI_HEIGHT=800,mode='portrait',revision=0}
function M.select(mode)
    if (mode~='portrait' and mode~='landscape') or mode==M.mode then return false end
    M.mode=mode;M.UI_WIDTH=mode=='landscape' and 1280 or 480;M.UI_HEIGHT=mode=='landscape' and 720 or 800
    M.revision=M.revision+1;return true
end
function M.is_landscape() return M.mode=='landscape' end
function M.apply_gui()
    -- Defold 1.14 dispatches layout_changed synchronously and clears the caller's
    -- GUI context. Apply last in a separate message, after node construction.
    msg.post('.', 'apply_display_profile')
end
function M.camera(width,height)
    local scale=height/M.HEIGHT
    local world_width=width/scale
    return {scale=scale,width=world_width,left=(M.WIDTH-world_width)/2,right=(M.WIDTH+world_width)/2}
end
function M.fit(width,height) return math.min(width/M.UI_WIDTH,height/M.UI_HEIGHT) end
function M.moon_x(width) return (M.WIDTH+width)/2-80 end
return M
