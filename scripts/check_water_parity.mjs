// Compare native wave/glint values with the real frozen legacy drawWater painter.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createEnvironmentPainter } from '../legacy/src/visuals/environment-painter.js';
const spec=JSON.parse(readFileSync(new URL('../shared/scenery/water/rig.json',import.meta.url)));
const viewport={width:480,height:800,waterY:520},session={time:0};
let points=[],rects=[],gradients=[],lineStyle,lineWidth;
const stack=[];
const cx={globalAlpha:1,
 createLinearGradient(...coords){const g={coords,stops:[],addColorStop(...s){this.stops.push(s)}};gradients.push(g);return g},
 fillRect(x,y,w,h){rects.push({x,y,w,h,alpha:this.globalAlpha,color:this.fillStyle})},
 save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth})},
 restore(){Object.assign(this,stack.pop())},
 beginPath(){points=[]},rect(){},clip(){},
 moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},
 stroke(){lineStyle=this.strokeStyle;lineWidth=this.lineWidth},
};
const painter=createEnvironmentPainter({bird:{},enemies:{},session,viewport,world:{stars:[]}},cx,{});
const levels=[.35,.75,0,.2,1],dts=[1/60,1/120,.025,.013,.15],expected=[];
for(let i=0;i<1200;i++){
 const level=levels[Math.floor(i/120)%levels.length];viewport.waterY=800*(1-level);session.time+=dts[i%dts.length];
 points=[];rects=[];gradients=[];painter.drawWater();
 if(lineStyle!==spec.line_color||lineWidth!==spec.line_width)throw Error('Legacy surface style differs');
 if(JSON.stringify(gradients[0].stops)!==JSON.stringify([[0,spec.top_color],[1,spec.bottom_color]]))throw Error('Legacy water palette differs');
 const glints=rects.filter(r=>r.color==='#ffeec8');
 if(points.length!==61||glints.length!==spec.reflections)throw Error('Legacy sample/glint count differs');
 const row=[viewport.waterY,...points.map(p=>p[1])];
 // Only the anchor moves from legacy's 0.8*width to the current upper-right moon.
 for(const r of glints)row.push(r.x-viewport.width*.8,r.y,r.w,r.alpha);
 expected.push(row);
}
const lua=`package.path='./?.lua;'..package.path
local m=require('shared.scenery.water.motion');local rig=require('shared.scenery.water.rig');local s=m.new()
local levels={.35,.75,0,.2,1};local dts={1/60,1/120,.025,.013,.15}
for i=0,1199 do
 m.set_level(s,levels[math.floor(i/120)%#levels+1]);m.step(s,dts[i%#dts+1]);local v=m.values(s)
 local row={m.base_y(s)}
 for x=0,480,8 do row[#row+1]=v['water_y_'..((x-rig.min_x)/rig.step)] end
 for j=0,rig.reflections-1 do
  row[#row+1]=v['water_reflect_x_'..j]-rig.moon_x;row[#row+1]=v['water_reflect_y_'..j]
  row[#row+1]=v['water_reflect_width_'..j];row[#row+1]=v['water_reflect_alpha_'..j]
 end
 for j,n in ipairs(row) do row[j]=string.format('%.15g',n) end
 print(table.concat(row,' '))
end`;
const rows=execFileSync(process.env.DEFOLD_LUAJIT||'luajit',['-e',lua],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
if(rows.length!==expected.length)throw Error('Water parity frame count differs');
for(const [i,row] of rows.entries()){
 const values=row.split(' ').map(Number);
 if(values.length!==expected[i].length)throw Error('Water parity channel count differs');
 for(const [j,value] of values.entries())if(!Number.isFinite(value)||Math.abs(value-expected[i][j])>1e-8)
  throw Error(`Water frame ${i}, channel ${j}: ${value} differs from legacy ${expected[i][j]}`);
}
console.log('1200 mixed-dt frames match legacy drawWater: 8px ripple samples, opposite phase speeds, palette/stroke and 14 lunar glints across five water levels.');
