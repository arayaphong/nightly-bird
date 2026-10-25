-- Game rules only. Defold owns objects, collisions, rendering, input and audio.
-- Coordinates use Defold's upward-positive Y; the original game used downward Y.
local M = {}
M.WIDTH, M.HEIGHT = 480, 800
M.WATER, M.DANGER, M.RADIUS = 160, 228, 15.36
M.BASE_SPEED = M.WIDTH * .32 + 120

local function clamp(value, lo, hi)
    return math.max(lo, math.min(hi, value))
end

function M.reset(s)
    local best, generation = s.best or 0, (s.generation or 0) + 1
    for key in pairs(s) do s[key] = nil end
    s.best, s.generation = best, generation
    s.phase, s.time, s.distance, s.score = 'ready', 0, 0, 0
    s.x, s.y, s.vy = 144, 464, 0
    s.agi, s.skips, s.worms, s.collected = .25, 3, 0, 0
    s.speed, s.boost, s.chew = M.BASE_SPEED, 0, 0
    s.held, s.death_time, s.spawn_timer = false, 0, 1.5
    return s
end

function M.new()
    return M.reset({})
end

function M.start(s)
    M.reset(s)
    s.phase = 'play'
end

function M.pause(s)
    if s.phase == 'play' then s.phase, s.held = 'paused', false
    elseif s.phase == 'paused' then s.phase, s.held = 'play', false end
end

function M.collect(s, rainbow)
    if s.phase ~= 'play' then return false end
    s.collected, s.chew = s.collected + 1, 1.48
    if rainbow then
        s.boost = 8 -- Refresh, never stack the duration.
    elseif s.agi >= 1.5 - 1e-9 then
        s.worms = s.worms + 1
    else
        s.agi = math.min(1.5, math.floor((s.agi + .01) * 100 + .5) / 100)
    end
    return true
end

function M.step(s, dt)
    if s.phase == 'paused' or s.phase == 'over' then return end
    s.time = s.time + dt
    if s.phase == 'ready' then
        s.y = 464 + math.sin(s.time * 2) * 10
        return
    end
    if s.phase == 'dead' then
        s.death_time = s.death_time + dt
        s.vy = s.vy + (-72 - s.vy) * math.min(1, dt * 4)
        s.y = s.y + s.vy * dt
        if s.y < -M.RADIUS * 2 or s.death_time >= 9 then
            s.phase = 'over'
            return 'game_over'
        end
        return
    end
    s.boost = math.max(0, s.boost - dt)
    s.chew = math.max(0, s.chew - dt)
    local target = M.BASE_SPEED * (s.boost > 0 and 4 or 1)
    s.speed = s.speed + (target - s.speed) * math.min(1, dt * 3)
    s.distance = s.distance + s.speed * dt
    s.score = math.floor(s.distance / 40 + .5)
    s.best = math.max(s.best, s.score)
    local before = s.y
    s.vy = clamp(s.vy + (s.held and 800 * 2.7 * s.agi or -800 * 1.5 * s.agi) * dt, -760, 760)
    s.y = s.y + s.vy * dt
    local foot = M.RADIUS * .55
    if s.vy < 0 and before - foot >= M.WATER and s.y - foot < M.WATER then
        if s.skips > 0 then
            local height = (M.DANGER - M.WATER - foot) * .5 ^ (3 - s.skips)
            s.y = M.WATER + foot
            s.vy = math.sqrt(2 * 800 * 1.5 * s.agi * height)
            s.skips = s.skips - 1
            return 'bounce'
        end
        s.phase, s.held, s.death_time = 'dead', false, 0
        return 'drown'
    end
    if s.y - M.RADIUS > M.DANGER + 800 * .06 then s.skips = 3 end
    local ceiling = 800 - M.RADIUS - 8
    if s.y > ceiling then s.y, s.vy = ceiling, math.min(0, s.vy) end
end
return M
