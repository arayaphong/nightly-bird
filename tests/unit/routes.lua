package.path='./?.lua;'..package.path
local p=require('app.routes')
assert(p.valid('home') and not p.index('home'))
assert(not p.valid('invalid') and not p.neighbor('invalid',1))
local expected={'bird','fish','hawk','firefly','balloon','cloud'}
assert(#p.order==6)
for i,name in ipairs(expected) do
    assert(p.order[i]==name and p.valid(name) and p.index(name)==i)
    assert(p.neighbor(name,-1)==expected[i-1])
    assert(p.neighbor(name,1)==expected[i+1])
end
assert(not p.neighbor('home',1) and not p.neighbor('home',-1))
print('PASS gallery routes: six selections, home stays home, ordered swipes and edge bounds')
for _,name in ipairs({'studio','scenarios','characters','scenery','rules_and_items'}) do assert(p.valid(name)) end
assert(p.parent('home')==nil and p.parent('studio')=='home' and p.parent('scenarios')=='home')
assert(p.parent('characters')=='studio' and p.parent('scenery')=='studio' and p.parent('rules_and_items')=='studio')
assert(p.valid('night_sky') and p.parent('night_sky')=='scenery' and not p.index('night_sky'))
for _,name in ipairs(p.order) do assert(p.parent(name)=='characters') end
assert(not p.valid('game') and not p.valid('demo'))
assert(#require('studio.catalog')==3 and #require('scenarios.catalog')==0)
local messages,listener={},nil
local env=setmetatable({hash=function(v) return v end,
    msg={post=function(url,id,data) messages[#messages+1]={url=url,id=id,data=data or {}} end},
    window={WINDOW_EVENT_FOCUS_LOST=9,set_listener=function(fn) listener=fn end},
}, {__index=_G})
setfenv(assert(loadfile('app/navigation.script')),env)()
local app={};env.init(app);assert(app.page=='home' and listener)
local function find(url,id)
    for i=#messages,1,-1 do if messages[i].url==url and messages[i].id==id then return messages[i].data end end
end
assert(not find('/gallery#script','active').active)
env.on_message(app,'navigate',{name='characters'});assert(find('/gallery#script','active').active)
env.on_message(app,'navigate',{name='bird'});assert(find('/red_bird#script','active').active and not find('/gallery#script','active').active)
env.on_message(app,'back',{});assert(app.page=='characters')
env.on_message(app,'back',{});assert(app.page=='studio')
env.on_message(app,'back',{});assert(app.page=='home' and not find('/red_bird#script','active').active)
local n=#messages;env.on_message(app,'navigate',{name='invalid'});assert(#messages==n)
env.on_message(app,'navigate',{name='night_sky'})
assert(find('/night_sky#script','active').active and find('/sky_controls#gui','route').name=='night_sky')
env.on_message(app,'back',{});assert(app.page=='scenery' and not find('/night_sky#script','active').active)
messages={};listener(app,9)
for _,url in ipairs({'/red_bird#script','/hawk#script','/objects#script'}) do assert(find(url,'cancel')) end
assert(find('/ui#gui','clear_input') and find('/menus#gui','clear_input'))
assert(find('/sky_controls#gui','clear_input'))
env.final(app);assert(listener==nil)
print('PASS app navigation: Studio/Scenarios, nested back routes, preview visibility, invalid routes and focus cancellation')
