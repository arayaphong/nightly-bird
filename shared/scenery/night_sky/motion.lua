-- Reusable two-layer sky. Angles are elevation from the selected horizontal.
-- Positions use the Rive artboard's x-right/y-down coordinates.
local layout=require('shared.scenery.night_sky.layout')
local M={angles={-80,-40,0,40,80},SPEED=42,STAR_SPEEDS={32,64},DUST_FLASH_PERIOD=6,
    MAX_STARS=#layout.stars,MAX_DUST=#layout.dust}
local function copy(source)
    local out={};for i,p in ipairs(source) do local q={};for k,v in pairs(p) do q[k]=v end;out[i]=q end
    return out
end
function M.new()
    return {time=0,side=-1,step=3,star_speed=M.STAR_SPEEDS[1],vx=-M.SPEED,vy=0,
            width=layout.width,left=0,
            stars=copy(layout.stars),dust=copy(layout.dust),star_count=M.MAX_STARS,dust_count=M.MAX_DUST}
end
function M.set_count(s,kind,count)
    local maximum=kind=='star' and M.MAX_STARS or kind=='dust' and M.MAX_DUST
    if not maximum or type(count)~='number' or count~=count or math.abs(count)==math.huge then return false end
    s[kind..'_count']=math.max(0,math.min(maximum,math.floor(count+.5)));return true
end
function M.set_width(s,width)
    s.width=width;s.left=(layout.width-width)/2
end
function M.select(s,side,step)
    if (side~=-1 and side~=1) or not M.angles[step] then return false end
    s.side,s.step=side,step;return true
end
function M.toggle_star_speed(s)
    s.star_speed=s.star_speed==M.STAR_SPEEDS[1] and M.STAR_SPEEDS[2] or M.STAR_SPEEDS[1]
end
function M.target(s)
    local a=math.rad(M.angles[s.step])
    return s.side*math.cos(a)*M.SPEED,-math.sin(a)*M.SPEED
end
local function wrap(v,size) return (v+layout.margin)%(size+2*layout.margin)-layout.margin end
local function dust_alpha(p,time)
    local wave=.5+.5*math.sin(time*2*math.pi/M.DUST_FLASH_PERIOD+p.phase)
    -- A broad, smooth flare every six seconds, staggered by particle phase.
    return p.alpha*(.2+.8*wave^3)
end
local function advance(s,dt)
    s.time=s.time+dt
    local tx,ty=M.target(s);local blend=1-math.exp(-dt*7)
    s.vx=s.vx+(tx-s.vx)*blend;s.vy=s.vy+(ty-s.vy)*blend
    for i=1,s.star_count do
        local p=s.stars[i]
        p.x=s.left+wrap(p.x-s.left-s.star_speed*dt,s.width)
        p.alpha=.3+.65*(.5+.5*math.sin(s.time*p.rate+p.phase))
    end
    for i=1,s.dust_count do
        local p=s.dust[i]
        local gust=1+.14*math.sin(s.time*.8+p.phase)
        local curl=1.4*math.sin(s.time*1.7+p.phase)
        local speed=math.sqrt(s.vx*s.vx+s.vy*s.vy)
        local dx=s.vx*p.speed*gust-s.vy/M.SPEED*curl
        local dy=s.vy*p.speed*gust+s.vx/M.SPEED*curl
        p.x=s.left+wrap(p.x-s.left+dx*dt,s.width);p.y=wrap(p.y+dy*dt,layout.height)
        if speed>.1 then p.angle=math.atan2(dy,dx) end
        p.opacity=dust_alpha(p,s.time)
    end
end
function M.step(s,dt)
    -- Integrate elapsed time in small steps, including frames longer than 33ms.
    dt=math.max(0,dt)
    while dt>0 do local part=math.min(dt,1/60);advance(s,part);dt=dt-part end
end
function M.values(s)
    local v={}
    for i,p in ipairs(s.stars) do
        v['star_'..(i-1)..'_alpha']=i<=s.star_count and (p.alpha or .6) or 0
        if i<=s.star_count then v['star_'..(i-1)..'_x']=p.x end
    end
    for i,p in ipairs(s.dust) do
        local prefix='dust_'..(i-1)..'_'
        v[prefix..'alpha']=i<=s.dust_count and (p.opacity or dust_alpha(p,s.time)) or 0
        if i<=s.dust_count then
            v[prefix..'x']=p.x;v[prefix..'y']=p.y
            v[prefix..'angle']=p.angle or math.pi
        end
    end
    return v
end
return M
