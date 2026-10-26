-- Wall-clock frame intervals, independent of simulation dt and render resolution.
local M={page='home',samples={}}
local scenes={bird=true,fish=true,hawk=true,firefly=true,balloon=true,cloud=true,
    night_sky=true,night_water=true,fish_test=true}
function M.reset() M.started=nil;M.previous=nil;M.frames=0;M.slowest=0;M.current=nil end
function M.route(page) M.page=page;M.reset() end
function M.frame(now)
    if not M.started or now<M.previous then M.reset();M.started=now;M.previous=now;return end
    local interval=now-M.previous;M.previous=now
    M.frames=M.frames+1;M.slowest=math.max(M.slowest,interval)
    local elapsed=now-M.started
    if elapsed<.5 then return end
    local sample={page=M.page,fps=M.frames/elapsed,frame_ms=elapsed/M.frames*1000,
        slowest_ms=M.slowest*1000}
    M.current=sample;M.samples[M.page]=sample
    if scenes[M.page] then M.last_scene=sample end
    M.started=now;M.frames=0;M.slowest=0
    return sample
end
M.reset()
return M
