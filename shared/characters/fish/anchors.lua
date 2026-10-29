-- Attachment points in the original fish SVG, transformed like its Rive rig.
local M={}
function M.emitters(s,pose)
    local c,sn=math.cos(pose.angle),math.sin(pose.angle)
    local function world(x,y)
        local dx=-(x-830)*s.scale;local dy=(y-500)*s.scale*pose.belly
        return s.x+c*dx-sn*dy,s.y+sn*dx+c*dy
    end
    -- Upper tail lobe follows the same animated pivot as the SVG tail parts.
    local tc,ts=math.cos(pose.tail),math.sin(pose.tail)
    local tx,ty=world(1236+257*tc+249*ts,566+257*ts-249*tc)
    local fx,fy=world(886,86) -- fixed dorsal-fin tip, distinct from pectoral fin
    return {tail_x=tx,tail_y=ty,fin_x=fx,fin_y=fy,enabled=s.phase~='leap'}
end
return M
