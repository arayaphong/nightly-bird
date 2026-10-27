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
FLOAT = {7,8,11,12,13,14,15,16,17,18,24,25,33,34,35,39,42,46,47,84,85,86,87,575}
STRING = {4,55,557}
BYTES = {588}
COLOR = {37,38}
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
        # Only a closed Rive path reconnects its final vertex to the first.
        # SVG ellipses here return to the start without Z: keep their endpoint
        # or the final curved segment becomes a straight fill/stroke edge.
        if closed and len(vertices)>1 and math.dist(vertices[0]['p'],vertices[-1]['p'])<1e-5:
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
    if value.startswith('rgba('):
        r,g,b,a=map(float,value[5:-1].split(','))
        return round(a*255)<<24|int(r)<<16|int(g)<<8|int(b)
    assert value.startswith('#') and len(value)==7,value
    return 0xff000000|int(value[1:],16)

def draw_path(f,element,parent,definitions=None,vertex_channels=None,gradient_channels=None):
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
            if vertex_channels:
                channel_x,channel_y=vertex_channels[vertex_index]
                if channel_x is not None:f.bind(24,channel_x)
                if channel_y is not None:f.bind(25,channel_y)
            if element.get('data-mouth') and vertex_index in (1,2):
                f.bind(24,12+(vertex_index-1)*2);f.bind(25,13+(vertex_index-1)*2)
    for attr,kind in [('fill',20),('stroke',24)]:
        value=element.get(attr,'#000000' if attr=='fill' else 'none')
        if value=='none':continue
        props={5:shape}
        if kind==20:props[40]=0 if element.get('fill-rule','nonzero')=='nonzero' else 1
        else:
            props.update({47:float(element.get('stroke-width','1')),48:{'butt':0,'round':1,'square':2}.get(element.get('stroke-linecap'),0),49:{'miter':0,'round':1,'bevel':2}.get(element.get('stroke-linejoin'),0)})
        paint=f.obj(kind,props,True)
        if value.startswith('url(#'):
            gradient=definitions[value[5:-1]]
            assert gradient.get('gradientUnits')=='userSpaceOnUse'
            t=transform(element.get('transform')).transform(transform(gradient.get('gradientTransform')))
            radial=gradient.tag.endswith('radialGradient')
            inner=0
            if radial:
                # Rive radial paints are concentric. Keep the SVG focal point
                # and its inner stop radius for small vector highlights.
                cx=float(gradient.get('fx',gradient.get('cx',0)))
                cy=float(gradient.get('fy',gradient.get('cy',0)))
                radius=float(gradient.get('r',1));inner=float(gradient.get('fr',0))/radius
                x1,y1=t.transformPoint((cx,cy));x2,y2=t.transformPoint((cx+radius,cy))
            else:
                assert gradient.tag.endswith('linearGradient')
                x1,y1=t.transformPoint((float(gradient.get('x1',0)),float(gradient.get('y1',0))))
                x2,y2=t.transformPoint((float(gradient.get('x2',1)),float(gradient.get('y2',0))))
            grad=f.obj(17 if radial else 22,{5:paint,42:x1,33:y1,34:x2,35:y2},True)
            if gradient_channels:
                for key,channel in gradient_channels.get(value[5:-1],{}).items():f.bind(key,channel)
            if inner:f.obj(19,{5:grad,38:color(list(gradient)[0].get('stop-color')),39:0},True)
            for stop in gradient:
                offset=stop.get('offset','0')
                pos=float(offset[:-1])/100 if offset.endswith('%') else float(offset)
                f.obj(19,{5:grad,38:color(stop.get('stop-color')),39:inner+(1-inner)*pos},True)
        else:f.obj(18,{5:paint,37:color(value)},True)
    return shape

def path(d,fill='none',**attrs):
    return ET.Element('path',{'d':d,'fill':fill,**{k.replace('_','-'):str(v) for k,v in attrs.items()}})

def draw_group(f,group,parent,definitions):
    """Retain nested SVG clipping and gradients as native Rive components."""
    for child in reversed(list(group)):
        if child.tag.endswith('path'):draw_path(f,child,parent,definitions)
        elif child.tag.endswith('g'):
            t=transform(child.get('transform'))
            a,b,c,d,x,y=t
            sx=math.hypot(a,b)
            node=f.node('svg-group',parent,x,y,math.atan2(b,a),sx,(a*d-b*c)/sx)
            clip=child.get('clip-path')
            if clip:
                source=f.node('clip-source',parent)
                for p in definitions[clip[5:-1]]:
                    p=ET.fromstring(ET.tostring(p))
                    p.set('fill','none');p.set('stroke','none')
                    draw_path(f,p,source)
                f.obj(42,{5:node,92:source,93:0,94:1},True)
            draw_group(f,child,node,definitions)

def asset(name):
    svg=ET.parse(ROOT/f'assets/svg/items/{name}.svg').getroot()
    return svg,{g.get('id'):g for g in svg.iter() if g.get('id')}

def start_file(channels,name,width,height,view_model='BirdControls',clip=True):
    f=File();f.obj(23)
    f.obj(435,{557:view_model})
    for channel in channels:f.obj(431,{557:channel})
    f.obj(437,{4:'Default',566:0})
    for i,value in enumerate(channels.values()):f.obj(442,{554:i,575:value})
    props={4:name,7:width,8:height,583:0,236:0}
    if not clip:props[196]=0
    f.obj(1,props,True)
    return f

ARTWORK_PATHS={'bird': 'shared/characters/red_bird/visual.riv', 'fish': 'shared/characters/fish/visual.riv', 'hawk': 'shared/characters/hawk/visual.riv', 'equipment-icons': 'studio/characters/red_bird/equipment_icons.riv', 'gallery': 'studio/characters/gallery/visual.riv', 'firefly': 'shared/objects/firefly/visual.riv', 'balloon': 'shared/objects/balloon/visual.riv', 'cloud': 'shared/objects/rain_cloud/visual.riv'}

def finish_file(f,name,state_machine='Bird',destination=None):
    f.obj(53,{55:state_machine});f.obj(57);f.obj(63);f.obj(62);f.obj(64)
    dest=ROOT/(destination or ARTWORK_PATHS[name]);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(f.data)
    print(f'{dest}: {len(f.data)} bytes, {f.index} vector components, zero raster images')

ITEMS=('magnet','gun','helmet','suit')

def equipment(f,key,root,channels):
    node=f.node(key,root,opacity=0);f.bind(18,channels.index('equip_'+('gun' if key=='sling' else key)))
    if key=='sling':
        parent=f.node('sling-mount',node,280,318,sx=487/420,sy=487/420)
        draw_path(f,path('M-48 -35 Q-35 18 22 91',stroke='#242b3d',stroke_width=9,stroke_linecap='round'),parent)
        return
    if key=='field':
        for i in range(3):
            ring=f.node('field-ring-'+str(i),node,280,318)
            f.bind(16,channels.index(f'field_scale_{i}'));f.bind(17,channels.index(f'field_scale_{i}'))
            f.bind(18,channels.index(f'field_alpha_{i}'))
            draw_path(f,path('M260 0 A260 260 0 0 1 -260 0 A260 260 0 0 1 260 0 Z',stroke='#ff7878',stroke_width=3),ring)
        return
    if key in ('magnet','gun','helmet'):
        # Same ratio as bird-painter.js: item r/100 vs bird r*4.2/487.
        ratio=487/420
        x,y=(280-.62*487/4.2,318+1.2*487/4.2) if key=='magnet' else (280,318)
        parent=f.node(key+'-mount',node,x,y,sx=ratio,sy=ratio)
        _,defs=asset(key);draw_group(f,defs[key],parent,defs)
        return
    _,defs=asset('suit');draw_group(f,defs[key],node,defs)

def icons():
    channels={'equip_'+k:0 for k in ITEMS}
    f=start_file(channels,'Equipment',480,800)
    for i,key in enumerate(ITEMS):
        root=f.node(key+'-card',x=75+110*i,y=800-340)
        # SVG drawing order is reversed in the runtime component stream.
        active=f.node(key+'-active',root,opacity=0);f.bind(18,i)
        draw_path(f,path('M-47 -53 L47 -53 L47 53 L-47 53 Z',stroke='#bdff59',stroke_width=2.5),active)
        svg,defs=asset(key)
        x,y,w,h=map(float,svg.get('viewBox').split())
        scale=min(52/w,46/h)
        parent=f.node(key+'-icon',root,-(x+w/2)*scale,-15-(y+h/2)*scale,sx=scale,sy=scale)
        if key=='suit':
            draw_group(f,defs['hood'],parent,defs);draw_group(f,defs['coat'],parent,defs)
        else:draw_group(f,defs[key],parent,defs)
        draw_path(f,path('M-47 -53 L47 -53 L47 53 L-47 53 Z','#152136',stroke='#344965',stroke_width=1),root)
    finish_file(f,'equipment-icons')

def build():
    channels={'wing_front':0,'wing_back':0,'wing_scale':1,'eye_open':1,'eye_lid':0,'upper_beak':0,'lower_beak':0,'cheek_scale':1,'cheek_y':282,'mouth_open':0,'eye_normal':1,'eye_white':0,'mouth_x1':74,'mouth_y1':-8,'mouth_x2':70,'mouth_y2':6}
    channels.update({'equip_'+k:0 for k in (*ITEMS,'coat','hood','field')})
    for i in range(3):channels.update({f'field_scale_{i}':1,f'field_alpha_{i}':0})
    channels['crest_visible']=1
    f=start_file(channels,'NightlyBird',560,560)
    root=f.node('svg-origin',x=20,y=40)
    source=ET.parse(ROOT/'assets/svg/characters/bird.svg').getroot()
    ids={g.get('id'):g for g in source if g.get('id')}
    # The original feet are already paths in body. Draw the magnet underneath
    # that group so those same toes grip it; never add a second set of feet.
    order=['field','wing-back','magnet','body','coat','sling','wing-front-0','wing-front-1','wing-front-2','wing-front-3','crest','cheek','hood','eye-left','eye-left-white','eye-left-lid','eye-right','eye-right-white','eye-right-lid','eyebrows','mouth','beak-upper','beak-lower','gun','helmet']
    for key in reversed(order):
        if key in (*ITEMS,'coat','hood','field','sling'):
            equipment(f,key,root,list(channels));continue
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
        elif key=='crest':f.bind(18,list(channels).index('crest_visible'))
        elif key=='mouth':
            f.bind(18,9)
        for child in reversed(list(group)):
            if child.tag.endswith('path'):
                if key=='mouth':
                    child.set('data-mouth','1');child.set('transform','');child.set('d','M0 0 L74 -8 L70 6 Z')
                draw_path(f,child,node)
    finish_file(f,'bird')
    (ROOT/'shared/characters/red_bird/channels.json').write_text(json.dumps(list(channels),indent=2)+'\n')
    icons()
if __name__=='__main__':build()
