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
        for j=0,17 do assert(v['rain_alpha_'..j]>=0 and v['rain_alpha_'..j]<=1) end
    end
end
print('PASS nature previews: exclusive visibility, complementary wings, pulse bounds and rain fade')
