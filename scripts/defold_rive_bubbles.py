#!/usr/bin/env python3
"""Water-owned, reusable vector bubble pool; no raster textures or fish geometry."""
from defold_rive_bird import start_file,finish_file,draw_path,path

CAPACITY=192

def build():
    channels={}
    for i in range(CAPACITY):channels.update({f'bubble_{i}_x':0,f'bubble_{i}_y':0,f'bubble_{i}_alpha':0})
    keys={k:i for i,k in enumerate(channels)}
    f=start_file(channels,'WaterBubbles',1280,720,'WaterBubbleControls',clip=False)
    for i in range(CAPACITY):
        node=f.node(f'bubble-{i}',opacity=0)
        for prop,key in ((13,'x'),(14,'y'),(18,'alpha')):f.bind(prop,keys[f'bubble_{i}_{key}'])
        r=1.3+(i%5)*.3
        draw_path(f,path(f'M{r} 0 A{r} {r} 0 1 1 {-r} 0 A{r} {r} 0 1 1 {r} 0 Z',
                         stroke='#bae8ff',stroke_width=.65),node)
        draw_path(f,path(f'M{-r*.5} {-r*.05} Q{-r*.5} {-r*.5} {-r*.05} {-r*.5}',
                         stroke='#f3fcff',stroke_width=.55,stroke_linecap='round'),node)
    finish_file(f,'water-bubbles','Bubbles',destination='shared/scenery/water/bubbles/visual.riv')

if __name__=='__main__':build()
