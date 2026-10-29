-- The water owns this fixed pool. Units are world x-right/y-down, never fish-local.
local water=require('shared.scenery.water.motion')
local M={CAPACITY=192,INTERVAL=.5,TAIL_COUNT=5,FIN_COUNT=3}
function M.new(random)
    local s={items={},elapsed=0,next=1,random=random or math.random,total=0}
    for i=1,M.CAPACITY do s.items[i]={alive=false} end
    return s
end
function M.clear(s)
    for _,p in ipairs(s.items) do p.alive=false end
    s.elapsed=0;s.previous=nil
end
local function radius(i) return 1.3+((i-1)%5)*.3 end
local function advance(s,dt,w)
    for i,p in ipairs(s.items) do
        if p.alive then
            p.age=p.age+dt
            p.x=p.origin_x+p.drift*p.age+p.wiggle*(math.sin(p.phase+p.age*3)-math.sin(p.phase))
            p.y=p.origin_y-p.speed*p.age
            local distance=p.y-radius(i)-water.surface_y(w,p.x)
            if distance<=0 then p.alive=false else p.alpha=.75*math.min(1,distance/6) end
        end
    end
end
local function burst(s,x,y,count,w,source)
    if y<=water.surface_y(w,x) or y>=720 then return end
    for _=1,count do
        local i=s.next;local p=s.items[i];s.next=i%M.CAPACITY+1
        p.origin_x=x+(s.random()-.5)*3;p.origin_y=y+(s.random()-.5)*2
        -- Keep even the circle's top underwater at its birth.
        p.origin_y=math.max(p.origin_y,water.surface_y(w,p.origin_x)+radius(i)+.1)
        p.x=p.origin_x;p.y=p.origin_y;p.speed=64+s.random()*24
        p.drift=(s.random()-.5)*3;p.wiggle=.6+s.random()*.8;p.phase=s.random()*math.pi*2
        p.age=0;p.alpha=.75;p.alive=true;p.source=source;s.total=s.total+1
    end
end
function M.step(s,dt,w,emitter)
    dt=math.max(0,dt)
    if not emitter or emitter.enabled==false then
        s.elapsed=0;s.previous=nil;advance(s,dt,w);return
    end
    local previous=s.previous or emitter;local left,passed=dt,0
    while left>1e-9 do
        local h=math.min(left,M.INTERVAL-s.elapsed)
        advance(s,h,w);left=left-h;passed=passed+h;s.elapsed=s.elapsed+h
        if s.elapsed>=M.INTERVAL-1e-9 then
            s.elapsed=0;local t=dt>0 and passed/dt or 1
            local function point(key) return previous[key]+(emitter[key]-previous[key])*t end
            burst(s,point('tail_x'),point('tail_y'),M.TAIL_COUNT,w,'tail')
            burst(s,point('fin_x'),point('fin_y'),M.FIN_COUNT,w,'fin')
        end
    end
    s.previous={tail_x=emitter.tail_x,tail_y=emitter.tail_y,fin_x=emitter.fin_x,fin_y=emitter.fin_y}
end
function M.values(s)
    local v={}
    for i,p in ipairs(s.items) do
        local key='bubble_'..(i-1)..'_'
        v[key..'alpha']=p.alive and p.alpha or 0
        -- Hidden slots need no position updates. All three keys are present in
        -- a new pool's schema for one-time write-only subscription removal.
        if p.alive then v[key..'x']=p.x;v[key..'y']=p.y
        elseif not p.x then v[key..'x']=0;v[key..'y']=0 end
    end
    return v
end
return M
