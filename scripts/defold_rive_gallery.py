#!/usr/bin/env python3
"""Build a static vector character grid and three small animated previews."""
import math,colorsys
import xml.etree.ElementTree as ET
from defold_rive_bird import ROOT,start_file,finish_file,draw_group,draw_path,path,transform

DROPS=[(-62+i*7.3,(i*.173)%1) for i in range(18)]
BOLT_POINTS=8
FORK_POINTS=3

def svg_asset(relative):
    svg=ET.parse(ROOT/f'assets/svg/{relative}.svg').getroot()
    return svg,{g.get('id'):g for g in svg.iter() if g.get('id')}

def radial(name,r,core,edge,fx=0,fy=0):
    g=ET.Element('radialGradient',{'id':name,'gradientUnits':'userSpaceOnUse','fx':str(fx),'fy':str(fy),'r':str(r)})
    ET.SubElement(g,'stop',{'offset':'0','stop-color':core})
    ET.SubElement(g,'stop',{'offset':'1','stop-color':edge})
    return g

def ellipse(r,fill):
    return path(f'M{r} 0 A{r} {r} 0 0 1 {-r} 0 A{r} {r} 0 0 1 {r} 0 Z',fill)

def paint_svg(f,svg,defs,parent):
    for group in reversed([g for g in svg if g.get('data-sprite') is not None and g.get('display')!='none']):
        a,b,c,d,x,y=transform(group.get('transform'));sx=math.hypot(a,b)
        node=f.node(group.get('id'),parent,x,y,math.atan2(b,a),sx,(a*d-b*c)/sx)
        draw_group(f,group,node,defs)

def cloud(f,parent,channels=None):
    svg,defs=svg_asset('environment/rain-cloud')
    # Foreground first: an upward or nearby shot must remain visible over the
    # cloud, as well as reaching targets below it.
    if channels:
        bolt=f.node('lightning',parent,opacity=0);f.bind(18,channels.index('bolt_alpha'))
        lines=[]
        for name,count in (('bolt',BOLT_POINTS),('fork',FORK_POINTS)):
            d='M0 23 '+' '.join(f'L0 {23+i*15}' for i in range(1,count))
            bindings=[(channels.index(f'{name}_x_{i}'),channels.index(f'{name}_y_{i}')) for i in range(count)]
            lines.append((d,bindings))
        for stroke,width in (('#fff8dd',1.8),('rgba(150,195,255,.35)',6)):
            for d,bindings in lines:
                draw_path(f,path(d,stroke=stroke,stroke_width=width,stroke_linecap='round',stroke_linejoin='round'),bolt,vertex_channels=bindings)
    body=f.node('cloud-body',parent)
    if channels:f.bind(14,channels.index('cloud_y'))
    if channels:
        dark=f.node('cloud-dark',body,opacity=0);f.bind(18,channels.index('dark_alpha'))
        silhouette=ET.fromstring(ET.tostring(defs['silhouette']))
        silhouette.set('fill','#080e1f');draw_path(f,silhouette,dark)
        flash=f.node('cloud-flash',body,opacity=0);f.bind(18,channels.index('flash_alpha'))
        silhouette=ET.fromstring(ET.tostring(defs['silhouette']))
        silhouette.set('fill','rgba(197,213,255,.5)');draw_path(f,silhouette,flash)
    draw_group(f,svg,body,defs)
    for i,(x,phase) in enumerate(DROPS):
        node=f.node('rain-'+str(i),parent,x,36+phase*100)
        if channels:
            f.bind(13,channels.index('rain_x_'+str(i)));f.bind(14,channels.index('rain_y_'+str(i)))
            f.bind(18,channels.index('rain_alpha_'+str(i)))
        draw_path(f,path('M0 0 L-3 9',stroke='rgba(150,175,220,.55)',stroke_width=1.2,stroke_linecap='round'),node)
    if channels:
        glow=f.node('lightning-glow',parent,0,45,opacity=0);f.bind(18,channels.index('flash_alpha'))
        f.bind(13,channels.index('strike_glow_x'));f.bind(14,channels.index('strike_glow_y'))
        defs={'flash':radial('flash',140,'rgba(140,175,255,.32)','rgba(80,130,255,0)')}
        draw_path(f,ellipse(140,'url(#flash)'),glow,defs)

def firefly_channels():
    return dict(show_firefly=0,wing_left=1,wing_right=1,lamp_mix=.5,glow_scale=1,glow_alpha=.6,
                normal_alpha=1,**{f'rainbow_alpha_{i}':0 for i in range(6)})

def rainbow_color(hue,lightness,alpha=1):
    rgb=[round(c*255) for c in colorsys.hls_to_rgb((hue%360)/360,lightness,1)]
    return f'rgba({rgb[0]},{rgb[1]},{rgb[2]},{alpha})'

def firefly(f,parent,channels=None):
    svg,defs=svg_asset('items/firefly')
    for g in reversed([g for g in svg if g.get('data-sprite') is not None]):
        a,b,c,d,x,y=transform(g.get('transform'))
        node=f.node(g.get('id'),parent,x,y,math.atan2(b,a))
        if channels and g.get('id') in ('wing-left','wing-right'):
            f.bind(17,channels.index(g.get('id').replace('-','_')))
        if channels and g.get('id')=='lamp':
            for i in range(6):
                layer=f.node('lamp-rainbow-'+str(i),node,opacity=0);f.bind(18,channels.index(f'rainbow_alpha_{i}'))
                for p in reversed(list(g)):
                    q=ET.fromstring(ET.tostring(p));q.set('fill',rainbow_color(i*60,.7));draw_path(f,q,layer)
            normal=f.node('lamp-normal',node);f.bind(18,channels.index('normal_alpha'))
            yellow=f.node('lamp-yellow',normal,opacity=.5);f.bind(18,channels.index('lamp_mix'))
            for p in reversed(list(g)):
                q=ET.fromstring(ET.tostring(p));q.set('fill','#ffec3c');draw_path(f,q,yellow)
            draw_group(f,g,normal,defs)
            continue
        draw_group(f,g,node,defs)
    radius=24 if channels else 7
    glow=f.node('glow',parent)
    if channels:
        f.bind(16,channels.index('glow_scale'));f.bind(17,channels.index('glow_scale'))
        f.bind(18,channels.index('glow_alpha'))
        for i in range(6):
            layer=f.node('glow-rainbow-'+str(i),glow,opacity=0);f.bind(18,channels.index(f'rainbow_alpha_{i}'))
            gradient=radial('rainbow',radius,rainbow_color(i*60,.85),rainbow_color(i*60+120,.55,0))
            gradient.insert(1,ET.Element('stop',{'offset':'.3','stop-color':rainbow_color(i*60,.6,.58)}))
            draw_path(f,ellipse(radius,'url(#rainbow)'),layer,{'rainbow':gradient})
        glow=f.node('glow-normal',glow);f.bind(18,channels.index('normal_alpha'))
    defs={'glow':radial('glow',radius,'rgba(190,255,90,.8)','rgba(60,220,0,0)')}
    draw_path(f,ellipse(radius,'url(#glow)'),glow,defs)

def balloon(f,parent):
    svg,defs=svg_asset('items/balloon');paint_svg(f,svg,defs,parent)
    draw_path(f,path('M0 1.1 Q-.18 1.8 0 2.5',stroke='rgba(230,230,240,.7)',stroke_width=.014),parent)

def gallery():
    f=start_file({'ready':1},'Characters',480,800,'GalleryControls')
    root=f.node('gallery');f.bind(18,0)
    entries=[('bird','characters/bird',(-20,-40,560,500)),
             ('fish','characters/fish',(0,0,1536,1024)),
             ('hawk','characters/hawk',(0,0,1400,1100))]
    for i,key in enumerate(('bird','fish','hawk','firefly','balloon','cloud')):
        x,y=90+(i%3)*150,800-(500-(i//3)*200)
        icon=f.node(key+'-icon',root,x,y-36)
        if i<3:
            _,source,bounds=entries[i];bx,by,w,h=bounds;scale=min(108/w,94/h)
            svg,defs=svg_asset(source)
            if key=='fish':
                fitted=f.node('fit',icon,(bx+w/2)*scale,-(by+h/2)*scale,sx=-scale,sy=scale)
            else:fitted=f.node('fit',icon,-(bx+w/2)*scale,-(by+h/2)*scale,sx=scale,sy=scale)
            paint_svg(f,svg,defs,fitted)
        elif key=='firefly':firefly(f,f.node('fit',icon,sx=5,sy=5))
        elif key=='balloon':balloon(f,f.node('fit',icon,0,-18,sx=30,sy=30))
        else:cloud(f,f.node('fit',icon,0,-20,sx=.58,sy=.58))
        draw_path(f,path(f'M{x-66} {y-85} L{x+66} {y-85} L{x+66} {y+85} L{x-66} {y+85} Z',
                         '#152136',stroke='#344965',stroke_width=1),root)
    finish_file(f,'gallery','Gallery')

def nature():
    previews={
        'firefly':('Firefly',6,320,firefly_channels()),
        'balloon':('Balloon',90,300,{'show_balloon':0,'balloon_y':300,'balloon_rotation':0}),
        'cloud':('RainCloud',1.7,300,{'show_cloud':0,'cloud_y':0,'bolt_alpha':0,'flash_alpha':0,'dark_alpha':0,'strike_glow_x':0,'strike_glow_y':45}),
    }
    for name,(artboard,scale,y,channels) in previews.items():
        if name=='cloud':
            for line,count in (('bolt',BOLT_POINTS),('fork',FORK_POINTS)):
                for i in range(count):channels.update({f'{line}_x_{i}':0,f'{line}_y_{i}':23+i*15})
            for i,(x,phase) in enumerate(DROPS):
                channels.update({f'rain_x_{i}':x,f'rain_y_{i}':36+phase*100,f'rain_alpha_{i}':.7})
        keys=list(channels);f=start_file(channels,artboard,480,800,artboard+'Controls',clip=name!='cloud')
        node=f.node(name,x=240,y=y,sx=scale,sy=scale,opacity=0);f.bind(18,keys.index('show_'+name))
        if name=='firefly':firefly(f,node,keys)
        elif name=='balloon':
            f.bind(14,keys.index('balloon_y'));f.bind(15,keys.index('balloon_rotation'));balloon(f,node)
        else:cloud(f,node,keys)
        finish_file(f,name,'Preview')
    rows=['-- Generated rain/bolt layout; cloud silhouette: rain-cloud.svg.',
          f'return {{bolt_points={BOLT_POINTS},fork_points={FORK_POINTS},',
          '-- Preview: full 480x800 artboard, including above and beside the cloud.',
          'preview={x=240,y=300,scale=1.7,width=480,height=800},',
          'target={min_x=-240/1.7,max_x=240/1.7,min_y=-300/1.7,max_y=500/1.7},drops={']
    rows.extend(f'    {{x={x:.17g},phase={phase:.17g}}},' for x,phase in DROPS)
    (ROOT/'shared/objects/rain_cloud/rig.lua').write_text('\n'.join(rows+['}}'])+'\n')

if __name__=='__main__':gallery();nature()
