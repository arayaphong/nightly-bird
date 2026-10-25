package.path='./defold/?.lua;'..package.path
local m=require('rive-demo.hawk-motion')
local function near(a,b) assert(math.abs(a-b)<1e-8,a..' != '..b) end
local s=m.new();m.step(s,.25);near(s.flap,1.25)
local phase=s.flap;assert(m.dive(s));near(s.flap,phase)
m.step(s,2.999);assert(s.remaining>0 and m.values(s).dive_visible==1)
assert(not m.dive(s),'Repeated input extended the dive')
m.step(s,.001);assert(s.remaining==0 and m.values(s).flight_visible==1)
near(s.flap,phase+6)
assert(m.dive(s));m.step(s,3.25);near(s.flap,phase+6+6+1.25)
assert(s.remaining==0)
assert(m.dive(s));m.step(s,.1);m.cancel(s);assert(s.remaining==0)
-- Exercise the controller's sound, status and cancellation without a renderer.
local plays=0;local status
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(_,id,data) if id=='hawk_status' then status=data end end},
    sound={stop=function() end,play=function(id) assert(id=='#strike');plays=plays+1 end},
    rive={get_projection_matrix=function() return {m00=2/480,m11=2/800} end,
          get_view_model_instance=function() return nil end},
}, {__index=_G})
setfenv(assert(loadfile('defold/rive-demo/hawk.script')),env)()
local demo={};env.init(demo);demo.width,demo.height=480,800
env.on_message(demo,'dive',{});assert(plays==0)
env.on_message(demo,'active',{active=true});env.on_message(demo,'dive',{})
assert(plays==1 and status.busy and status.seconds==3)
env.on_message(demo,'dive',{});assert(plays==1)
env.update(demo,2);assert(status.busy and status.seconds==1)
env.update(demo,1);assert(not status.busy and status.seconds==0)
env.on_message(demo,'dive',{});assert(plays==2)
env.on_message(demo,'active',{active=false});assert(not status.busy and demo.motion.remaining==0)
env.on_message(demo,'active',{active=true});env.on_message(demo,'dive',{})
env.on_message(demo,'cancel',{});assert(not status.busy and demo.motion.remaining==0)
print('PASS hawk: three seconds, phase continuity, repeat lock, button recovery, one sound and cancellation')
