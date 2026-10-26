package.path='./?.lua;'..package.path
local m=require('shared.characters.red_bird.motion')
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
-- Exercise the real controller: one sound per trigger across all three bites.
local plays,stops=0,0
local env=setmetatable({
    hash=function(v) return v end,
    sound={play=function(id) assert(id=='#chew');plays=plays+1 end,
           stop=function(id) assert(id=='#chew');stops=stops+1 end},
    rive={get_projection_matrix=function() return {m00=2/1280,m11=2/720} end,
          get_view_model_instance=function() return nil end},
}, {__index=_G})
setfenv(assert(loadfile('studio/characters/red_bird/preview.script')),env)()
local demo={motion=m.new(),items=require('shared.items.equipment').new(),width=1280,height=720}
env.on_message(demo,'chew',{})
assert(plays==1 and stops==1)
local peaks=0;local previous,previous_previous=0,0
for i=1,120 do
    env.update(demo,1/60)
    local amount=(m.values(demo.motion).cheek_scale-1)/.055
    if previous>previous_previous and previous>=amount and previous>.9 then peaks=peaks+1 end
    previous_previous,previous=previous,amount
end
assert(peaks==3 and plays==1 and demo.motion.chew==0)
env.on_message(demo,'chew',{});env.update(demo,.033)
env.on_message(demo,'chew',{});env.update(demo,.033)
assert(plays==3 and stops==3)
print('PASS Rive motion: phase continuity, coast to rest, repress, sound requests and independent blink/chew')
