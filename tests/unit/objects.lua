package.path='./?.lua;'..package.path
local m=require('shared.objects.rain_cloud.motion')
local s=m.new()
local firefly=require('shared.objects.firefly.motion')
local balloon=require('shared.objects.balloon.motion')
for i=1,300 do
    m.step(s,({1/60,.025,.013})[(i-1)%3+1])
    local f,b,v=firefly.values(s.time),balloon.values(s.time),m.values(s)
    assert(f.show_firefly==1 and b.show_balloon==1 and v.show_cloud==1)
    for _,page in ipairs({'home','bird','firefly','balloon'}) do assert(m.values(s,page).show_cloud==0) end
    assert(f.wing_left>=.375 and f.wing_left<=1.625)
    assert(math.abs(f.wing_left+f.wing_right-2)<1e-8)
    assert(f.glow_alpha>=.19-1e-8 and f.glow_alpha<=.95+1e-8)
    assert(math.abs(b.balloon_y-300)<=5 and math.abs(b.balloon_rotation)<=.035)
    assert(math.abs(v.cloud_y)<=1.5 and v.bolt_alpha==0 and v.flash_alpha==0 and v.dark_alpha==0)
    for j=0,17 do assert(v['rain_alpha_'..j]>=0 and v['rain_alpha_'..j]<=1) end
end
local phase=s.time
assert(m.strike(s));assert(not m.strike(s),'Repeat extended the strike')
assert(s.time==phase and m.values(s,'cloud').dark_alpha>0 and m.values(s,'cloud').bolt_alpha==0)
local rng=s.random;local initial=m.values(s,'cloud')
assert(not m.strike(s) and s.random==rng,'Blocked trigger changed the geometry/random sequence')
for _,page in ipairs({'home','bird','fish','hawk','firefly','balloon'}) do
    local v=m.values(s,page);assert(v.bolt_alpha==0 and v.flash_alpha==0 and v.dark_alpha==0)
end
-- Four rapid charge states occupy exactly 0.2 seconds, with no early bolt.
for i=1,4 do
    local v=m.values(s,'cloud')
    assert(v.bolt_alpha==0,'Bolt appeared before the charge finished')
    assert((v.dark_alpha>0)==(i%2==1) and (v.flash_alpha>0)==(i%2==0),'Wrong flash sequence')
    assert(m.step(s,.05)==(i==4),'Discharge event did not occur at exactly 0.2 seconds')
end
local discharged=m.values(s,'cloud')
assert(discharged.dark_alpha==0 and discharged.flash_alpha==0 and discharged.bolt_alpha==1,
       'Cloud did not restore its original color at discharge')
assert(not m.step(s,.22),'Discharge event repeated')
local fading=m.values(s,'cloud');assert(fading.bolt_alpha>0 and fading.bolt_alpha<1)
assert(fading.dark_alpha==0 and fading.flash_alpha==0,'Cloud flashed during the bolt')
for _,name in ipairs({'bolt','fork'}) do
    for i=0,(name=='bolt' and 7 or 2) do
        assert(fading[name..'_x_'..i]==initial[name..'_x_'..i] and fading[name..'_y_'..i]==initial[name..'_y_'..i],
               'Geometry flickered within one strike')
    end
end
m.step(s,.061);assert(s.remaining==0 and m.values(s,'cloud').bolt_alpha==0 and m.values(s,'cloud').dark_alpha==0)
assert(m.strike(s));assert(m.step(s,1));assert(s.remaining==0,'Long frame did not finish action')
assert(not m.step(s,1),'Long frame repeated the discharge event')
assert(m.strike(s));m.step(s,.19);m.cancel(s)
assert(not m.step(s,1) and m.values(s,'cloud').flash_alpha==0,'Canceled charge fired later')
-- Check both sides of every boundary, including the last instant before firing.
for _,case in ipairs({{0,'dark'},{.049999,'dark'},{.05,'bright'},{.099999,'bright'},
                      {.1,'dark'},{.149999,'dark'},{.15,'bright'},{.199999,'bright'},{.2,'bolt'}}) do
    local sample=m.new(1);m.strike(sample);local event=m.step(sample,case[1]);local v=m.values(sample,'cloud')
    assert((v.dark_alpha>0)==(case[2]=='dark') and (v.flash_alpha>0)==(case[2]=='bright'))
    assert((v.bolt_alpha>0)==(case[2]=='bolt') and event==(case[2]=='bolt'))
end
local sixty=m.new(3);m.strike(sixty)
for i=1,12 do assert(m.step(sixty,1/60)==(i==12),'60 FPS charge missed the 200 ms boundary') end
assert(m.values(sixty).bolt_alpha==1 and m.values(sixty).dark_alpha==0 and m.values(sixty).flash_alpha==0)
-- Seeded runs are reproducible, but successive actions span the screen.
local seeded,matching=m.new(12345),m.new(12345)
local minx,maxx,miny,maxy=math.huge,-math.huge,math.huge,-math.huge
local previous
for n=1,80 do
    assert(m.strike(seeded) and m.strike(matching))
    local a,b=m.values(seeded,'cloud'),m.values(matching,'cloud')
    local x,y=a.bolt_x_7,a.bolt_y_7
    assert(x>=-640/1.7 and x<=640/1.7 and y>=-300/1.7 and y<=420/1.7,'Endpoint outside screen bounds')
    assert(not previous or x~=previous.x or y~=previous.y,'Repeated endpoint')
    assert(a.fork_x_0==a.bolt_x_3 and a.fork_y_0==a.bolt_y_3,'Detached lightning branch')
    for i=0,7 do
        assert(a['bolt_x_'..i]==b['bolt_x_'..i] and a['bolt_y_'..i]==b['bolt_y_'..i])
    end
    minx,maxx=math.min(minx,x),math.max(maxx,x);miny,maxy=math.min(miny,y),math.max(maxy,y)
    previous={x=x,y=y};m.step(seeded,1);m.step(matching,1)
end
assert(minx<-300 and maxx>300 and miny<-140 and maxy>200,'Random targets missed part of the screen')
-- Explicit bird targets are hit exactly in any direction, including very near
-- the cloud and outside preview bounds. No downward-only aiming or clamping.
for _,target in ipairs({{x=0,y=-150},{x=-135,y=-6},{x=135,y=-6},{x=0,y=270},
                         {x=1,y=-5},{x=0,y=-6},{x=300,y=-250}}) do
    local aimed=m.new(2);assert(m.strike(aimed,target));local v=m.values(aimed,'cloud')
    assert(v.bolt_x_7==target.x and v.bolt_y_7==target.y,'Bolt missed explicit target')
    for _,value in pairs(v) do assert(value==value and math.abs(value)<math.huge,'Invalid near-target geometry') end
end
local corner=m.preview_target(0,0)
assert(corner.x==-640/1.7 and corner.y==-300/1.7)
-- Wide/narrow inspection windows still allow lightning across the full canvas.
for _,size in ipairs({{1900,720},{1280,900}}) do
    local wide=m.new(12345);m.set_preview_size(wide,size[1],size[2])
    local bounds=wide.target_bounds;local outside=false
    for i=1,80 do
        assert(m.strike(wide));local v=m.values(wide)
        assert(v.bolt_x_7>=bounds.min_x and v.bolt_x_7<=bounds.max_x)
        assert(v.bolt_y_7>=bounds.min_y and v.bolt_y_7<=bounds.max_y)
        outside=outside or math.abs(v.bolt_x_7)>640/1.7 or v.bolt_y_7>420/1.7 or v.bolt_y_7<-300/1.7
        m.step(wide,1)
    end
    assert(outside,'Responsive lightning stayed inside the reference artboard')
end
-- Controller gates both the animation and one original thunder recording.
local plays,stops,status=0,0,nil
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(_,id,data) if id=='cloud_status' then status=data end end},
    sound={stop=function(id) assert(id=='#thunder');stops=stops+1 end,
           play=function(id) assert(id=='#thunder');plays=plays+1 end},
    rive={get_projection_matrix=function() return {m00=2/1280,m11=2/720} end,
          get_view_model_instance=function() return nil end},
}, {__index=_G})
setfenv(assert(loadfile('studio/characters/objects/preview.script')),env)()
local demo={};env.init(demo);demo.width,demo.height=1280,720
env.on_message(demo,'lightning',{});assert(plays==0)
env.on_message(demo,'page',{name='firefly'});env.on_message(demo,'lightning',{});assert(plays==0)
env.on_message(demo,'page',{name='cloud'});env.on_message(demo,'lightning',{})
assert(plays==0 and status.busy,'Thunder played during charging')
env.on_message(demo,'lightning',{});assert(plays==0)
env.update(demo,.199999);assert(plays==0 and status.busy)
env.update(demo,.000001);assert(plays==1 and status.busy)
assert(m.values(demo.motion,'cloud').bolt_alpha==1,'Sound started without the bolt')
env.update(demo,.281);assert(not status.busy and plays==1)
env.on_message(demo,'lightning',{});assert(plays==1 and status.busy)
local before=stops;env.on_message(demo,'page',{name='home'})
assert(not status.busy and stops>before and demo.motion.remaining==0)
env.on_message(demo,'page',{name='cloud'});env.update(demo,1);assert(plays==1,'Leaving charge did not cancel thunder')
env.on_message(demo,'lightning',{target_x=0,target_y=0})
local aimed=m.values(demo.motion,'cloud');assert(aimed.bolt_x_7==corner.x and aimed.bolt_y_7==corner.y)
env.update(demo,.2);assert(plays==2)
before=stops;env.on_message(demo,'cancel',{})
assert(not status.busy and stops>before and demo.motion.remaining==0)
print('PASS nature: 0.2s silent charge, exact bolt/audio boundary, full-screen/explicit targets, stable geometry and cancellation')
