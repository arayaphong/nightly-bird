package.path='./?.lua;'..package.path
local p=require('shared.diagnostics.performance')
local function near(a,b) assert(math.abs(a-b)<1e-6,tostring(a)..' != '..tostring(b)) end
p.route('fish_test');p.frame(0)
for i=1,30 do p.frame(i/60) end
near(p.current.fps,60);near(p.current.frame_ms,1000/60)
assert(p.last_scene.page=='fish_test')
local scene=p.last_scene
p.route('home');assert(not p.current)
p.frame(10);p.frame(10.2);p.frame(10.4);p.frame(10.6)
near(p.current.fps,5);near(p.current.frame_ms,200);near(p.current.slowest_ms,200)
assert(p.last_scene==scene,'Menu samples must not overwrite the tested scene')
p.reset();p.frame(100);assert(not p.current and p.last_scene==scene)
p.frame(100.2);p.frame(99);p.frame(99.5)
near(p.current.fps,2)
local system=require('shared.diagnostics.system')
assert(system.renderer_status({available=false}):find('อ่าน'))
assert(system.renderer_status({available=true,context_lost=true}):find('Context lost',1,true))
for _,name in ipairs({'ANGLE (Google, Vulkan (SwiftShader Device), SwiftShader driver)','Mesa llvmpipe','Microsoft Basic Render Driver'}) do
 assert(system.renderer_status({available=true,gpu_details=true,gpu_renderer=name}):find('Software renderer',1,true))
end
assert(system.renderer_status({available=true,renderer='WebKit WebGL'}):find('ถูกซ่อน'))
assert(system.renderer_status({available=true,gpu_details=true,gpu_renderer='ANGLE (Qualcomm, Adreno 740)'}):find('พบชื่อ GPU'))
print('PASS diagnostics: wall-clock FPS, frame intervals, route/focus isolation, retained scene samples, software/masked/context-loss renderer reporting')
