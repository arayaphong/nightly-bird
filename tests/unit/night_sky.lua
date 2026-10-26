package.path='./?.lua;'..package.path
local m=require('shared.scenery.night_sky.motion')
local layout=require('shared.scenery.night_sky.layout')
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local s=m.new();assert(s.side==-1 and s.step==3)
assert(s.star_speed==32)
-- Every star travels the exact same distance, including wrapping/slow frames.
-- Changing only the star speed must leave the dust motion and twinkle intact.
local slow,fast=m.new(),m.new();m.toggle_star_speed(fast);assert(fast.star_speed==64)
local function wrapped(v) return (v+14)%508-14 end
for i=1,120 do
    local dt=({.013,.025,.15})[(i-1)%3+1]
    m.step(slow,dt);m.step(fast,dt)
    for j,p in ipairs(layout.stars) do
        near(slow.stars[j].x,wrapped(p.x-32*slow.time))
        near(fast.stars[j].x,wrapped(p.x-64*fast.time))
        near(slow.stars[j].alpha,fast.stars[j].alpha)
        assert(p.speed==nil,'Per-star speeds must not return')
    end
    for j,p in ipairs(slow.dust) do near(p.x,fast.dust[j].x);near(p.y,fast.dust[j].y) end
end
local px,phase,time=fast.stars[1].x,fast.stars[1].alpha,fast.time
m.toggle_star_speed(fast);assert(fast.star_speed==32)
near(fast.stars[1].x,px);near(fast.stars[1].alpha,phase);near(fast.time,time)
local x,y=m.target(s);near(x,-42);near(y,0)
assert(#s.stars==72 and #s.dust==26)
for _,p in ipairs(s.dust) do assert(p.radius<1 and p.tail<=10) end
local source_x=layout.dust[1].x
m.step(s,.01);assert(s.dust[1].x<source_x);near(layout.dust[1].x,source_x)
for _,side in ipairs({-1,1}) do
    for step,angle in ipairs(m.angles) do
        local state=m.new();local px,py=state.dust[1].x,state.dust[1].y
        assert(m.select(state,side,step));near(state.dust[1].x,px);near(state.dust[1].y,py)
        local tx,ty=m.target(state)
        assert(tx*side>0);near(tx,side*math.cos(math.rad(angle))*42);near(ty,-math.sin(math.rad(angle))*42)
        m.step(state,2)
        assert(state.vx*side>0 and math.abs(state.vx-tx)<.001 and math.abs(state.vy-ty)<.001)
        local before_x,before_y=state.dust[1].x,state.dust[1].y
        m.step(state,.001)
        assert((state.dust[1].x-before_x)*side>0)
        if angle~=0 then assert((state.dust[1].y-before_y)*angle<0) end
        near(state.time,2.001)
    end
end
assert(not m.select(s,0,3) and not m.select(s,1,6) and not m.select(s,-1,1.5))
local a,b=m.new(),m.new();m.select(b,1,5)
for i=1,600 do
    local dt=({.013,.025,.15})[(i-1)%3+1]
    m.step(a,dt);m.step(b,dt)
end
for i,p in ipairs(a.stars) do
    near(p.x,b.stars[i].x);near(p.y,b.stars[i].y);near(p.alpha,b.stars[i].alpha)
    assert(p.alpha>=.3 and p.alpha<=.95 and p.x>=-14 and p.x<494)
end
for _,state in ipairs({a,b}) do
    for _,p in ipairs(state.dust) do
        assert(p.x>=-14 and p.x<494 and p.y>=-14 and p.y<814)
        assert(p.opacity>=0 and p.opacity<=1 and p.angle==p.angle)
    end
    for _,v in pairs(m.values(state)) do assert(v==v and math.abs(v)<math.huge) end
end
local before=a.time;m.step(a,-1);near(a.time,before)
-- Controller activation must not advance hidden previews or replace their state.
local channels,enabled,status={},nil,nil
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(url,id,data) if url=='#sky' then enabled=id else status=data end end},
    rive={get_projection_matrix=function() return {m00=2/480,m11=2/800} end,
        get_view_model_instance=function() return 1 end,
        cmd={setViewModelInstanceNumber=function(_,key,value) channels[key]=value end}},
    go={set_position=function() end,set_scale=function() end},
    vmath={vector3=function(...) return {...} end}}, {__index=_G})
setfenv(assert(loadfile('studio/scenery/night_sky/preview.script')),env)()
local preview={};env.init(preview);assert(enabled=='disable')
env.update(preview,1);near(preview.motion.time,0);assert(next(channels)==nil)
env.on_message(preview,'active',{active=true});assert(enabled=='enable' and status.side==-1 and status.step==3)
assert(status.star_speed==32)
env.on_message(preview,'toggle_star_speed',{});assert(status.star_speed==64)
env.update(preview,.1);assert(channels.star_0_x and channels.dust_0_angle)
env.on_message(preview,'wind',{side=1,step=5});assert(status.side==1 and status.step==5)
local time=preview.motion.time
env.on_message(preview,'active',{active=false});env.update(preview,3);near(preview.motion.time,time)
env.on_message(preview,'toggle_star_speed',{});assert(preview.motion.star_speed==64)
env.on_message(preview,'wind',{side=-1,step=1});assert(preview.motion.side==1)
env.on_message(preview,'active',{active=true});assert(status.side==1 and status.step==5)
assert(status.star_speed==64)
print('PASS night sky: fixed 32/64 star speed, continuity, independent dust/twinkle, 10 winds, wrapping and lifecycle')
