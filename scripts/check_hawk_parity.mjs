// Compare rendered pose channels with the actual JS painter and flap update.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHawkPainter } from '../src/visuals/hawk-painter.js';
import { Hawk } from '../src/objects/hawk.js';
const rig = JSON.parse(readFileSync(new URL('../defold/rive-demo/hawk-rig.json', import.meta.url)));
const hawk = { size: 100, x: 200, y: 400, flap: 0, ang: 0, dir: 1, mode: 'patrol',
  vx: 100, vy: 0, body: { enabled: true }, trail: [] };
const session = { time: 0 };
let drawn = {};
const cx = Object.fromEntries(['save','restore','translate','rotate','scale','beginPath','moveTo','lineTo','stroke'].map(k => [k, () => {}]));
const parts = entries => entries.map(e => ({ ...e, draw(_cx, value) { drawn[e.id] = value; } }));
const wings = parts(rig.wings), blades = parts(rig.blades);
const painter = createHawkPainter({ bird: { y: 1000 }, enemies: { hawk }, session,
  viewport: { highY: 0, height: 800 } }, cx, { art(name) { return name === 'hawk' ? wings : blades; } });
const triggers = [30, 60, 260, 330, 700, 1300, 2000, 2600];
const expected = []; let remaining = 0;
for (let i = 0; i < 3600; i++) {
  const dt = [1 / 60, 1 / 120, .025, .013][i % 4];
  if (triggers.includes(i) && remaining === 0) remaining = 3;
  const diving = Math.min(dt, remaining);
  if (diving) { hawk.mode = 'dive'; Hawk.prototype.afterPhysics.call(hawk, diving); }
  if (dt > diving) { hawk.mode = 'patrol'; Hawk.prototype.afterPhysics.call(hawk, dt - diving); }
  remaining = Math.max(0, remaining - diving); if (remaining < 1e-9) remaining = 0;
  hawk.mode = remaining > 0 ? 'dive' : 'patrol'; session.time += dt;
  drawn = {}; painter.drawHawk();
  const row = [remaining > 0 ? 0 : 1, remaining > 0 ? 1 : 0,
    remaining > 0 ? 0 : drawn[rig.wings[0].id].angle - rig.wings[0].angle];
  for (const blade of rig.blades) row.push(remaining > 0 ? drawn[blade.id].angle : 0,
    remaining > 0 ? drawn[blade.id].scaleX : 0);
  expected.push(row);
}
const lua = `package.path='./defold/?.lua;'..package.path
local m=require('rive-demo.hawk-motion');local s=m.new()
local triggers={};for _,i in ipairs({30,60,260,330,700,1300,2000,2600}) do triggers[i]=true end
for i=0,3599 do
 if triggers[i] then m.dive(s) end
 m.step(s,({1/60,1/120,.025,.013})[i%4+1]);local v=m.values(s)
 local row={v.flight_visible,v.dive_visible,v.flight_visible==1 and v.wing_rotation or 0}
 for b=0,12 do
  row[#row+1]=v.dive_visible==1 and v['blade_'..b..'_angle'] or 0
  row[#row+1]=v.dive_visible==1 and v['blade_'..b..'_scale'] or 0
 end
 for j,n in ipairs(row) do row[j]=string.format('%.15g',n) end
 print(table.concat(row,' '))
end`;
const rows = execFileSync(process.env.DEFOLD_LUAJIT || 'luajit', ['-e', lua],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).trim().split('\n');
if (rows.length !== expected.length) throw Error('Hawk frame count mismatch');
for (const [i, row] of rows.entries()) {
  for (const [j, value] of row.split(' ').map(Number).entries()) {
    if (Math.abs(value - expected[i][j]) > 1e-10)
      throw Error(`Hawk frame ${i}, channel ${j}: ${value} differs from JS ${expected[i][j]}`);
  }
}
console.log('3600 hawk frames match original JS flight/dive poses and flap continuity.');
