package.path='./?.lua;'..package.path
local swim=require('shared.scenery.fish.motion')
local attack=require('shared.scenery.fish.attack')
local water=require('shared.scenery.water.motion')
local mouth=require('shared.scenery.fish.mouth')
local w=water.new();local x=640;local surface=water.surface_y(w,x)
assert(attack.accepts(x,surface-128,w,1280))
assert(not attack.accepts(x,surface-128.001,w,1280))
assert(not attack.accepts(x,surface,w,1280))
assert(not attack.accepts(x,surface+1,w,1280))
assert(not attack.accepts(100,surface-40,w,432))
assert(not attack.accepts(0/0,500,w,1280))
local function prepared(width)
    local s=swim.new(function() return .4 end);swim.step(s,0,w,width)
    for i=1,1200 do if not s.phase then return s end;swim.step(s,1/120,w,width) end
    error('Initial fish did not enter submerged swim bounds')
end
for _,width in ipairs({432,1280,2200}) do
 for _,height in ipairs({1,64,128}) do
  local s=prepared(width)
  local target_x=(1280-width)/2+width*.7
  local target_y=water.surface_y(w,target_x)-height
  assert(swim.place(s,target_x,target_y,w,width))
  local target=s.target;local sounds=0;local launched=false
  for i=1,1200 do
   if swim.step(s,1/120,w,width) then sounds=sounds+1 end
   if s.phase=='leap' and not launched then
    launched=true;local t=s.flight_time
    assert(math.abs(s.launch_x+s.vx*t-target_x)<1e-7)
    assert(math.abs(s.launch_y+s.launch_vy*t+.5*attack.GRAVITY*t*t-target_y)<1e-7)
   end
   for _,v in pairs(swim.values(s)) do assert(v==v and math.abs(v)<math.huge) end
   assert(s.mode=='swim' or s.mode=='attack' or s.mode=='excited')
   if launched and not s.phase then break end
  end
  assert(launched and not s.phase and sounds==1,'Single locked leap/re-entry failed')
  assert(s.y>=s.bounds.top and s.y<=s.bounds.bottom)
  assert(s.target==target and s.target.x==target_x and s.target.y==target_y)
  assert((s.caught==target and s.mode=='excited') or (not s.caught and s.mode=='swim'))
  attack.cancel(s);assert(not s.target and not s.lock and s.mode=='swim' and not s.phase)
 end
end
-- Capture requires swept mouth contact during the leap, not proximity in swim.
assert(mouth.touches(0,0,100,0,50,4,5))
assert(not mouth.touches(0,0,100,0,50,6,5))
assert(mouth.touches(5,5,5,5,5,5,1))
for _,dt in ipairs({1/120,1/20,.25}) do
 for _,target_x in ipairs({470,640,810}) do
  local s=prepared();assert(swim.place(s,target_x,480,w,1280))
  local caught=false
  for i=1,600 do
   swim.step(s,dt,w)
   if s.caught then caught=true;break end
  end
  assert(caught and s.mode=='excited','Leap skipped mouth contact at dt='..dt)
  local caught_target=s.target
  for i=1,400 do swim.step(s,dt,w) end
  assert(s.mode=='excited' and not s.phase and s.caught==caught_target)
  for _,angle in ipairs({0,math.pi/2,math.pi,math.pi*1.5}) do
   s.pose.angle=angle;s.pose.sw=.7
   local x,y,a,b,scale,z=mouth.target(s);local mx,my=mouth.position(s)
   local drop=s.scale*mouth.CARRIED_DROP*b
   assert(math.abs(x-(mx-math.sin(a)*drop))<1e-9)
   assert(math.abs(y-(my+math.cos(a)*drop))<1e-9)
   assert(scale<mouth.BIRD_SCALE*.5 and z==-.2)
   assert(b==(math.cos(a)<0 and -1 or 1))
  end
  -- A new round replaces the caught bird with one full-size stationary prey.
  assert(swim.place(s,650,490,w,1280));assert(not s.caught and s.mode=='attack')
  local x,y,_,_,scale=mouth.target(s);assert(x==650 and y==490 and scale==mouth.BIRD_SCALE)
  attack.cancel(s);assert(not s.caught and not mouth.target(s))
 end
end
local miss=prepared();assert(swim.place(miss,640,500,w,1280))
while miss.phase~='leap' do swim.step(miss,1/120,w) end
miss.target={x=1100,y=480}
for i=1,400 do swim.step(miss,1/120,w) end
assert(not miss.caught and miss.mode=='swim','A missed leap must leave the bird at its original position')
-- A new placement during flight discards the previous trajectory immediately.
local replaced=prepared();assert(swim.place(replaced,640,480,w,1280))
while replaced.phase~='leap' do swim.step(replaced,1/120,w) end
local old=replaced.target;local px,py=replaced.x,replaced.y
assert(swim.place(replaced,650,490,w,1280))
assert(replaced.mode=='attack' and replaced.target~=old and not replaced.caught and not replaced.pending)
assert(replaced.x==px and replaced.y==py and not replaced.launch_x and not replaced.flight_time)
assert(replaced.lock.x==650 and replaced.lock.y==490)
for i=1,1200 do swim.step(replaced,1/120,w);if replaced.caught and not replaced.phase then break end end
assert(replaced.caught==replaced.target and replaced.mode=='excited' and replaced.launch_count==1,
 'New round must launch once without waiting for the previous flight')
-- The height-based world camera must not change attack speed with aspect ratio.
local a,b=prepared(432),prepared(2200)
assert(swim.place(a,700,500,w,432) and swim.place(b,700,500,w,2200))
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
print('PASS fish attack: wave-relative band, locked intercept, immediate replacement, swept capture, mouth transform and smooth re-entry')
