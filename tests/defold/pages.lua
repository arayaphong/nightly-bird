package.path='./defold/?.lua;'..package.path
local p=require('rive-demo.pages')
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
