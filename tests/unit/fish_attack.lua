package.path='./?.lua;'..package.path
local swim=require('shared.scenery.fish.motion')
local attack=require('shared.scenery.fish.attack')
local water=require('shared.scenery.water.motion')
local w=water.new();local x=640;local surface=water.surface_y(w,x)
assert(attack.accepts(x,surface-128,w,1280))
assert(not attack.accepts(x,surface-128.001,w,1280))
assert(not attack.accepts(x,surface,w,1280))
assert(not attack.accepts(x,surface+1,w,1280))
assert(not attack.accepts(100,surface-40,w,432))
assert(not attack.accepts(0/0,500,w,1280))
local function prepared()
    local s=swim.new(function() return .4 end);swim.step(s,0,w);return s
end
for _,width in ipairs({432,1280,2200}) do
 for _,height in ipairs({1,64,128}) do
  local s=prepared();swim.step(s,0,w,width)
  local target_x=(1280-width)/2+width*.7
  local target_y=water.surface_y(w,target_x)-height
  assert(attack.place(s,target_x,target_y,w,width))
  local sounds=0;local launched=false
  for i=1,600 do
   if swim.step(s,1/120,w,width) then sounds=sounds+1 end
   if s.mode=='leap' and not launched then
    launched=true;local t=s.flight_time
    assert(math.abs(s.launch_x+s.vx*t-target_x)<1e-7)
    assert(math.abs(s.launch_y+s.launch_vy*t+.5*attack.GRAVITY*t*t-target_y)<1e-7)
    -- A replacement target cannot steer an already launched projectile.
    local vx,vy,lx,ly=s.vx,s.launch_vy,s.lock.x,s.lock.y
    assert(attack.place(s,640,water.surface_y(w,640)-80,w,width))
    assert(s.vx==vx and s.launch_vy==vy and s.lock.x==lx and s.lock.y==ly)
   end
   for _,v in pairs(swim.values(s)) do assert(v==v and math.abs(v)<math.huge) end
   if launched and s.mode=='swim' then break end
  end
  assert(launched and s.mode=='swim' and sounds==2,'Leap/recovery/queued attack failed')
  assert(s.y>=s.bounds.top and s.y<=s.bounds.bottom)
  -- The corpse stays stationary until the next placement or explicit cancel.
  assert(s.target.x==640 and s.target.y==water.surface_y(w,640)-80)
  attack.cancel(s);assert(not s.target and not s.lock and s.mode=='swim')
 end
end
-- The height-based world camera must not change attack speed with aspect ratio.
local a,b=prepared(),prepared()
assert(attack.place(a,700,500,w,432) and attack.place(b,700,500,w,2200))
for i=1,15 do swim.step(a,1/30,w,432);for j=1,4 do swim.step(b,1/120,w,2200) end end
assert(math.abs(a.x-b.x)<1e-6 and math.abs(a.y-b.y)<1e-6)
-- Real GUI input: one tap places a target; drags/multitouch/hidden fish do not.
local placed={}
local env=setmetatable({hash=function(v) return v end,
 vmath={vector3=function(x,y,z) return {x=x,y=y,z=z} end,vector4=function() return {} end},
 gui={pick_node=function() return false end,screen_to_local=function(_,v) return v end},
 msg={post=function(_,id,m) if id=='place_target' then placed[#placed+1]=m end end},
 rive={get_projection_matrix=function() return {m00=2/480,m11=2/800} end},
},{__index=_G})
setfenv(assert(loadfile('studio/scenery/night_sky/controls.gui_script')),env)()
local function controller()
 return {active=true,page='fish_test',contacts={},gestures={},sliders={},water_visible=true,fish_visible=true}
end
local function touch(c,points) env.on_input(c,'touch',{touch=points}) end
local function point(id,x,y,pressed,released) return {id=id,x=x,y=y,pressed=pressed,released=released} end
local c=controller();touch(c,{point(1,240,245,true)});touch(c,{point(1,240,245,false,true)})
assert(#placed==1 and math.abs(placed[1].x-640)<1e-7 and math.abs(placed[1].y-499.5)<1e-7)
c=controller();touch(c,{point(1,220,245,true),point(2,260,245,true)})
touch(c,{point(1,220,245,false,true),point(2,260,245,false,true)});assert(#placed==1)
c=controller();touch(c,{point(1,220,245,true)});touch(c,{point(1,280,245,false,true)});assert(#placed==1)
c=controller();c.fish_visible=false;touch(c,{point(1,240,245,true)});touch(c,{point(1,240,245,false,true)});assert(#placed==1)
print('PASS fish attack: wave-relative 128-unit band, fixed-world speeds, locked ballistic intercept, queued taps, landing and recovery')
