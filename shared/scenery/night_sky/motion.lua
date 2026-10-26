-- Reusable two-layer sky. Angles are elevation from the selected horizontal.
-- Positions use the Rive artboard's x-right/y-down coordinates.
local layout=require('shared.scenery.night_sky.layout')
local M={angles={-80,-40,0,40,80},SPEED=42,STAR_SPEEDS={32,64},DUST_FLASH_PERIOD=6}
local function copy(source)
    local out={};for i,p in ipairs(source) do local q={};for k,v in pairs(p) do q[k]=v end;out[i]=q end
    return out
end
function M.new()
    return {time=0,side=-1,step=3,star_speed=M.STAR_SPEEDS[1],vx=-M.SPEED,vy=0,
            stars=copy(layout.stars),dust=copy(layout.dust)}
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
    for _,p in ipairs(s.stars) do
        p.x=wrap(p.x-s.star_speed*dt,layout.width)
        p.alpha=.3+.65*(.5+.5*math.sin(s.time*p.rate+p.phase))
    end
    for _,p in ipairs(s.dust) do
        local gust=1+.14*math.sin(s.time*.8+p.phase)
        local curl=1.4*math.sin(s.time*1.7+p.phase)
        local speed=math.sqrt(s.vx*s.vx+s.vy*s.vy)
        local dx=s.vx*p.speed*gust-s.vy/M.SPEED*curl
        local dy=s.vy*p.speed*gust+s.vx/M.SPEED*curl
        p.x=wrap(p.x+dx*dt,layout.width);p.y=wrap(p.y+dy*dt,layout.height)
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
        v['star_'..(i-1)..'_x']=p.x;v['star_'..(i-1)..'_alpha']=p.alpha or .6
    end
    for i,p in ipairs(s.dust) do
        local prefix='dust_'..(i-1)..'_'
        v[prefix..'x']=p.x;v[prefix..'y']=p.y
        v[prefix..'angle']=p.angle or math.pi;v[prefix..'alpha']=p.opacity or dust_alpha(p,s.time)
    end
    return v
end
return M
