package.path='./?.lua;'..package.path
local equipment=require('shared.items.equipment')
local motion=require('shared.characters.red_bird.motion')
local function near(a,b) assert(math.abs(a-b)<1e-8,a..' != '..b) end
-- All 16 equipment combinations are valid and removal leaves the others intact.
for mask=0,15 do
    local s=equipment.new()
    for i,key in ipairs(equipment.keys) do
        if math.floor(mask/2^(i-1))%2==1 then assert(equipment.toggle(s,key)) end
    end
    local v=equipment.values(s)
    for i,key in ipairs(equipment.keys) do near(v['equip_'..key],math.floor(mask/2^(i-1))%2) end
    near(v.equip_coat,v.equip_suit);near(v.equip_hood,v.equip_suit);near(v.equip_field,v.equip_magnet)
    near(v.crest_visible,mask<4 and 1 or 0)
    local bird=motion.new();bird.held=true;bird.blink=.18;bird.chew=1.48
    for i=1,70 do motion.step(bird,1/60);equipment.step(s,1/60) end
    assert(bird.moving and bird.wants_sound)
    for i,key in ipairs(equipment.keys) do near(equipment.values(s)['equip_'..key],v['equip_'..key]) end
    for _,key in ipairs(equipment.keys) do
        local before=s[key];assert(equipment.toggle(s,key)==not before)
        near(equipment.values(s).crest_visible,(s.helmet or s.suit) and 0 or 1)
        equipment.toggle(s,key)
        near(equipment.values(s)['equip_'..key],v['equip_'..key])
    end
    assert(equipment.toggle(s,'invalid')==nil)
end
local s=equipment.new();equipment.toggle(s,'magnet')
equipment.step(s,.25)
local a=equipment.values(s)
equipment.step(s,.1)
local b=equipment.values(s)
for i=0,2 do
    near(b['field_scale_'..i],a['field_scale_'..i]-.07)
    assert(b['field_alpha_'..i]>0 and b['field_alpha_'..i]<=.22)
end
-- Long running previews retain a bounded phase and do not reset toggles on focus loss.
equipment.step(s,1000000)
assert(s.time>=0 and s.time<10/7 and s.magnet)
print('PASS equipment: 16 combinations, independent animation, inward field rings and removal')
