package.path='./?.lua;'..package.path
local m=require('shared.scenery.fish.motion')
local water=require('shared.scenery.water.motion')
local function rng(seed)
    return function() seed=(seed*16807)%2147483647;return (seed-1)/2147483646 end
end
local w=water.new();local s=m.new(rng(173))
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
   m.step(s,0,w,aspect)
   if s.visible then
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
local env=setmetatable({hash=function(v) return v end,
 msg={post=function(_,id) enabled=id end},
 go={set_position=function(v) position=v end,set_scale=function(v) scale=v end},
 vmath={vector3=function(x,y,z) return {x=x,y=y,z=z} end},
 rive={get_view_model_instance=function() return 1 end,cmd={setViewModelInstanceNumber=function(_,k,v) channels[k]=v end}},
},{__index=_G})
setfenv(assert(loadfile('studio/scenery/fish/actor.script')),env)()
local actor={};env.init(actor);assert(enabled=='disable')
local frame={dt=.1,width=2560,height=1080,level=.2,roughness=.6}
env.on_message(actor,'water_frame',frame);assert(not position)
env.on_message(actor,'active',{active=true});env.on_message(actor,'water_frame',frame)
assert(enabled=='enable' and position.z==-.1 and scale.x==scale.y and channels.tail)
local t=actor.motion.pose.time
env.on_message(actor,'active',{active=false});assert(enabled=='disable')
env.on_message(actor,'water_frame',frame);assert(actor.motion.pose.time==t)
env.on_message(actor,'active',{active=true});frame.level=0;env.on_message(actor,'water_frame',frame);assert(not actor.visible)
frame.level=.2;env.on_message(actor,'water_frame',frame);assert(enabled=='enable')
print('PASS swimming fish: four random directions, continuous segments, wave/viewport bounds, shallow water and lifecycle')
