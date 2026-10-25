local M={}
function M.values(t)
    local pulse=.6+.4*math.sin(t*5)
    return {show_firefly=1,wing_left=(1.6+math.sin(t*40))/1.6,wing_right=(1.6-math.sin(t*40))/1.6,
            lamp_mix=.5+.5*math.sin(t*1.8),glow_scale=(16+8*pulse)/24,glow_alpha=.95*pulse}
end
return M
