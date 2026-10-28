package.path='./?.lua;'..package.path
local swim=require('shared.scenery.fish.motion')
local water=require('shared.scenery.water.motion')
local attack=require('shared.scenery.fish.attack')
local function rng(seed)
 return function() seed=seed*16807%2147483647;return (seed-1)/2147483646 end
end
local function carrying(seed)
 local s=swim.new(rng(seed));s.target={x=640,y=500};s.caught=s.target;return s
end
local w=water.new()
for _,width in ipairs({432,1280,2200}) do
 local calm,excited=swim.new(rng(37)),carrying(37)
 local calm_distance,fast_distance,reversals,previous_dir=0,0,0,0
 for i=1,1440 do
  local ax,ay,bx,by=calm.x,calm.y,excited.x,excited.y
  swim.step(calm,1/120,w,width);swim.step(excited,1/120,w,width)
  calm_distance=calm_distance+math.sqrt((calm.x-ax)^2+(calm.y-ay)^2)
  fast_distance=fast_distance+math.sqrt((excited.x-bx)^2+(excited.y-by)^2)
  local dx=excited.x-bx;local dir=math.abs(dx)>.001 and (dx>0 and 1 or -1) or 0
  if dir~=0 then
   if previous_dir~=0 and dir~=previous_dir then reversals=reversals+1 end
   previous_dir=dir
  end
  local b=excited.bounds
  assert(excited.x>=b.left-1e-7 and excited.x<=b.right+1e-7 and excited.y>=b.top-1e-7 and excited.y<=b.bottom+1e-7)
 end
 assert(excited.excited and reversals>=2,'Catch did not swim back and forth')
 assert(fast_distance>calm_distance*4,'Catch did not noticeably increase speed')
 assert(math.abs(excited.pose.sw-12*swim.CARRIED_BEAT)<1e-7)
 -- Hiding/canceling restores ordinary random swimming and beat frequency.
 attack.cancel(excited);local phase=excited.pose.sw
 swim.step(excited,.5,w,width)
 assert(not excited.excited and math.abs(excited.pose.sw-phase-3.75)<1e-7)
end
-- Segment boundaries and reversals consume elapsed time equally on slow frames.
local a,b=carrying(12),carrying(12)
swim.step(a,12,w,1280);for i=1,1440 do swim.step(b,1/120,w,1280) end
assert(math.abs(a.x-b.x)<1e-6 and math.abs(a.y-b.y)<1e-6 and math.abs(a.pose.sw-b.pose.sw)<1e-6)
print('PASS excited fish: fast alternating crossings, three viewport bounds, strong fin beats, frame-rate-independent paths and reset')
