local M={}
function M.values(t)
    return {show_balloon=1,balloon_y=300+math.sin(t*1.2)*5,balloon_rotation=math.sin(t*2)*.035}
end
return M
