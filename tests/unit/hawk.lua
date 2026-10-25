package.path='./?.lua;'..package.path
local m=require('shared.characters.hawk.motion')
local function near(a,b) assert(math.abs(a-b)<1e-8,a..' != '..b) end
local s=m.new();m.step(s,.25);near(s.flap,1.25)
assert(s.direction==1)
local before_time,before_flap=s.time,s.flap
m.turn(s);assert(s.direction==-1 and s.time==before_time and s.flap==before_flap)
m.turn(s);assert(s.direction==1)
local phase=s.flap;assert(m.dive(s));near(s.flap,phase)
m.step(s,2.999);assert(s.remaining>0 and m.values(s).dive_visible==1)
assert(not m.dive(s),'Repeated input extended the dive')
m.step(s,.001);assert(s.remaining==0 and m.values(s).flight_visible==1)
near(s.flap,phase+6)
assert(m.dive(s));m.step(s,3.25);near(s.flap,phase+6+6+1.25)
assert(s.remaining==0)
assert(m.dive(s));m.step(s,.1);m.cancel(s);assert(s.remaining==0)
assert(m.dive(s));m.step(s,.75)
local remaining,flap,time=s.remaining,s.flap,s.time
m.turn(s);assert(s.direction==-1 and s.remaining==remaining and s.flap==flap and s.time==time)
m.step(s,remaining);assert(s.remaining==0 and s.direction==-1)
-- Exercise controller audio/status and presentation mirroring without a GPU.
local plays=0;local status;local scale;local width,height=480,800;local numbers={}
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(_,id,data) if id=='hawk_status' then status=data end end},
    sound={stop=function() end,play=function(id) assert(id=='#strike');plays=plays+1 end},
    go={set_scale=function(v) scale=v end,set_position=function() end},
    vmath={vector3=function(x,y,z) return {x=x,y=y,z=z} end},
    rive={get_projection_matrix=function() return {m00=2/width,m11=2/height} end,
          get_view_model_instance=function() return 'vm' end,
          cmd={setViewModelInstanceNumber=function(_,name,value) numbers[name]=value end}},
}, {__index=_G})
setfenv(assert(loadfile('studio/characters/hawk/preview.script')),env)()
local demo={};env.init(demo);demo.width,demo.height=480,800
env.on_message(demo,'dive',{});assert(plays==0)
env.on_message(demo,'turn',{});assert(demo.motion.direction==1)
env.on_message(demo,'active',{active=true});env.on_message(demo,'dive',{})
assert(plays==1 and status.busy and status.seconds==3)
local phase_before=demo.motion.flap
env.on_message(demo,'turn',{})
assert(status.direction==-1 and status.busy and status.seconds==3 and plays==1)
assert(demo.motion.flap==phase_before and demo.motion.remaining==3)
env.update(demo,0);assert(numbers.facing==-1)
width,height=960,1600;env.update(demo,0);near(scale.x,.36);near(scale.y,.36);assert(numbers.facing==-1)
env.on_message(demo,'dive',{});assert(plays==1)
env.update(demo,2);assert(status.busy and status.seconds==1)
env.update(demo,1);assert(not status.busy and status.seconds==0 and demo.motion.direction==-1)
env.on_message(demo,'dive',{});assert(plays==2)
env.on_message(demo,'active',{active=false});assert(not status.busy and demo.motion.remaining==0 and demo.motion.direction==-1)
env.on_message(demo,'active',{active=true});env.on_message(demo,'dive',{})
env.on_message(demo,'cancel',{});assert(not status.busy and demo.motion.remaining==0)
env.on_message(demo,'turn',{});env.update(demo,0)
assert(status.direction==1 and plays==3 and numbers.facing==1);near(scale.x,.36);near(scale.y,.36)
print('PASS hawk: turn in flight/dive, phase/timer continuity, mirroring/resize, recovery, one sound and cancellation')
