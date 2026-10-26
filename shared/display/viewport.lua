-- World units stay constant. The camera fixes vertical coverage at 720 units.
local M={WIDTH=1280,HEIGHT=720}
function M.camera(width,height)
    local scale=height/M.HEIGHT
    local world_width=width/scale
    return {scale=scale,width=world_width,left=(M.WIDTH-world_width)/2,right=(M.WIDTH+world_width)/2}
end
function M.fit(width,height) return math.min(width/M.WIDTH,height/M.HEIGHT) end
function M.moon_x(width) return (M.WIDTH+width)/2-80 end
return M
