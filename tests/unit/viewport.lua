package.path='./?.lua;'..package.path
local view=require('shared.display.viewport')
local water=require('shared.scenery.water.motion')
local swim=require('shared.scenery.fish.motion')
local sky=require('shared.scenery.night_sky.motion')
local function near(a,b) assert(math.abs(a-b)<1e-7,tostring(a)..' != '..tostring(b)) end
for _,size in ipairs({{1280,720},{1920,1080},{2560,1080},{3840,1080},{1024,768}}) do
 local c=view.camera(unpack(size));near(c.scale,size[2]/720)
 near(c.width*c.scale,size[1]);near((c.left+c.right)/2,640)
 local w=water.new();water.set_width(w,c.width)
 local v=water.values(w)
 assert(v.water_x_0<c.left and v['water_x_162']>c.right)
 near(v.water_x_0+v.water_x_162,1280)
 near(view.moon_x(c.width),c.right-80)
 local b=swim.bounds(w,c.width)
 assert(b.left-b.rx>c.left and b.right+b.rx<c.right)
 local stars=sky.new();sky.set_width(stars,c.width);sky.step(stars,5)
 for _,p in ipairs(stars.stars) do assert(p.x>=c.left-14 and p.x<c.right+14) end
end
-- Changing display resolution must leave motion in world units unchanged.
local function fixed() return .73 end
local a,b=swim.new(fixed),swim.new(fixed);local w=water.new()
local low,high=view.camera(1280,720),view.camera(2560,1440)
swim.step(a,2,w,low.width);swim.step(b,2,w,high.width)
near(a.x,b.x);near(a.y,b.y);near(a.scale,b.scale)
near((b.x-640)*high.scale,2*(a.x-640)*low.scale)
print('PASS viewport: landscape camera, uniform world scale, wide water/sky bounds and resolution-independent swimming')
