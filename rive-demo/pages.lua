local M={order={'bird','fish','hawk','firefly','balloon','cloud'}}
function M.index(name)
    for i,page in ipairs(M.order) do if name==page then return i end end
end
function M.valid(name) return name=='home' or M.index(name)~=nil end
function M.neighbor(name,direction)
    local i=M.index(name)
    return i and M.order[i+direction] or nil
end
return M
