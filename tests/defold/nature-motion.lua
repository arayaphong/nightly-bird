package.path='./defold/?.lua;'..package.path
local m=require('rive-demo.nature-motion')
local s=m.new()
for i=1,300 do
    m.step(s,({1/60,.025,.013})[(i-1)%3+1])
    for _,page in ipairs({'home','bird','firefly','balloon','cloud'}) do
        local v=m.values(s,page)
        assert(v.show_firefly+v.show_balloon+v.show_cloud==((page=='firefly' or page=='balloon' or page=='cloud') and 1 or 0))
        assert(v.wing_left>=.375 and v.wing_left<=1.625)
        assert(math.abs(v.wing_left+v.wing_right-2)<1e-8)
        assert(v.glow_alpha>=.19-1e-8 and v.glow_alpha<=.95+1e-8)
        assert(math.abs(v.cloud_y)<=1.5)
        assert(v.bolt_alpha==0 and v.flash_alpha==0 and v.dark_alpha==0)
        for j=0,17 do assert(v['rain_alpha_'..j]>=0 and v['rain_alpha_'..j]<=1) end
    end
end
local phase=s.time
assert(m.strike(s));assert(not m.strike(s),'Repeat extended the strike')
assert(s.time==phase and m.values(s,'cloud').dark_alpha>0 and m.values(s,'cloud').bolt_alpha==0)
local rng=s.random;local initial=m.values(s,'cloud')
assert(not m.strike(s) and s.random==rng,'Blocked trigger changed the geometry/random sequence')
for _,page in ipairs({'home','bird','fish','hawk','firefly','balloon'}) do
    local v=m.values(s,page);assert(v.bolt_alpha==0 and v.flash_alpha==0 and v.dark_alpha==0)
end
m.step(s,.16);assert(m.values(s,'cloud').bolt_alpha==1 and m.values(s,'cloud').dark_alpha==0)
m.step(s,.12);assert(m.values(s,'cloud').dark_alpha>.9 and m.values(s,'cloud').flash_alpha==0)
m.step(s,.12);assert(m.values(s,'cloud').bolt_alpha==.9 and m.values(s,'cloud').flash_alpha>0)
m.step(s,.2);local fading=m.values(s,'cloud');assert(fading.bolt_alpha>0 and fading.bolt_alpha<.9)
for _,name in ipairs({'bolt','fork'}) do
    for i=0,(name=='bolt' and 7 or 2) do
        assert(fading[name..'_x_'..i]==initial[name..'_x_'..i] and fading[name..'_y_'..i]==initial[name..'_y_'..i],
               'Geometry flickered within one strike')
    end
end
m.step(s,.13);assert(s.remaining==0 and m.values(s,'cloud').bolt_alpha==0 and m.values(s,'cloud').dark_alpha==0)
assert(m.strike(s));m.step(s,1);assert(s.remaining==0,'Long frame did not finish action')
assert(m.strike(s));m.cancel(s);assert(m.values(s,'cloud').flash_alpha==0)
-- Seeded runs are reproducible, but successive actions span the screen.
local seeded,matching=m.new(12345),m.new(12345)
local minx,maxx,miny,maxy=math.huge,-math.huge,math.huge,-math.huge
local previous
for n=1,80 do
    assert(m.strike(seeded) and m.strike(matching))
    local a,b=m.values(seeded,'cloud'),m.values(matching,'cloud')
    local x,y=a.bolt_x_7,a.bolt_y_7
    assert(x>=-126 and x<=126 and y>=75 and y<=250,'Endpoint outside screen bounds')
    assert(not previous or x~=previous.x or y~=previous.y,'Repeated endpoint')
    assert(a.fork_x_0==a.bolt_x_3 and a.fork_y_0==a.bolt_y_3,'Detached lightning branch')
    for i=0,7 do
        assert(a['bolt_x_'..i]==b['bolt_x_'..i] and a['bolt_y_'..i]==b['bolt_y_'..i])
        if i>0 then assert(a['bolt_y_'..i]>a['bolt_y_'..(i-1)],'Bolt folded back upward') end
    end
    minx,maxx=math.min(minx,x),math.max(maxx,x);miny,maxy=math.min(miny,y),math.max(maxy,y)
    previous={x=x,y=y};m.step(seeded,1);m.step(matching,1)
end
assert(maxx-minx>220 and maxy-miny>150,'Random targets did not cover the screen')
-- Controller gates both the animation and one original thunder recording.
local plays,stops,status=0,0,nil
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(_,id,data) if id=='cloud_status' then status=data end end},
    sound={stop=function(id) assert(id=='#thunder');stops=stops+1 end,
           play=function(id) assert(id=='#thunder');plays=plays+1 end},
    rive={get_projection_matrix=function() return {m00=2/480,m11=2/800} end,
          get_view_model_instance=function() return nil end},
}, {__index=_G})
setfenv(assert(loadfile('defold/rive-demo/nature.script')),env)()
local demo={};env.init(demo);demo.width,demo.height=480,800
env.on_message(demo,'lightning',{});assert(plays==0)
env.on_message(demo,'page',{name='firefly'});env.on_message(demo,'lightning',{});assert(plays==0)
env.on_message(demo,'page',{name='cloud'});env.on_message(demo,'lightning',{})
assert(plays==1 and status.busy)
env.on_message(demo,'lightning',{});assert(plays==1)
env.update(demo,.73);assert(not status.busy)
env.on_message(demo,'lightning',{});assert(plays==2 and status.busy)
local before=stops;env.on_message(demo,'page',{name='home'})
assert(not status.busy and stops>before and demo.motion.remaining==0)
env.on_message(demo,'page',{name='cloud'});env.on_message(demo,'lightning',{})
before=stops;env.on_message(demo,'cancel',{})
assert(not status.busy and stops>before and demo.motion.remaining==0)
print('PASS nature: previews, dark/bright lightning, random/stable geometry, timing, repeat lock, sound and cancellation')
