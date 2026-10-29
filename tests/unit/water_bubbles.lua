package.path='./?.lua;'..package.path
local bubbles=require('shared.scenery.water.bubbles.motion')
local water=require('shared.scenery.water.motion')
local anchors=require('shared.characters.fish.anchors')
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
local function rng(seed) return function() seed=seed*16807%2147483647;return (seed-1)/2147483646 end end
local w=water.new();water.set_roughness(w,0)
local emitter={tail_x=600,tail_y=650,fin_x=630,fin_y=625}
local s=bubbles.new(rng(7));bubbles.step(s,.49,w,emitter);assert(s.total==0)
bubbles.step(s,.01,w,emitter);assert(s.total==8)
local count={tail=0,fin=0}
for i,p in ipairs(s.items) do if p.alive then count[p.source]=count[p.source]+1;assert(p.y>water.surface_y(w,p.x)) end end
assert(count.tail==5 and count.fin==3)
bubbles.step(s,.5,w,emitter);assert(s.total==16)
-- A released bubble is world-owned: changing/swapping emitters cannot move it.
local p=s.items[1];local x,y=p.origin_x,p.origin_y;local before=p.y
local moved={tail_x=900,tail_y=650,fin_x=860,fin_y=625}
bubbles.step(s,.2,w,moved);near(p.origin_x,x);near(p.origin_y,y);assert(p.y<before)
-- Stopping emission retains old bubbles until they reach the animated surface.
local total=s.total;bubbles.step(s,.1,w,nil);assert(s.total==total)
for i=1,240 do bubbles.step(s,1/60,w,nil) end
for _,p in ipairs(s.items) do assert(not p.alive) end
-- Scheduling and rise distance agree on coarse/fine frame intervals.
local a,b=bubbles.new(rng(19)),bubbles.new(rng(19))
bubbles.step(a,3,w,emitter);for i=1,360 do bubbles.step(b,1/120,w,emitter) end
assert(a.total==48 and b.total==48)
for i,p in ipairs(a.items) do
 local q=b.items[i];assert(p.alive==q.alive)
 if p.alive then near(p.x,q.x);near(p.y,q.y);near(p.age,q.age) end
end
-- No bubbles may originate in air; the two sources are checked independently.
local air={tail_x=600,tail_y=500,fin_x=630,fin_y=500}
local s=bubbles.new(rng(1));bubbles.step(s,1,w,air);assert(s.total==0)
air.tail_y=650;bubbles.step(s,.5,w,air);assert(s.total==5)
bubbles.step(s,1,w,{enabled=false});assert(s.total==5)
-- A bounded pool reuses slots, never allocates game objects or follows parents.
local deep=water.new();water.set_level(deep,1);water.set_roughness(deep,0)
local s=bubbles.new(rng(13));bubbles.step(s,30,deep,emitter)
assert(#s.items==bubbles.CAPACITY and s.total==480)
bubbles.clear(s);assert(s.elapsed==0 and not s.previous)
for _,p in ipairs(s.items) do assert(not p.alive) end
local schema=bubbles.values(bubbles.new());local n=0;for _ in pairs(schema) do n=n+1 end
assert(n==bubbles.CAPACITY*3 and schema.bubble_191_alpha==0)
-- Attachment coordinates match the actual SVG pivot, tail rotation and belly.
local fish={x=640,y=650,scale=.05};local pose={angle=0,tail=0,belly=1}
local right=anchors.emitters(fish,pose)
near(right.tail_x,640-(1493-830)*.05);near(right.tail_y,650+(317-500)*.05)
near(right.fin_x,640-(886-830)*.05);near(right.fin_y,650+(86-500)*.05)
pose.angle=math.pi;pose.belly=-1;local left=anchors.emitters(fish,pose)
near(left.tail_x,1280-right.tail_x);near(left.tail_y,right.tail_y)
near(left.fin_x,1280-right.fin_x);near(left.fin_y,right.fin_y)
pose.angle=math.pi/2;pose.belly=1;local turn=anchors.emitters(fish,pose)
near(turn.tail_x,640-(right.tail_y-650));near(turn.tail_y,650+(right.tail_x-640))
fish.phase='leap';assert(not anchors.emitters(fish,pose).enabled)
print('PASS water bubbles: 5 tail + 3 dorsal every 0.5s, fixed pool, world-space rise, surface expiry, paused sources and SVG anchors')
