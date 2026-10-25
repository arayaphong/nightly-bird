-- Port of src/visuals/bird-animation.js. Units, pivots and timing match JS.
local M = {}
local TAU, REST = math.pi*2, math.pi/2
function M.new()
    return {angle=REST,stop=REST,spin=0,held=false,moving=false,wants_sound=false,blink=0,chew=0,chew_sound=false}
end
function M.step(s, dt)
    local before=s.angle
    if s.held then
        s.angle=s.angle+22*dt; s.spin=22; s.stop=nil
    else
        if s.stop==nil then s.stop=REST+TAU*math.ceil((s.angle-REST)/TAU-1e-9) end
        if s.angle<s.stop then s.angle=math.min(s.stop,s.angle+(s.spin~=0 and s.spin or 22)*dt) end
    end
    s.moving=s.angle~=before
    s.wants_sound=s.moving and s.held
    if s.angle>TAU*50 then
        s.angle=s.angle-TAU*48
        if s.stop then s.stop=s.stop-TAU*48 end
    end
    local chew_before=s.chew
    s.blink=math.max(0,s.blink-dt);s.chew=math.max(0,s.chew-dt)
    s.chew_sound=false
    -- Begin each crunch as the jaw starts closing (.2/.6/1.0 seconds).
    -- Crossing detection handles mixed frame times without replaying an event.
    if chew_before>0 then
        local before,after=1.48-chew_before,1.48-s.chew
        for i=0,2 do
            local bite=.2+.4*i
            if before<bite and after>=bite then s.chew_sound=true;break end
        end
    end
end
function M.values(s)
    local wing=-math.cos(s.angle)
    local open=1
    if s.blink>0 then open=1-.92*math.sin(math.pi*math.max(0,math.min(1,1-s.blink/.18))) end
    local chew=0
    if s.chew>0 then
        local elapsed=1.48-s.chew
        if elapsed<1.2 then chew=(1-math.cos(elapsed/1.2*TAU*3))/2 end
    end
    local up,down=math.rad(-14*chew),math.rad(20*chew)
    return {
        wing_front=math.rad(-wing*58),wing_back=math.rad(-wing*58*.9),
        wing_scale=1-math.max(0,wing)*.18,
        eye_open=math.max(.06,open),eye_normal=open>.4 and 1 or 0,
        eye_white=open>.4 and 0 or 1,eye_lid=open<.4 and 1 or 0,
        upper_beak=up,lower_beak=down,cheek_scale=1+chew*.055,cheek_y=282+chew*3,
        mouth_open=chew>.05 and 1 or 0,
        mouth_x1=4+70*math.cos(up),mouth_y1=-8+70*math.sin(up),
        mouth_x2=4+66*math.cos(down),mouth_y2=6+66*math.sin(down),
    }
end
return M
