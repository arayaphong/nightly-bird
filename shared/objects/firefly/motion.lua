local M={}
function M.values(t,rainbow)
    local pulse=.6+.4*math.sin(t*5)
    local values={show_firefly=1,wing_left=(1.6+math.sin(t*40))/1.6,wing_right=(1.6-math.sin(t*40))/1.6,
            lamp_mix=.5+.5*math.sin(t*1.8),glow_scale=(16+8*pulse)/24,glow_alpha=.95*pulse}
    values.normal_alpha=rainbow and 0 or 1
    -- Match the legacy hue rate (220 degrees/s). Opacity weights account for
    -- Rive's front-to-back drawing order so lamp and glow blend without dimming.
    local phase=(t*220/60)%6
    local first=math.floor(phase);local mix=phase-first;local remaining=1
    for i=0,5 do
        local weight=rainbow and ((i==first and 1-mix or 0)+(i==(first+1)%6 and mix or 0)) or 0
        values['rainbow_alpha_'..i]=remaining>1e-8 and math.min(1,weight/remaining) or 0
        remaining=math.max(0,remaining-weight)
    end
    return values
end
return M
