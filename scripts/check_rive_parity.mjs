// Optional source-to-source regression: DEFOLD_LUAJIT=/path/to/luajit node scripts/check_rive_parity.mjs
import { execFileSync } from 'node:child_process';
import { BirdAnimation } from '../legacy/src/visuals/bird-animation.js';
const bird = { alive: true, flapping: false };
const animation = new BirdAnimation(bird, { phase: 'play' }, () => .5);
animation.blinkNext = Infinity;
const expected = [];
for (let i = 0; i < 300; i++) {
  bird.flapping = (i >= 5 && i < 37) || (i >= 42 && i < 81) || (i >= 150 && i < 165);
  if (i === 16 || i === 155) animation.blink();
  if (i === 22 || i === 152) animation.chew();
  animation.lazyTime = Infinity; // This proof uses explicit input, with no autonomous idle flaps.
  animation.update([1 / 60, 1 / 120, .025, .013][i % 4]);
  expected.push([animation.wingAngle, animation.wing(), animation.blinkOpen(), animation.chewAmount(),
    animation.wingMoving, animation.wingSoundRequested]);
}
const lua = `package.path='./?.lua;'..package.path
local m=require('shared.characters.red_bird.motion');local s=m.new()
for i=0,299 do
 s.held=(i>=5 and i<37) or (i>=42 and i<81) or (i>=150 and i<165)
 if i==16 or i==155 then s.blink=.18 end
 if i==22 or i==152 then s.chew=1.48 end
 m.step(s,({1/60,1/120,.025,.013})[i%4+1])
 local v=m.values(s)
 print(string.format('%.15g %.15g %.15g %.15g %s %s',s.angle,
  v.wing_front/(-58*math.pi/180),v.eye_open,(v.cheek_scale-1)/.055,tostring(s.moving),tostring(s.wants_sound)))
end`;
const output = execFileSync(process.env.DEFOLD_LUAJIT || 'luajit', ['-e', lua], { encoding: 'utf8' });
const rows = output.trim().split('\n');
if (rows.length !== expected.length) throw Error(`Expected 300 frames, got ${rows.length}`);
for (const [i, row] of rows.entries()) {
  const values = row.split(' ');
  for (let j = 0; j < 4; j++) {
    if (Math.abs(Number(values[j]) - expected[i][j]) > 1e-10)
      throw Error(`Frame ${i}, channel ${j}: ${values[j]} differs from JS ${expected[i][j]}`);
  }
  for (let j = 4; j < 6; j++) {
    if ((values[j] === 'true') !== expected[i][j]) throw Error(`Frame ${i}, state ${j} differs`);
  }
}
console.log('300 mixed-dt frames match original JS: wing phase, blink, chew, coast/repress and sound requests.');
