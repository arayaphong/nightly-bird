package.path='./?.lua;'..package.path
local swim=require('shared.scenery.fish.motion')
local attack=require('shared.scenery.fish.attack')
local water=require('shared.scenery.water.motion')
local mouth=require('shared.scenery.fish.mouth')
local function place(s,x,y,w,width)
 local valid=swim.place(s,x,y,w,width)
 swim.step(s,0,w,width)
 return valid
end

local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local w=water.new()
local function prepared(width)
 local s=swim.new(function() return .4 end);swim.step(s,0,w,width)
 for i=1,1200 do if not s.phase then return s end;swim.step(s,1/120,w,width) end
 error('Failed to enter water')
end
local function phase(s,wanted,width)
 for i=1,2400 do
  if s.phase==wanted then return end
  swim.step(s,1/120,w,width)
 end
 error('Never reached '..wanted)
end
local function finish(s,width,dt)
 dt=dt or 1/120;local launches=0;local original=s.lock
 for i=1,math.ceil(15/dt) do
  if s.mode~='attack' or s.lock~=original then return launches end
  local lock=s.lock;assert(lock,'Attack lost its locked location')
  if swim.step(s,dt,w,width) then
   launches=launches+1
   assert(math.abs(s.launch_x-lock.x)<=attack.LAUNCH_RANGE+1e-7,'Distant launch')
  end
  if s.phase then assert(s.mode=='attack','Excitement began before landing') end
 end
 error('Committed attack did not finish')
end

-- Removing prey in any attack phase preserves the trajectory and locked point.
for _,width in ipairs({432,1280,2200}) do
 for _,wanted in ipairs({'charge','leap','return'}) do
  local a,b=prepared(width),prepared(width)
  local x=640+width*.35;local y=water.surface_y(w,x)-80
  assert(place(a,x,y,w,width) and place(b,x,y,w,width))
  phase(a,wanted,width);phase(b,wanted,width)
  local lock=a.lock;local vx,vy=a.vx,a.vy;local t=a.flight_elapsed
  assert(not place(a,x,720,w,width))
  assert(a.lock==lock and a.phase==wanted and a.mode=='attack')
  near(a.x,b.x);near(a.y,b.y);near(a.vx,vx);near(a.vy,vy)
  assert(a.flight_elapsed==t and not a.target and not a.caught and not mouth.target(a))
  for i=1,2400 do
   if a.mode~='attack' then break end
   swim.step(a,1/120,w,width);swim.step(b,1/120,w,width)
   near(a.x,b.x);near(a.y,b.y)
  end
  assert(a.mode=='swim' and not a.phase and not a.lock and not a.caught)
  assert(b.mode=='excited' and b.caught==b.target)
 end
end

-- The current prey's distance from the immutable lock decides the one bite.
for _,dt in ipairs({1/120,1/20,.125}) do
 for _,offset in ipairs({{0,0,true},{attack.HIT_RADIUS-1,0,true},
                         {attack.HIT_RADIUS+1,0,false},
                         {attack.HIT_RADIUS*.8,attack.HIT_RADIUS*.8,false}}) do
  local s=prepared(1280);assert(place(s,720,480,w,1280))
  phase(s,'leap',1280);assert(not s.bite_done)
  local lock=s.lock;local launch_x,launch_y=s.launch_x,s.launch_y
  assert(place(s,lock.x+offset[1],lock.y+offset[2],w,1280))
  local current=s.target
  assert(s.lock==lock and s.launch_x==launch_x and s.launch_y==launch_y and s.phase=='leap')
  for i=1,math.ceil(3/dt) do
   swim.step(s,dt,w,1280)
   if s.bite_done then break end
  end
  assert(s.bite_done and (s.caught==current)==offset[3],'Wrong lock-radius hit result')
  assert(s.mode=='attack' and s.phase,'Bite ended attack before water return')
  finish(s,1280,dt)
  if offset[3] then assert(s.mode=='excited' and not s.lock)
  else
   assert(s.mode=='attack' and s.lock~=lock and not s.caught)
   near(s.lock.x,current.x);near(s.lock.y,current.y)
   finish(s,1280,dt);assert(s.mode=='excited' and s.caught==current)
  end
  assert(s.target==current,'Miss deleted the remaining prey')
 end
end

-- A miss cannot grab a bird that appears after the single bite has passed.
local s=prepared(1280);assert(place(s,640,480,w,1280))
phase(s,'leap',1280);assert(not place(s,640,720,w,1280))
while not s.bite_done do swim.step(s,1/120,w,1280) end
assert(not s.caught and place(s,640,480,w,1280))
local missed_lock=s.lock
finish(s,1280);assert(s.mode=='attack' and s.lock~=missed_lock and not s.caught)
finish(s,1280);assert(s.mode=='excited' and s.caught==s.target)

-- Distant targets require a real surface approach even after the old timeout.
for _,side in ipairs({-1,1}) do
 local s=prepared(2200);s.x=side==-1 and s.bounds.right-10 or s.bounds.left+10
 local x=640+side*2200*.45;local y=water.surface_y(w,x)-80
 assert(place(s,x,y,w,2200));local start=s.x
 for i=1,144 do assert(not swim.step(s,1/120,w,2200)) end
 assert(s.mode=='attack' and s.phase=='charge' and math.abs(s.x-x)>attack.LAUNCH_RANGE)
 assert(math.abs(s.x-start)>100,'Fish did not swim toward distant target')
 local lock=s.lock;assert(not place(s,640,720,w,2200));assert(s.lock==lock)
 assert(finish(s,2200)==1 and s.mode=='swim','Removed prey canceled the far approach')
end

-- A new round is allowed only after the current committed attack lands.
local s=prepared(1280);assert(place(s,640,480,w,1280));finish(s,1280)
local held=s.caught;assert(held and s.mode=='excited')
assert(place(s,650,490,w,1280));assert(s.mode=='attack' and not s.caught and s.target~=held)
attack.cancel(s);assert(s.mode=='swim' and not s.target and not s.lock and not s.phase)

-- Edge landings remain continuous at narrow and wide viewport widths.
for _,width in ipairs({432,1280,2200}) do
 for _,fraction in ipairs({.02,.98}) do
  local s=prepared(width);local x=(1280-width)/2+width*fraction
  assert(place(s,x,water.surface_y(w,x)-100,w,width))
  for i=1,2400 do
   local x,y,p=s.x,s.y,s.phase;swim.step(s,1/120,w,width)
   local distance=math.sqrt((s.x-x)^2+(s.y-y)^2)
   assert(distance<60,'Fish teleported')
   if p=='return' and s.phase=='return' then assert(distance<=360/120+1e-6) end
  end
  assert(s.mode=='excited' and not s.phase and s.caught)
 end
end
-- Prey can appear independently of placement; patrol itself owns acquisition.
for _,width in ipairs({432,1280,2200}) do
 local s=prepared(width);local prey={x=650,y=480};s.target=prey
 assert(s.mode=='swim' and not s.lock)
 swim.step(s,0,w,width)
 assert(s.mode=='attack' and s.lock and s.target==prey and s.lock~=prey)
 near(s.lock.x,650);near(s.lock.y,480)
 local lock=s.lock;prey.x=700;swim.step(s,1/120,w,width)
 assert(s.lock==lock and lock.x==650,'Active attack followed a moving prey')
end
-- Creating and removing prey before an AI update must never open a lock.
local s=prepared(1280)
assert(swim.place(s,640,480,w,1280));assert(s.mode=='swim' and not s.lock)
assert(not swim.place(s,640,720,w,1280));swim.step(s,0,w,1280)
assert(s.mode=='swim' and not s.lock and not s.target)
assert(swim.place(s,640,480,w,1280));s.target.x=700
swim.step(s,0,w,1280);assert(s.lock.x==700,'AI locked the stale placement position')
print('PASS fish states: immutable lock, uninterrupted approach/leap/return, one radial bite, autonomous patrol reacquisition, landing-only modes and bounded launch range')
