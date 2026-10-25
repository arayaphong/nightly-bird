#!/usr/bin/env python3
"""Export the original hawk flight/dive SVGs and their procedural rig to Rive."""
import copy
import json
import math
import xml.etree.ElementTree as ET
from defold_rive_bird import ROOT, start_file, finish_file, draw_group, transform


def build():
    sources={name:ET.parse(ROOT/f'assets/svg/characters/{name}.svg').getroot()
             for name in ('hawk','hawk-dive')}
    rig={'wings':[], 'blades':[]}
    for name,svg in sources.items():
        for part in svg:
            role=part.get('data-role')
            if role not in ('wing-back','wing-front','blade'):continue
            a,b,c,d,x,y=transform(part.get('transform'))
            data={'id':part.get('id'),'role':role,'x':x,'y':y,'angle':math.atan2(b,a)}
            if role=='blade':
                data.update(targetX=float(part.get('data-target-x')),
                            targetY=float(part.get('data-target-y')),length=float(part.get('data-length')))
                rig['blades'].append(data)
            else:
                data.update(pivotX=float(part.get('data-pivot-x')),pivotY=float(part.get('data-pivot-y')),
                            inset=float(part.get('data-inset')))
                rig['wings'].append(data)
    channels={'flight_visible':1,'dive_visible':0,'wing_rotation':0}
    for i,blade in enumerate(rig['blades']):
        channels[f'blade_{i}_angle']=blade['angle'];channels[f'blade_{i}_scale']=1
    keys=list(channels)
    f=start_file(channels,'NightlyHawk',2000,2000,'HawkControls')
    for name,anchor,opacity in [('hawk-dive',(700,650),0),('hawk',(780,760),1)]:
        svg=sources[name];definitions={e.get('id'):e for e in svg.iter() if e.get('id')}
        root=f.node(name+'-origin',x=1000-anchor[0],y=1000-anchor[1],opacity=opacity)
        f.bind(18,keys.index('dive_visible' if name=='hawk-dive' else 'flight_visible'))
        for part in reversed([g for g in svg if g.get('data-sprite') is not None]):
            a,b,c,d,x,y=transform(part.get('transform'))
            angle=math.atan2(b,a);sx=math.hypot(a,b);sy=(a*d-b*c)/sx
            parent=root;role=part.get('data-role')
            if role in ('wing-back','wing-front'):
                px,py=float(part.get('data-pivot-x')),float(part.get('data-pivot-y'))
                parent=f.node(part.get('id')+'-pivot',root,px,py);f.bind(15,keys.index('wing_rotation'))
                # Rotating this offset with the pivot preserves the JS inset.
                x,y=x-px,y-py
            node=f.node(part.get('id'),parent,x,y,angle,sx,sy)
            if role=='blade':
                i=next(i for i,b in enumerate(rig['blades']) if b['id']==part.get('id'))
                f.bind(15,keys.index(f'blade_{i}_angle'));f.bind(16,keys.index(f'blade_{i}_scale'))
            if name=='hawk-dive' and role=='eye':
                part=copy.deepcopy(part)
                for child in part.iter():
                    if child.get('fill')=='#f2c04a':child.set('fill','#ff5a1e')
            draw_group(f,part,node,definitions)
    finish_file(f,'hawk','Flight')
    dest=ROOT/'rive-demo'
    (dest/'hawk-rig.json').write_text(json.dumps(rig,indent=2)+'\n')
    rows=['-- Generated from hawk-dive.svg by scripts/defold_rive_hawk.py.','return {']
    for b in rig['blades']:
        rows.append('    {'+','.join(f'{k}={b[k]:.17g}' for k in ('x','y','targetX','targetY','length'))+'},')
    (dest/'hawk-rig.lua').write_text('\n'.join(rows+['}'])+'\n')
    (dest/'hawk-channels.json').write_text(json.dumps(keys,indent=2)+'\n')


if __name__=='__main__':build()
