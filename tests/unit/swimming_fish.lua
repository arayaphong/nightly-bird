package.path='./?.lua;'..package.path
local m=require('shared.scenery.fish.motion')
local water=require('shared.scenery.water.motion')
local function rng(seed)
    return function() seed=(seed*16807)%2147483647;return (seed-1)/2147483646 end
end
local w=water.new();local s=m.new(rng(173))
-- Initial/body-bound re-entry is continuous; steady swimming begins once inside.
m.step(s,0,w)
for i=1,1200 do if not s.phase then break end;m.step(s,1/120,w) end
assert(not s.phase)
local up,down,left,right=false,false,false,false
for i=1,36000 do
    local x,y=s.x,s.y;m.step(s,1/60,w)
    local b=s.bounds;assert(s.visible and b)
    assert(s.x>=b.left-1e-7 and s.x<=b.right+1e-7 and s.y>=b.top-1e-7 and s.y<=b.bottom+1e-7)
    assert(s.y-b.ry>water.base_y(w)+water.amplitude(w),'Fish escaped above the wave envelope')
    up=up or s.y<y-.001;down=down or s.y>y+.001
    left=left or s.x<x-.001;right=right or s.x>x+.001
    for _,v in pairs(m.values(s)) do assert(v==v and math.abs(v)<math.huge) end
end
assert(up and down and left and right,'Random swimmer did not cover all four directions')
-- Wave profile/default changes must not change the meaning of 25% Legacy.
water.set_roughness(w,.25);assert(math.abs(water.amplitude(w)-3.7)<1e-7)
for _,roughness in ipairs({0,.25,.6,1}) do
 for _,level in ipairs({0,.01,.04,.2,.8,1}) do
  w.roughness=roughness;w.level=level
  for _,aspect in ipairs({1280,1920,2560,960}) do
   local before_x,before_y=s.x,s.y
   m.step(s,0,w,aspect)
   assert(s.x==before_x and s.y==before_y,'Changing bounds must not teleport the swimmer')
   if s.visible then
    for i=1,2400 do
     if not s.phase then break end
     local x,y=s.x,s.y;m.step(s,1/120,w,aspect)
     assert(math.sqrt((s.x-x)^2+(s.y-y)^2)<=1.000001,'Normal re-entry exceeded 120 units/s')
    end
    assert(not s.phase,'Swimmer did not return to changed submerged bounds')
    local b=s.bounds
    assert(s.scale>0 and s.scale<=m.BASE_SCALE)
    assert(s.x>=b.left and s.x<=b.right and s.y>=b.top and s.y<=b.bottom)
    assert(s.y-b.ry>=water.base_y(w)+water.amplitude(w)+5.99999)
    assert(s.y+b.ry<720)
   else assert(level<=.04) end
  end
 end
end
-- Large frame steps consume all segments and keep the same random trajectory.
local a,b=m.new(rng(19)),m.new(rng(19));w=water.new()
m.step(a,20,w);for i=1,1200 do m.step(b,1/60,w) end
assert(math.abs(a.x-b.x)<1e-6 and math.abs(a.y-b.y)<1e-6)
local x,y,time=b.x,b.y,b.pose.time;m.step(b,-1,w)
assert(b.x==x and b.y==y and b.pose.time==time)
-- Actor must gate stale frames, keep uniform scale and hide when leaving.
local enabled,position,scale,channels=nil,nil,nil,{}
local targets,sounds,transforms={},{},{}
local quaternion={}
quaternion.__mul=function(a,b)
 return setmetatable({x=a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
  y=a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
  z=a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
  w=a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z},quaternion)
end
local function rotation(axis,angle)
 local q=setmetatable({x=0,y=0,z=0,w=math.cos(angle/2)},quaternion)
 q[axis]=math.sin(angle/2);return q
end
local function rotate(q,x,y)
 local p=setmetatable({x=x,y=y,z=0,w=0},quaternion)
 local inverse=setmetatable({x=-q.x,y=-q.y,z=-q.z,w=q.w},quaternion)
 return q*p*inverse
end
local fish_updates=0
local env=setmetatable({hash=function(v) return v end,
 msg={post=function(url,id) if url=='#fish' then enabled=id else targets[url]=id end end},
 go={set_position=function(v,url) if not url then position=v;fish_updates=fish_updates+1 else transforms.position=v end end,
 set_scale=function(v,url)
  assert(v.x>0 and v.y>0 and v.z>0,'Defold rejects zero or negative GO scale')
  if not url then scale=v else transforms.scale=v end
 end,
 set_rotation=function(v,url) assert(url=='/fish_target');transforms.rotation=v end},
 sound={stop=function() end,play=function(id) sounds[#sounds+1]=id end},
 vmath={vector3=function(x,y,z) return {x=x,y=y,z=z} end,
  quat_rotation_z=function(a) return rotation('z',a) end,
  quat_rotation_x=function(a) return rotation('x',a) end},
 rive={get_view_model_instance=function() return 1 end,cmd={getViewModelInstanceNumber=function() return 0 end,
 unsubscribeToViewModelProperty=function() end,setViewModelInstanceNumber=function(_,k,v) channels[k]=v end}},
},{__index=_G})
setfenv(assert(loadfile('studio/scenery/fish/actor.script')),env)()
local actor={};env.init(actor);env.update(actor);assert(enabled=='disable' and channels.eye_dead==1 and channels.eye_normal==0)
local frame={dt=.1,width=2560,height=1080,level=.2,roughness=.6}
env.on_message(actor,'water_frame',frame);assert(not position)
env.on_message(actor,'active',{active=true});env.on_message(actor,'water_frame',frame)
assert(enabled=='enable' and position.z==-.1 and scale.x==scale.y and channels.tail)
local t=actor.motion.pose.time
env.on_message(actor,'active',{active=false});assert(enabled=='disable')
env.on_message(actor,'water_frame',frame);assert(actor.motion.pose.time==t)
env.on_message(actor,'active',{active=true});frame.level=0;env.on_message(actor,'water_frame',frame);assert(not actor.visible)
frame.level=.2;env.on_message(actor,'water_frame',frame);assert(enabled=='enable')
env.on_message(actor,'place_target',{x=640,y=500});assert(actor.motion.target and targets['/fish_target#bird']=='enable')
local waiting_scale=transforms.scale.x
for i=1,240 do frame.dt=1/120;env.on_message(actor,'water_frame',frame) end
assert(#sounds==1 and sounds[1]=='#strike' and actor.motion.mode=='excited' and not actor.motion.phase)
assert(actor.motion.caught==actor.motion.target and transforms.scale.x<waiting_scale*.5)
assert(transforms.position.z==-.2,'Complete captured bird must draw in front of the opaque fish')
local mouth=require('shared.scenery.fish.mouth')
local x,y,angle,belly=mouth.target(actor.motion);local k=transforms.scale.x
local anchor_x=transforms.position.x+(20*math.cos(angle)-78*belly*math.sin(angle))*k
local anchor_y=transforms.position.y-(20*math.sin(angle)+78*belly*math.cos(angle))*k
assert(math.abs(anchor_x-((x-640)*1.5+1280))<1e-7)
assert(math.abs(anchor_y-(720-y)*1.5)<1e-7)
-- Check the actual reflected basis and anchor, not only the chosen angle.
local function check_rotation(angle,belly)
 for _,p in ipairs({{1,0},{0,1},{20,-78}}) do
  local v=rotate(transforms.rotation,p[1],p[2])
  assert(math.abs(v.x-(p[1]*math.cos(angle)+p[2]*belly*math.sin(angle)))<1e-7)
  assert(math.abs(v.y-(-p[1]*math.sin(angle)+p[2]*belly*math.cos(angle)))<1e-7)
  assert(math.abs(v.z)<1e-7)
 end
end
check_rotation(angle,belly)
-- Every frame must finish updating the fish while its prey faces either way.
local headings={}
for i=1,2400 do
 local updates=fish_updates
 local before_x,before_y=actor.motion.x,actor.motion.y
 env.on_message(actor,'water_frame',frame)
 assert(fish_updates==updates+1,'Held prey aborted the fish transform update')
 local _,_,a,b=mouth.target(actor.motion);headings[b]=true;check_rotation(a,b)
 assert(transforms.scale.x==transforms.scale.y)
 assert(math.abs(position.x-((actor.motion.x-640)*1.5+1280))<1e-7)
 assert(math.abs(position.y-(720-actor.motion.y)*1.5)<1e-7)
 assert(math.sqrt((actor.motion.x-before_x)^2+(actor.motion.y-before_y)^2)<=6.000001)
end
assert(headings[-1] and headings[1],'Held prey must cover both swimming directions')
-- Invalid placement immediately removes a bird from the mouth and resets.
env.on_message(actor,'place_target',{x=640,y=700})
assert(actor.motion.mode=='swim' and not actor.motion.caught and not actor.motion.target)
assert(targets['/fish_target#bird']=='disable')
-- The next valid placement restores full-size stationary art and fresh attack.
env.on_message(actor,'place_target',{x=640,y=500})
assert(actor.motion.mode=='swim' and not actor.motion.lock and not actor.motion.caught and actor.motion.target)
frame.dt=0;env.on_message(actor,'water_frame',frame);frame.dt=1/120
assert(actor.motion.mode=='attack' and actor.motion.lock)
assert(targets['/fish_target#bird']=='enable' and transforms.scale.x==waiting_scale)
check_rotation(0,1);assert(transforms.position.z==-.2)
-- Real actor placement must remove the prey without aborting its committed leap.
local lock=actor.motion.lock;local phase=actor.motion.phase;local before=#sounds
env.on_message(actor,'place_target',{x=640,y=700})
assert(actor.motion.mode=='attack' and actor.motion.lock==lock and actor.motion.phase==phase)
assert(not actor.motion.target and targets['/fish_target#bird']=='disable')
for i=1,1200 do
 env.on_message(actor,'water_frame',frame)
 if actor.motion.mode~='attack' then break end
end
assert(actor.motion.mode=='swim' and not actor.motion.phase and #sounds==before+1)
env.on_message(actor,'place_target',{x=640,y=500})
frame.visible=false;env.on_message(actor,'water_frame',frame)
assert(not actor.motion.target and not actor.motion.caught and targets['/fish_target#bird']=='disable')
print('PASS swimming fish: four random directions, continuous segments, wave/viewport bounds, shallow water and lifecycle')
