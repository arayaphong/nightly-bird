package.path='./defold/?.lua;'..package.path
local m=require('rive-demo.fish-motion')
local function near(a,b) assert(math.abs(a-b)<1e-9,a..' != '..b) end
local s=m.new();local time=0
for i=1,300 do
    local dt=({1/60,1/120,.025,.013})[(i-1)%4+1]
    time=time+dt;m.step(s,dt)
    local v=m.values(s)
    near(v.tail,math.sin(time*7.5)*.2)
    near(v.fin,math.sin(time*7.5*.8+1.2)*.22)
    near(v.gill_x,1+.28*math.max(0,math.sin(time*2.6)))
    near(v.gill_y,1+(v.gill_x-1)*.35)
    near(v.angle,math.sin(time*7.5)*.035)
    assert(v.belly==1)
end
local phase=s.sw;local before=s.angle
m.turn(s);near(s.sw,phase);near(s.angle,before)
for i=1,150 do m.step(s,1/120) end
assert(math.abs(s.angle-math.pi)<.001 and not s.turning and m.values(s).belly==-1)
phase=s.sw;m.turn(s);near(s.sw,phase)
m.step(s,.025);local midway=s.angle
assert(midway>0 and midway<math.pi)
m.turn(s);near(s.angle,midway)
m.step(s,.025);assert(s.angle>midway)
m.turn(s)
for i=1,150 do m.step(s,1/120) end
assert(math.abs(s.angle)<.001 and not s.turning and m.values(s).belly==1)
-- Tail and fin have different frequencies: crossing 50 tail cycles cannot
-- reset the fin phase during a long-running preview.
local long=m.new();long.sw=math.pi*100-.01
local fin=m.values(long).fin;m.step(long,.025)
assert(long.sw>math.pi*100 and math.abs(m.values(long).fin-fin)<.04)
print('PASS fish: original swim pose, upright turns, phase continuity and mid-turn reversal')
