#!/usr/bin/env python3
"""Compile the original SVG's vector paths to Rive 7, without rasterizing.

Uses the public Rive runtime object/property schema (extension-rive 13.2.2).
Geometry remains cubic Beziers; dynamic Rive nodes are bound to numeric channels
so Lua can preserve the JS animation phase exactly, including release/coasting.
Regeneration needs fontTools; runtime and normal Bob builds use the committed .riv.
"""
from pathlib import Path
import json, math, re, struct, xml.etree.ElementTree as ET
from fontTools.svgLib.path import parse_path
from fontTools.pens.recordingPen import RecordingPen
from fontTools.misc.transform import Transform, Identity
ROOT = Path(__file__).resolve().parent.parent
# Public Rive property wire types: uvarint, float32, string, bytes, ARGB32.
FLOAT = {7,8,11,12,13,14,15,16,17,18,24,25,47,84,85,86,87,575}
STRING = {4,55,557}
BYTES = {588}
COLOR = {37}
def var(value):
    value=int(value); out=bytearray()
    while value>127:out.append((value&127)|128);value>>=7
    out.append(value);return bytes(out)
def encode(key,value):
    if key in FLOAT:return struct.pack('<f',value)
    if key in STRING or key in BYTES:
        value=value.encode() if isinstance(value,str) else bytes(value)
        return var(len(value))+value
    if key in COLOR:return struct.pack('<I',value)
    return var(value)
class File:
    def __init__(self):self.data=bytearray(b'RIVE'+var(7)+var(0)+var(0)+var(0));self.index=0
    def obj(self,kind,props=None,component=False):
        self.data+=var(kind)
        for k,v in (props or {}).items():self.data+=var(k)+encode(k,v)
        self.data+=b'\0'
        if component:self.index+=1;return self.index-1
    def node(self,name,parent=0,x=0,y=0,rotation=0,sx=1,sy=1,opacity=1):
        return self.obj(2,{4:name,5:parent,13:x,14:y,15:rotation,16:sx,17:sy,18:opacity},True)
    def bind(self,key,channel):
        self.obj(447,{586:key,588:var(0)+var(channel)})

def transform(value):
    t=Identity
    for name,args in re.findall(r'(\w+)\(([^)]*)\)',value or ''):
        a=[float(x) for x in re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',args)]
        if name=='matrix':v=Transform(*a)
        elif name=='translate':v=Identity.translate(a[0],a[1] if len(a)>1 else 0)
        elif name=='scale':v=Identity.scale(a[0],a[1] if len(a)>1 else a[0])
        elif name=='rotate':
            v=Identity
            if len(a)>1:v=v.translate(a[1],a[2])
            v=v.rotate(math.radians(a[0]))
            if len(a)>1:v=v.translate(-a[1],-a[2])
        else:raise ValueError(name)
        t=t.transform(v)
    return t

def contours(d,t):
    pen=RecordingPen();parse_path(d,pen);paths=[];vertices=[]
    def add(point):vertices.append({'p':t.transformPoint(point),'i':None,'o':None})
    def flush(closed):
        nonlocal vertices
        if not vertices:return
        if len(vertices)>1 and math.dist(vertices[0]['p'],vertices[-1]['p'])<1e-5:
            vertices[0]['i']=vertices[-1]['i'];vertices.pop()
        paths.append((vertices,closed));vertices=[]
    for op,points in pen.value:
        if op=='moveTo':flush(False);add(points[0])
        elif op=='lineTo':add(points[0])
        elif op=='curveTo':
            vertices[-1]['o']=t.transformPoint(points[0]);add(points[2]);vertices[-1]['i']=t.transformPoint(points[1])
        elif op=='qCurveTo':
            # SVG parser emits one quadratic segment at a time.
            p0=vertices[-1]['p'];q=t.transformPoint(points[0]);p1=t.transformPoint(points[1])
            vertices[-1]['o']=tuple(p0[i]+(q[i]-p0[i])*2/3 for i in (0,1));add(points[1])
            vertices[-1]['i']=tuple(p1[i]+(q[i]-p1[i])*2/3 for i in (0,1))
        elif op in ('closePath','endPath'):flush(op=='closePath')
        else:raise ValueError(op)
    flush(False);return paths

def color(value):
    assert value.startswith('#') and len(value)==7,value
    return 0xff000000|int(value[1:],16)

def draw_path(f,element,parent):
    shape=f.obj(3,{5:parent,18:float(element.get('opacity','1'))},True)
    for points,closed in contours(element.get('d'),transform(element.get('transform'))):
        path=f.obj(16,{5:shape,32:int(closed)},True)
        for vertex_index,v in enumerate(points):
            x,y=v['p'];props={5:path,24:x,25:y}
            for handle,angle_key,distance_key in [('i',84,85),('o',86,87)]:
                p=v[handle]
                if p:
                    dx,dy=p[0]-x,p[1]-y;props[angle_key]=math.atan2(dy,dx);props[distance_key]=math.hypot(dx,dy)
            f.obj(6,props,True)
            if element.get('data-mouth') and vertex_index in (1,2):
                f.bind(24,12+(vertex_index-1)*2);f.bind(25,13+(vertex_index-1)*2)
    for attr,kind in [('fill',20),('stroke',24)]:
        value=element.get(attr,'#000000' if attr=='fill' else 'none')
        if value=='none':continue
        props={5:shape}
        if kind==20:props[40]=0 if element.get('fill-rule','nonzero')=='nonzero' else 1
        else:
            props.update({47:float(element.get('stroke-width','1')),48:{'butt':0,'round':1,'square':2}.get(element.get('stroke-linecap'),0),49:{'miter':0,'round':1,'bevel':2}.get(element.get('stroke-linejoin'),0)})
        paint=f.obj(kind,props,True);f.obj(18,{5:paint,37:color(value)},True)

def build():
    f=File();f.obj(23)
    channels={'wing_front':0,'wing_back':0,'wing_scale':1,'eye_open':1,'eye_lid':0,'upper_beak':0,'lower_beak':0,'cheek_scale':1,'cheek_y':282,'mouth_open':0,'eye_normal':1,'eye_white':0,'mouth_x1':74,'mouth_y1':-8,'mouth_x2':70,'mouth_y2':6}
    f.obj(435,{557:'BirdControls'})
    for name in channels:f.obj(431,{557:name})
    f.obj(437,{4:'Default',566:0})
    for i,value in enumerate(channels.values()):f.obj(442,{554:i,575:value})
    f.obj(1,{4:'NightlyBird',7:560,8:560,583:0,236:0},True)
    root=f.node('svg-origin',x=20,y=40)
    source=ET.parse(ROOT/'assets/svg/characters/bird.svg').getroot()
    ids={g.get('id'):g for g in source if g.get('id')}
    order=['wing-back','body','wing-front-0','wing-front-1','wing-front-2','wing-front-3','crest','cheek','eye-left','eye-left-white','eye-left-lid','eye-right','eye-right-white','eye-right-lid','eyebrows','mouth','beak-upper','beak-lower']
    for key in reversed(order):
        group=ids[key]
        # Outer nodes are exactly the pivots and transforms in bird-painter.js.
        if key.startswith('wing-front'):
            parent=f.node(key+'-pivot',root,300,268);f.bind(15,0)
            inner=f.node(key+'-offset',parent,-300,-268)
        else:inner=root
        group_t=transform(group.get('transform'))
        a,b,c,d,x,y=group_t
        angle=math.atan2(b,a);sx=math.hypot(a,b);sy=(a*d-b*c)/sx
        if key=='mouth':x,y=420,326
        node=f.node(key,inner,x,y,angle,sx,sy,0 if key in ['mouth','eye-left-lid','eye-right-lid','eye-left-white','eye-right-white'] else 1)
        if key.startswith('wing-front'):f.bind(16,2)
        elif key=='wing-back':f.bind(15,1)
        elif key in ('eye-left','eye-right'):
            f.bind(17,3);f.bind(18,10)
        elif key.endswith('-white'):
            f.bind(17,3);f.bind(18,11)
        elif key.endswith('-lid'):f.bind(18,4)
        elif key=='beak-upper':f.bind(15,5)
        elif key=='beak-lower':f.bind(15,6)
        elif key=='cheek':f.bind(16,7);f.bind(17,7);f.bind(14,8)
        elif key=='mouth':
            f.bind(18,9)
        for child in reversed(list(group)):
            if child.tag.endswith('path'):
                if key=='mouth':
                    child.set('data-mouth','1');child.set('transform','');child.set('d','M0 0 L74 -8 L70 6 Z')
                draw_path(f,child,node)
    f.obj(53,{55:'Bird'})
    f.obj(57)
    f.obj(63);f.obj(62);f.obj(64)
    dest=ROOT/'defold/rive-demo/bird.riv';dest.write_bytes(f.data)
    print(f'{dest}: {len(f.data)} bytes, {f.index} vector components, zero raster images')
    (ROOT/'defold/rive-demo/channels.json').write_text(json.dumps(list(channels),indent=2)+'\n')
if __name__=='__main__':build()
