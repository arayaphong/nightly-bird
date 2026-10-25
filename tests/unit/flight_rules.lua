package.path = './?.lua;' .. package.path
local rules = require('shared.rules.flight')
local total = 0
local function test(name, fn)
    fn()
    total = total + 1
    print('PASS ' .. name)
end
local function close(a, b)
    assert(math.abs(a - b) < 1e-7, tostring(a) .. ' != ' .. tostring(b))
end
local function playing()
    local s = rules.new()
    rules.start(s)
    return s
end
local function surface(s)
    s.y, s.vy = rules.WATER + rules.RADIUS * .55 + .1, -100
end

test('held input ascends; released input descends with original acceleration', function()
    local s = playing()
    s.held = true
    rules.step(s, 1/60)
    close(s.vy, 9)
    s.held, s.vy = false, 0
    rules.step(s, 1/60)
    close(s.vy, -5)
end)
test('the first three water contacts bounce with diminishing energy; fourth drowns', function()
    local s, previous = playing(), math.huge
    for i = 1, 3 do
        surface(s)
        assert(rules.step(s, 1/60) == 'bounce')
        assert(s.skips == 3-i and s.vy > 0 and s.vy < previous)
        previous = s.vy
    end
    surface(s)
    assert(rules.step(s, 1/60) == 'drown')
    assert(s.phase == 'dead' and not s.held)
end)
test('climbing above the safe threshold restores three water skips', function()
    local s = playing()
    s.skips, s.y, s.vy = 0, 400, 0
    rules.step(s, 1/60)
    assert(s.skips == 3)
end)
test('pause freezes motion, score, boost and chewing; resume clears held input', function()
    local s = playing()
    s.held = true
    rules.collect(s, true)
    rules.pause(s)
    local y, time, boost, chew, distance = s.y, s.time, s.boost, s.chew, s.distance
    for i = 1, 60 do rules.step(s, 1/60) end
    close(s.y, y); close(s.time, time); close(s.boost, boost)
    close(s.chew, chew); close(s.distance, distance)
    rules.pause(s)
    assert(s.phase == 'play' and not s.held)
end)
test('normal fireflies increment AGI exactly and cap at 1.5 before rewarding worms', function()
    local s = playing()
    for i = 1, 125 do assert(rules.collect(s, false)) end
    close(s.agi, 1.5)
    assert(s.worms == 0)
    rules.collect(s, false)
    assert(s.worms == 1)
end)
test('rainbow refreshes an eight second boost instead of stacking; speed approaches 4x', function()
    local s = playing()
    rules.collect(s, true)
    rules.step(s, 1/60)
    assert(s.boost < 8 and s.speed > rules.BASE_SPEED)
    rules.collect(s, true)
    close(s.boost, 8)
    close(s.agi, .25)
    s.held = true
    for i = 1, 420 do rules.step(s, 1/60) end
    assert(s.speed > rules.BASE_SPEED * 3.9)
    for i = 1, 120 do rules.step(s, 1/60) end
    close(s.boost, 0)
    assert(s.speed < rules.BASE_SPEED * 1.2)
end)
test('only active players can collect; game over freezes and restart preserves best', function()
    local s = playing()
    s.distance = 4000
    rules.step(s, 1/60)
    assert(s.best >= 100)
    local best, generation = s.best, s.generation
    s.phase, s.y = 'dead', -40
    assert(rules.step(s, 1/60) == 'game_over')
    assert(not rules.collect(s, true))
    local time = s.time
    rules.step(s, 5)
    close(s.time, time)
    rules.start(s)
    assert(s.best == best and s.score == 0 and s.agi == .25)
    assert(s.generation > generation and s.phase == 'play' and not s.held)
end)
test('ceiling clamps position and upward velocity', function()
    local s = playing()
    s.y, s.vy, s.held = 790, 300, true
    rules.step(s, 1/60)
    close(s.y, 800-rules.RADIUS-8)
    close(s.vy, 0)
end)
print(total .. ' Defold rule tests passed')
