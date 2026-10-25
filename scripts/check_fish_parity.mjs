// Optional comparison with the actual JS painter and heading interpolation.
import { execFileSync } from 'node:child_process';
import { createFishPainter } from '../legacy/src/visuals/fish-painter.js';
import { Shark } from '../legacy/src/objects/shark.js';
const fish = { size: 100, x: 200, y: 400, sw: 0, ang: 0, bob: 0,
  vx: 1, vy: 0, dir: 1, mode: 'patrol', body: { enabled: true }, viewport: {} };
const session = { time: 0 };
let angles = [], scales = [], pose = {};
const cx = { save() {}, restore() {}, translate() {},
  rotate(a) { angles.push(a); }, scale(x, y) { scales.push([x, y]); } };
const parts = ['body', 'tail', 'fin', 'gill'].map(role => ({ role, draw(_cx, value) { pose[role] = value; } }));
const painter = createFishPainter({ effects: {}, enemies: { fish }, session, viewport: { waterY: 1000 } },
  cx, { art() { return parts; } });
const expected = [];
for (let i = 0; i < 3600; i++) {
  const dt = [1 / 60, 1 / 120, .025, .013][i % 4];
  if ([30, 110, 116, 190].includes(i)) fish.vx = -fish.vx;
  fish.sw += 7.5 * dt; session.time += dt;
  Shark.prototype.afterPhysics.call(fish, dt);
  angles = []; scales = []; pose = {}; painter.drawFish();
  expected.push([pose.tail.angle, pose.fin.angle, pose.gill.scaleX, pose.gill.scaleY,
    angles[0], scales.reduce((sign, [, y]) => sign * (y < 0 ? -1 : 1), 1)]);
}
const lua = `package.path='./?.lua;'..package.path
local m=require('shared.characters.fish.motion');local s=m.new()
for i=0,3599 do
 if i==30 or i==110 or i==116 or i==190 then m.turn(s) end
 m.step(s,({1/60,1/120,.025,.013})[i%4+1]);local v=m.values(s)
 print(string.format('%.15g %.15g %.15g %.15g %.15g %.15g',v.tail,v.fin,v.gill_x,v.gill_y,v.angle,v.belly))
end`;
const rows = execFileSync(process.env.DEFOLD_LUAJIT || 'luajit', ['-e', lua], { encoding: 'utf8' }).trim().split('\n');
if (rows.length !== expected.length) throw Error('Fish frame count mismatch');
for (const [i, row] of rows.entries()) {
  for (const [j, value] of row.split(' ').map(Number).entries()) {
    if (Math.abs(value - expected[i][j]) > 1e-10)
      throw Error(`Fish frame ${i}, channel ${j}: ${value} differs from JS ${expected[i][j]}`);
  }
}
console.log('3600 mixed-dt fish frames match original JS painter and heading, including long swim and mid-turn reversal.');
