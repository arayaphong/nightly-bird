local M={order={'bird','fish','hawk','firefly','balloon','cloud'}}
local parents={studio='home',scenarios='home',characters='studio',scenery='studio',rules_and_items='studio'}
for _,name in ipairs(M.order) do parents[name]='characters' end
function M.index(name)
    for i,page in ipairs(M.order) do if name==page then return i end end
end
function M.valid(name) return name=='home' or parents[name]~=nil end
function M.parent(name) return parents[name] end
function M.neighbor(name,direction)
    local i=M.index(name)
    return i and M.order[i+direction] or nil
end
return M
