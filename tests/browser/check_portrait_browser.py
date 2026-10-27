"""Current 480x800 portrait GUI, unchanged vector scenery and live rotation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageDraw
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8150/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-portrait')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':472,'height':997},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 def record(v):logs.append(v);(ART/'browser.log').write_text('\n'.join(logs))
 page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n=3):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 frames(8);session=c.new_cdp_session(page)
 def rect():return page.locator('canvas').bounding_box()
 def pt(x,y):
  r=rect();s=min(r['width']/480,r['height']/800)
  return r['x']+r['width']/2+(x-240)*s,r['y']+r['height']/2+(400-y)*s
 def touch(kind,x=None,y=None):
  points=[]
  if x is not None:
   x,y=pt(x,y);points=[{'id':1,'x':x,'y':y}]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def tap(x,y):touch('touchStart',x,y);frames(2);touch('touchEnd');frames()
 def back():tap(48,752)
 def snap(name):
  im=Image.open(io.BytesIO(page.screenshot(path=str(ART/(name+'.png')),scale='css'))).convert('RGB')
  r=rect();s=min(r['width']/480,r['height']/800)
  ImageDraw.Draw(im).rectangle(tuple(round(v) for v in (r['x']+r['width']-125*s,r['y'],r['x']+r['width'],r['y']+38*s)),fill=(0,0,0))
  return im
 def crop(im,x1,y1,x2,y2):return im.crop(tuple(round(v) for v in (*pt(x1,y1),*pt(x2,y2))))
 def slide(y,old,new):
  touch('touchStart',160+230*old,y);frames(2);touch('touchMove',160+230*new,y);frames(2);touch('touchEnd');frames()
 def knob(im,y):
  screen_y=round(pt(275,y+8)[1]);start,end=pt(150,y)[0],pt(400,y)[0]
  xs=[x for x in range(round(start),round(end)) if (lambda q:q[0]>120 and q[1]>180 and q[2]<150)(im.getpixel((x,screen_y)))]
  assert xs,('Knob missing',y)
  return ((min(xs)+max(xs))/2-pt(160,y)[0])/(pt(390,y)[0]-pt(160,y)[0])
 def eyes(im):
  r=rect()
  # Scenery fills the canvas beyond the centered GUI safe frame on tall phones.
  band=im.crop(tuple(round(v) for v in (r['x']+5,r['y']+r['height']*.74,r['x']+r['width']-5,r['y']+r['height'])))
  return sum(red>140 and 90<green<235 and blue<60 and red>green*1.1 for red,green,blue in band.get_flattened_data())
 home=snap('home');r=rect();assert r['height']>r['width']
 tap(240,215);page.wait_for_timeout(700);snap('system-info')
 # Reproduce the user's long PowerVR name in the in-game GUI, not in the wrapper.
 page.evaluate('''()=>{const gl=document.getElementById('canvas').getContext('webgl2');const old=gl.getParameter.bind(gl);
 gl.getParameter=p=>p===37446?'ANGLE (Google Inc. (Imagination Technologies), ANGLE (Imagination Technologies Vulkan 1.4.317 (PowerVR C-Series CXTP-48-1536 MC1 (0x00001942)) PowerVR C-Series Vulkan Driver-1.662.3024), OpenGL ES 3.2)':p===37445?'Google Inc. (Google Inc. (Imagination Technologies))':old(p);}''')
 page.wait_for_timeout(700);snap('system-info-powervr')
 assert 'SYSTEM INFO' not in page.locator('body').inner_text()
 back();tap(240,345);snap('scenarios');back();tap(240,475);tap(240,500);gallery=snap('gallery')
 for i,name in enumerate(['bird','fish','hawk','firefly','balloon','cloud']):
  tap(90+i%3*150,500-i//3*200);character=snap('character-'+name)
  assert ImageChops.difference(gallery,character).getbbox(),name
  if name=='bird':
   for x in [75,185,295,405]:tap(x,340)
   tap(130,245);tap(350,245);touch('touchStart',240,155);frames(6);snap('bird-actions');touch('touchEnd');frames()
  elif name=='fish':tap(240,190);frames(5);snap('fish-turn')
  elif name=='hawk':tap(350,190);tap(130,190);frames(5);snap('hawk-actions')
  elif name=='cloud':tap(240,190);frames(3);snap('cloud-action')
  back();restored=snap('gallery-after-'+name)
  assert ImageChops.difference(gallery,restored).getbbox() is None,'Leaked character '+name
 back();tap(240,370);tap(240,500);full=snap('sky-full')
 assert abs(knob(full,578)-1)<.04 and abs(knob(full,500)-1)<.04
 slide(578,1,0);slide(500,1,0);empty=snap('sky-zero')
 assert sum(max(v)>45 for v in crop(empty,50,420,430,250).get_flattened_data())==0
 tap(447,28);snap('wind-expanded');tap(424,66);tap(447,228)
 back();tap(240,370);wet=snap('water')
 assert abs(knob(wet,578)-.2)<.04 and abs(knob(wet,500)-.6)<.04
 slide(578,.2,.45);slide(500,.6,.85);wet=snap('water-adjusted')
 assert abs(knob(wet,578)-.45)<.04 and abs(knob(wet,500)-.85)<.04
 back();tap(240,240);fish=snap('fish-scene');assert eyes(fish)>0
 tap(240,545);assert eyes(snap('fish-hidden'))==0
 tap(240,615);assert eyes(snap('water-fish-hidden'))==0
 tap(240,615);assert eyes(snap('water-restored-fish-hidden'))==0
 tap(240,545);assert eyes(snap('fish-restored'))>0
 page.set_viewport_size({'width':997,'height':472});frames(5);wide=snap('rotated-portrait')
 r=rect();assert abs(r['width']/r['height']-.6)<.02 and eyes(wide)>0
 for _ in range(3):back()
 page.set_viewport_size({'width':472,'height':997});frames(5)
 assert ImageChops.difference(home,snap('home-restored')).getbbox() is None
 errors=[v for v in logs if any(e in v for e in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'portrait_navigation':'passed','all_character_routes_and_actions':'passed','gallery_restore':'passed','system_info_and_long_gpu':'captured','particle_sliders':'passed','water_sliders':'passed','fish_controls':'passed','rotation':'passed','errors':errors}
 (ART/'portrait-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
