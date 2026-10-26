"""Port drawWater's ripple line, depth colors and lunar shimmer to native Rive.

Reference: legacy/src/visuals/environment-painter.js, createEnvironmentPainter.
Star reflections are intentionally omitted: Studio water must hide stars/dust.
"""
import json
import math
import xml.etree.ElementTree as ET
from defold_rive_bird import ROOT,draw_path,path

WIDTH=1280
HEIGHT=720
POINTS=163
STEP=8
MIN_X=-8
BASE_Y=576
MOON_X=1200
REFLECTIONS=14
WAVES=[(2.2,.03,2.4,0),(1.5,.011,-1.3,0)]
LINE_COLOR='rgba(170,215,255,.55)'
LINE_WIDTH=2
TOP_COLOR='#123a5c'
BOTTOM_COLOR='#030914'


def sample(x):
    return BASE_Y+sum(a*math.sin(k*x+phase) for a,k,rate,phase in WAVES)


def channels():
    out={'water_alpha':0,'water_gradient_y':BASE_Y}
    for i in range(POINTS):out.update({f'water_x_{i}':MIN_X+i*STEP,f'water_y_{i}':sample(MIN_X+i*STEP)})
    for i in range(REFLECTIONS):
        width=18+math.sin(i)*8+i*1.5
        out.update({f'water_reflect_x_{i}':MOON_X-width/2+math.sin(i*1.3)*6,
                    f'water_reflect_y_{i}':BASE_Y+8+i*(HEIGHT-BASE_Y)/14,
                    f'water_reflect_width_{i}':width,f'water_reflect_alpha_{i}':.28*(1-i/14)})
    return out


def add_water(f,keys):
    root=f.node('water',opacity=0);f.bind(18,keys['water_alpha'])
    samples=[(MIN_X+i*STEP,sample(MIN_X+i*STEP)) for i in range(POINTS)]
    d='M'+' L'.join(f'{x} {y}' for x,y in samples)
    vertices=[(keys[f'water_x_{i}'],keys[f'water_y_{i}']) for i in range(POINTS)]
    # Match legacy's 8px samples and 2px translucent surface stroke exactly.
    draw_path(f,path(d,stroke=LINE_COLOR,stroke_width=LINE_WIDTH),root,vertex_channels=vertices)
    # Legacy's 14 animated horizontal moon-reflection bars, aligned to our moon.
    for i in range(REFLECTIONS):
        width=18+math.sin(i)*8+i*1.5
        node=f.node(f'lunar-shimmer-{i}',root,MOON_X-width/2+math.sin(i*1.3)*6,
                    BASE_Y+8+i*(HEIGHT-BASE_Y)/14,sx=width,opacity=.28*(1-i/14))
        for prop,key in ((13,'x'),(14,'y'),(16,'width'),(18,'alpha')):
            f.bind(prop,keys[f'water_reflect_{key}_{i}'])
        draw_path(f,path('M0 0 H1 V2 H0 Z','#ffeec8'),node)
    gradient=ET.Element('linearGradient',{'id':'water-depth','gradientUnits':'userSpaceOnUse',
                                         'x1':'0','y1':str(BASE_Y),'x2':'0','y2':str(HEIGHT)})
    for offset,color in [('0',TOP_COLOR),('1',BOTTOM_COLOR)]:
        ET.SubElement(gradient,'stop',{'offset':offset,'stop-color':color})
    body=d+f' L{samples[-1][0]} {HEIGHT+24} L{samples[0][0]} {HEIGHT+24} Z'
    # Adapt only the opaque upper edge to the ripple line for particle masking.
    draw_path(f,path(body,'url(#water-depth)'),root,{'water-depth':gradient},
              vertex_channels=vertices+[(keys[f'water_x_{POINTS-1}'],None),(keys['water_x_0'],None)],
              gradient_channels={'water-depth':{33:keys['water_gradient_y']}})


def write_rig():
    text=f'-- Ported from legacy environment-painter.js drawWater; x-right/y-down.\nreturn {{width={WIDTH},height={HEIGHT},points={POINTS},step={STEP},min_x={MIN_X},base_y={BASE_Y},moon_x={MOON_X},reflections={REFLECTIONS},waves={{\n'
    for a,k,rate,phase in WAVES:
        text+=f'    {{amplitude={a:.17g},k={k:.17g},rate={rate:.17g},phase={phase:.17g}}},\n'
    (ROOT/'shared/scenery/water/rig.lua').write_text(text+'}}\n')
    spec=dict(width=WIDTH,height=HEIGHT,points=POINTS,step=STEP,min_x=MIN_X,base_y=BASE_Y,moon_x=MOON_X,
              reflections=REFLECTIONS,line_color=LINE_COLOR,line_width=LINE_WIDTH,
              top_color=TOP_COLOR,bottom_color=BOTTOM_COLOR)
    (ROOT/'shared/scenery/water/rig.json').write_text(json.dumps(spec,indent=2)+'\n')
