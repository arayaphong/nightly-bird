#!/usr/bin/env python3
"""Generate the landscape presentation from the shared SVG/vector painters."""
from defold_rive_bird import ROOT,ITEMS,asset,draw_group,draw_path,path,start_file,finish_file as write_file
from defold_rive_gallery import svg_asset,paint_svg,firefly,balloon,cloud,DROPS,BOLT_POINTS,FORK_POINTS

def finish_file(f,name,state_machine='Bird'):
    write_file(f,name,state_machine,destination='shared/display/artwork/landscape/'+name+'.riv')

def icons():
    channels={'equip_'+k:0 for k in ITEMS}
    f=start_file(channels,'Equipment',1280,720)
    for i,key in enumerate(ITEMS):
        root=f.node(key+'-card',x=850+(i%2)*230,y=720-(470-(i//2)*140))
        # SVG drawing order is reversed in the runtime component stream.
        active=f.node(key+'-active',root,opacity=0);f.bind(18,i)
        draw_path(f,path('M-100 -58 L100 -58 L100 58 L-100 58 Z',stroke='#bdff59',stroke_width=2.5),active)
        svg,defs=asset(key)
        x,y,w,h=map(float,svg.get('viewBox').split())
        scale=min(52/w,46/h)
        parent=f.node(key+'-icon',root,-(x+w/2)*scale,-15-(y+h/2)*scale,sx=scale,sy=scale)
        if key=='suit':
            draw_group(f,defs['hood'],parent,defs);draw_group(f,defs['coat'],parent,defs)
        else:draw_group(f,defs[key],parent,defs)
        draw_path(f,path('M-100 -58 L100 -58 L100 58 L-100 58 Z','#152136',stroke='#344965',stroke_width=1),root)
    finish_file(f,'equipment-icons')

def gallery():
    f=start_file({'ready':1},'Characters',1280,720,'GalleryControls')
    root=f.node('gallery');f.bind(18,0)
    entries=[('bird','characters/bird',(-20,-40,560,500)),
             ('fish','characters/fish',(0,0,1536,1024)),
             ('hawk','characters/hawk',(0,0,1400,1100))]
    for i,key in enumerate(('bird','fish','hawk','firefly','balloon','cloud')):
        x,y=260+(i%3)*380,720-(405-(i//3)*205)
        icon=f.node(key+'-icon',root,x,y-25)
        if i<3:
            _,source,bounds=entries[i];bx,by,w,h=bounds;scale=min(156/w,118/h)
            svg,defs=svg_asset(source)
            if key=='fish':
                fitted=f.node('fit',icon,(bx+w/2)*scale,-(by+h/2)*scale,sx=-scale,sy=scale)
            else:fitted=f.node('fit',icon,-(bx+w/2)*scale,-(by+h/2)*scale,sx=scale,sy=scale)
            paint_svg(f,svg,defs,fitted)
        elif key=='firefly':firefly(f,f.node('fit',icon,sx=5,sy=5))
        elif key=='balloon':balloon(f,f.node('fit',icon,0,-18,sx=30,sy=30))
        else:cloud(f,f.node('fit',icon,0,-20,sx=.58,sy=.58))
        draw_path(f,path(f'M{x-160} {y-90} L{x+160} {y-90} L{x+160} {y+90} L{x-160} {y+90} Z',
                         '#152136',stroke='#344965',stroke_width=1),root)
    finish_file(f,'gallery','Gallery')

def nature():
    previews={
        'firefly':('Firefly',9,330,{'show_firefly':0,'wing_left':1,'wing_right':1,'lamp_mix':.5,'glow_scale':1,'glow_alpha':.6}),
        'balloon':('Balloon',90,300,{'show_balloon':0,'balloon_y':300,'balloon_rotation':0}),
        'cloud':('RainCloud',1.7,300,{'show_cloud':0,'cloud_y':0,'bolt_alpha':0,'flash_alpha':0,'dark_alpha':0,'strike_glow_x':0,'strike_glow_y':45}),
    }
    for name,(artboard,scale,y,channels) in previews.items():
        if name=='cloud':
            for line,count in (('bolt',BOLT_POINTS),('fork',FORK_POINTS)):
                for i in range(count):channels.update({f'{line}_x_{i}':0,f'{line}_y_{i}':23+i*15})
            for i,(x,phase) in enumerate(DROPS):
                channels.update({f'rain_x_{i}':x,f'rain_y_{i}':36+phase*100,f'rain_alpha_{i}':.7})
        keys=list(channels);f=start_file(channels,artboard,1280,720,artboard+'Controls',clip=name!='cloud')
        node=f.node(name,x=640,y=y,sx=scale,sy=scale,opacity=0);f.bind(18,keys.index('show_'+name))
        if name=='firefly':firefly(f,node,keys)
        elif name=='balloon':
            f.bind(14,keys.index('balloon_y'));f.bind(15,keys.index('balloon_rotation'));balloon(f,node)
        else:cloud(f,node,keys)
        finish_file(f,name,'Preview')

if __name__=='__main__':icons();gallery();nature()
