package.path='./defold/?.lua;'..package.path
local m=require('rive-demo.motion')
local s=m.new()
local rest=math.pi/2
local function near(a,b) assert(math.abs(a-b)<1e-9,a..' != '..b) end
s.held=true;m.step(s,1/60);near(s.angle,rest+22/60)
assert(s.moving and s.wants_sound)
s.held=false;m.step(s,1/120)
assert(s.moving and not s.wants_sound)
local before=s.angle
s.held=true;m.step(s,1/120);near(s.angle,before+22/120)
s.held=false
for i=1,100 do m.step(s,1/120) end
near(s.angle,rest+math.pi*2)
assert(not s.moving and not s.wants_sound)
local stopped=s.angle;m.step(s,2);near(s.angle,stopped)
s.held=true;s.blink=.18;s.chew=1.48
m.step(s,.09)
local v=m.values(s)
near(v.eye_open,.08)
assert(s.moving and s.wants_sound and v.cheek_scale>1)
assert(v.upper_beak<0 and v.lower_beak>0)
assert(v.mouth_open==1)
for i=1,180 do m.step(s,1/120) end
near(m.values(s).eye_open,1)
near(m.values(s).upper_beak,0)
assert(s.moving)
print('PASS Rive motion: phase continuity, coast to rest, repress, sound requests and independent blink/chew')
