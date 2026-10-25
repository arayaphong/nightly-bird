#!/usr/bin/env python3
"""Export the original fish SVG, its layers and pivots as real Rive vectors."""
import json
import math
import xml.etree.ElementTree as ET
from defold_rive_bird import ROOT, start_file, finish_file, draw_group, transform


def build():
    channels={'angle':0,'belly':1,'tail':0,'fin':0,'gill_x':1,'gill_y':1}
    f=start_file(channels,'NightlyFish',1536,1024,'FishControls')
    # fish-painter.js mirrors the left-facing artwork around FISH_AX/FISH_AY.
    facing=f.node('facing',x=768,y=512,sx=-1)
    f.bind(15,0);f.bind(17,1)
    root=f.node('svg-origin',facing,-830,-500)
    svg=ET.parse(ROOT/'assets/svg/characters/fish.svg').getroot()
    definitions={e.get('id'):e for e in svg.iter() if e.get('id')}
    parts=[g for g in svg if g.get('data-sprite') is not None]
    for part in reversed(parts):
        a,b,c,d,x,y=transform(part.get('transform'))
        sx=math.hypot(a,b)
        node=f.node(part.get('id'),root,x,y,math.atan2(b,a),sx,(a*d-b*c)/sx)
        role=part.get('data-role')
        if role=='tail':f.bind(15,2)
        elif role=='fin':f.bind(15,3)
        elif role=='gill':f.bind(16,4);f.bind(17,5)
        draw_group(f,part,node,definitions)
    finish_file(f,'fish','Swim')
    (ROOT/'shared/characters/fish/channels.json').write_text(json.dumps(list(channels),indent=2)+'\n')


if __name__=='__main__':build()
