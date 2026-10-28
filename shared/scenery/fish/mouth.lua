-- Same mouth offset as legacy Shark.capture; angle includes the Rive swim bob.
local M={BIRD_SCALE=.12,CARRIED_RATIO=.96,CARRIED_DROP=140}
function M.position(s)
    local angle=s.pose.angle+math.sin(s.pose.sw)*.035
    local reach=s.scale*1336/2.1*.95
    return s.x+math.cos(angle)*reach,s.y+math.sin(angle)*reach,angle
end
function M.touches(x1,y1,x2,y2,x,y,radius)
    local dx,dy=x2-x1,y2-y1;local length=dx*dx+dy*dy
    local t=length>0 and math.max(0,math.min(1,((x-x1)*dx+(y-y1)*dy)/length)) or 0
    return (x1+dx*t-x)^2+(y1+dy*t-y)^2<=radius*radius
end
function M.target(s)
    if not s.target then return nil end
    if s.caught~=s.target then return s.target.x,s.target.y,0,1,M.BIRD_SCALE,-.2 end
    local x,y,angle=M.position(s)
    -- Follow the exact heading/belly used by the fish, including during turns.
    local belly=math.cos(angle)<0 and -1 or 1
    -- The legacy contact point lies at the upper jaw. Seat the held bird
    -- lower in the mouth's local frame (7 world units at normal fish size).
    local drop=s.scale*M.CARRIED_DROP*belly
    x=x-math.sin(angle)*drop;y=y+math.cos(angle)*drop
    -- Draw the complete bird in front; the opaque fish body must not hide
    -- its wings, tail or feet and make the catch look cropped.
    return x,y,angle,belly,s.scale*M.CARRIED_RATIO,-.2
end
return M
