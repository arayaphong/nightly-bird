package.path='./?.lua;'..package.path
local swim=require('shared.scenery.fish.motion')
local attack=require('shared.scenery.fish.attack')
local water=require('shared.scenery.water.motion')
local mouth=require('shared.scenery.fish.mouth')
local MODES={swim=true,attack=true,excited=true}
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local function zero(value) return value==nil or value==0 end
local function prepared(w,width)
 local s=swim.new(function() return .4 end)
 swim.step(s,0,w,width)
 return s
end
local function contaminate(s,mode,phase)
 s.mode=mode;s.phase=phase
 s.target={x=640,y=480};s.caught=mode=='excited' and s.target or nil
 s.lock={x=641,y=481};s.pending=true;s.rest=.55;s.charge_time=.8
 s.flight_elapsed=.25;s.flight_time=.4;s.launch_x=123;s.launch_y=456;s.launch_vy=-789
 s.vx=987;s.vy=654;s.excited=true;s.excited_side=1
 s.duration=12;s.elapsed=8
end
local function reset_motion(s,x,y,angle,beat,time)
 near(s.x,x);near(s.y,y)
 near(s.pose.angle,angle);near(s.pose.sw,beat);near(s.pose.time,time)
 assert(not s.pending and not s.caught,'Previous prey/catch was retained')
 assert(zero(s.vx) and zero(s.vy),'Velocity from the old attack survived reset')
 assert(zero(s.rest) and zero(s.flight_elapsed) and zero(s.flight_time),
  'Old recovery/flight timers survived reset')
 assert(zero(s.launch_x) and zero(s.launch_y) and zero(s.launch_vy),
  'Old launch data survived reset')
 assert(not s.excited and not s.excited_side,'Old celebration state survived reset')
end

-- Every tap starts a fresh round, including invalid/out-of-band taps.
for _,width in ipairs({432,1280,2200}) do
 local w=water.new()
 for _,previous in ipairs({{'swim',nil},{'attack','charge'},{'attack','leap'},
                           {'attack','return'},{'excited','leap'},{'excited','return'},
                           {'excited',nil}}) do
  for _,airborne in ipairs({false,true}) do
   local s=prepared(w,width)
   if airborne then s.y=500 end
   contaminate(s,previous[1],previous[2])
   local old=s.target;local x,y,angle,beat,time=s.x,s.y,s.pose.angle,s.pose.sw,s.pose.time
   local target_y=water.surface_y(w,650)-64
   assert(swim.place(s,650,target_y,w,width),'Valid new prey was rejected')
   reset_motion(s,x,y,angle,beat,time)
   assert(s.mode=='attack' and s.target and s.target~=old)
   near(s.target.x,650);near(s.target.y,target_y)
   assert(s.lock and s.lock~=old and s.lock.x==650 and s.lock.y==target_y,
    'New round kept an old target lock')
   assert(s.phase=='charge' or s.phase=='return','New round waited for the old leap')
   assert(zero(s.charge_time),'New round kept a previous charge timer')

   -- An invalid tap must still remove the just-created prey and catch.
   s.caught=s.target;s.mode='excited'
   assert(not swim.place(s,650,water.surface_y(w,650)+1,w,width))
   reset_motion(s,x,y,angle,beat,time)
   assert(s.mode=='swim' and not s.target and not s.lock and not mouth.target(s))
   assert(s.phase==nil or s.phase=='return','Invalid tap retained an attack phase')
  end
 end

 -- All ways of missing the valid band clear an existing bird as well.
 for _,point in ipairs({{640,-1},{640,720},{640,water.surface_y(w,640)-128.01},
                        {(1280-width)/2-1,500},{(1280+width)/2+1,500}}) do
  for _,held in ipairs({false,true}) do
   local s=prepared(w,width);s.target={x=640,y=500}
   s.caught=held and s.target or nil;s.mode=held and 'excited' or 'attack'
   assert(not swim.place(s,point[1],point[2],w,width))
   assert(s.mode=='swim' and not s.target and not s.caught and not s.lock)
  end
 end
end

-- A caught bird switches to the third public mode immediately, including in air.
for _,width in ipairs({432,1280,2200}) do
 for _,dt in ipairs({1/120,1/20,.125}) do
  local w=water.new();local s=prepared(w,width)
  assert(swim.place(s,640,water.surface_y(w,640)-80,w,width))
  local prey=s.target;local caught=false
  for i=1,math.ceil(8/dt) do
   water.step(w,dt);swim.step(s,dt,w,width)
   assert(MODES[s.mode],'Unexpected public fish state: '..tostring(s.mode))
   if s.caught then
    caught=true;assert(s.caught==prey and s.target==prey and s.mode=='excited')
   end
  end
  assert(caught and s.mode=='excited' and s.caught==prey,'Catch never became excited swim')

  -- Starting a new round while carrying deletes the previous catch immediately.
  assert(swim.place(s,645,water.surface_y(w,645)-64,w,width))
  assert(s.mode=='attack' and s.target~=prey and not s.caught and not s.pending)
 end
end

-- Edge-target landings must return continuously instead of clamping/warping.
for _,width in ipairs({432,1280,2200}) do
 for _,fraction in ipairs({.02,.98}) do
  local w=water.new();local s=prepared(w,width);local dt=1/120
  local target_x=(1280-width)/2+width*fraction
  assert(swim.place(s,target_x,water.surface_y(w,target_x)-100,w,width))
  local caught=false
  for i=1,2400 do
   local x,y,phase=s.x,s.y,s.phase
   water.step(w,dt);swim.step(s,dt,w,width)
   assert(MODES[s.mode])
   local distance=math.sqrt((s.x-x)^2+(s.y-y)^2)
   assert(distance<60,'Fish warped on edge-target return: '..distance)
   if phase=='return' and s.phase=='return' then
    assert(distance<=360*dt+1e-6,'Water return exceeded its continuous movement limit')
   end
   caught=caught or s.caught~=nil
  end
  assert(caught,'Edge prey was never caught')
  assert(s.mode=='excited' and s.phase==nil,'Fish never completed its edge return')
  assert(s.x>=s.bounds.left-1e-6 and s.x<=s.bounds.right+1e-6)
  assert(s.y>=s.bounds.top-1e-6 and s.y<=s.bounds.bottom+1e-6)
 end
end
print('PASS fish states: three public modes, immediate valid/invalid round reset, one prey, capture transition and continuous edge return')
