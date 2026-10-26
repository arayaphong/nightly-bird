"""Actual Defold/Rive landscape QA: every route, controls, camera and rotation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8140/Nightly%20Bird/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-landscape-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 def record(value):
  logs.append(value);(ART/'browser.log').write_text('\n'.join(logs))
 page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n=4):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 frames(8);session=c.new_cdp_session(page)
 def rect():return page.locator('canvas').bounding_box()
 def pt(x,y):
  r=rect();s=min(r['width']/1280,r['height']/720)
  return r['x']+r['width']/2+(x-640)*s,r['y']+r['height']/2+(360-y)*s
 def touch(kind,x=None,y=None):
  points=[]
  if x is not None:
   x,y=pt(x,y);points=[{'id':1,'x':x,'y':y}]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def tap(x,y):touch('touchStart',x,y);frames(2);touch('touchEnd');frames()
 def snap(name):return Image.open(io.BytesIO(page.screenshot(scale='css',path=str(ART/(name+'.png'))))).convert('RGB')
 def crop(im,x1,y1,x2,y2):
  a,z=pt(x1,y1),pt(x2,y2);return im.crop(tuple(round(v) for v in (*a,*z)))
 def back():tap(76,668)
 def slider(im,center):
  y=round(pt(0,598)[1]);a,z=pt(center-125,0)[0],pt(center+125,0)[0]
  xs=[x for x in range(round(a),round(z)) if (lambda q:q[0]>120 and q[1]>180 and q[2]<150)(im.getpixel((x,y)))]
  assert xs,('Slider knob missing',center)
  start=pt(center-115,590)[0];end=pt(center+115,590)[0]
  return ((min(xs)+max(xs))/2-start)/(end-start)*100
 def drag(center,old,new):
  touch('touchStart',center-115+230*old/100,590);frames(2)
  for i in range(1,5):touch('touchMove',center-115+230*(old+(new-old)*i/4)/100,590);frames(2)
  touch('touchEnd');frames()
 def fish_eye(im):
  band=crop(im,5,450,1275,57)
  return sum(r>140 and 90<g<235 and blue<60 and r>g*1.1 for r,g,blue in band.get_flattened_data())
 home=snap('01-home');r=rect();assert r['width']>r['height']*1.7
 tap(340,370);snap('02-studio');tap(640,460);gallery=snap('03-gallery')
 # Each grid card must navigate to a visible vector character and back.
 for i,name in enumerate(['bird','fish','hawk','firefly','balloon','cloud']):
  tap(260+i%3*380,405-i//3*205);before=snap('character-'+name)
  assert ImageChops.difference(gallery,before).getbbox(),name+' card failed'
  if name=='bird':
   for x,y in [(850,470),(1080,470),(850,330),(1080,330)]:tap(x,y)
   snap('bird-all-equipment');tap(850,210);tap(1080,210)
   touch('touchStart',965,123);frames(12);snap('bird-held');touch('touchEnd');frames(10)
   for x,y in [(850,470),(1080,470),(850,330),(1080,330)]:tap(x,y)
  elif name=='fish':tap(950,300);frames(20);snap('fish-turn')
  elif name=='hawk':tap(975,240);tap(975,345);frames(8);snap('hawk-dive-and-turn')
  elif name=='cloud':tap(1070,120);frames(3);snap('cloud-lightning')
  else:frames(8)
  back();restored=snap('gallery-after-'+name)
  assert ImageChops.difference(gallery,restored).getbbox() is None,'Character leaked into gallery: '+name
 back();tap(640,340);snap('04-scenery-menu');tap(640,460);sky=snap('05-sky')
 tap(230,596);tap(1040,28);snap('wind-expanded');tap(840,66);tap(1040,228)
 back();tap(640,340);water=snap('06-water')
 assert abs(slider(water,640)-20)<3 and abs(slider(water,1050)-60)<3
 edge=crop(water,20,172,1260,116);frames(15);moved=snap('water-moving')
 assert ImageChops.difference(edge,crop(moved,20,172,1260,116)).getbbox(),'Water did not animate'
 drag(640,20,45);drag(1050,60,85);adjusted=snap('water-sliders')
 assert abs(slider(adjusted,640)-45)<3 and abs(slider(adjusted,1050)-85)<3,'Touch slider scaling failed'
 back();tap(640,220);fish=snap('07-fish-scene')
 assert abs(slider(fish,640)-20)<3 and abs(slider(fish,1050)-60)<3,'Scene state was shared'
 assert fish_eye(fish)>0,'Fish was hidden behind the water'
 frames(20);swimming=snap('fish-scene-moving')
 assert ImageChops.difference(crop(fish,0,160,1280,57),crop(swimming,0,160,1280,57)).getbbox()
 drag(640,20,0);assert fish_eye(snap('fish-no-water'))==0
 drag(640,0,35);frames(5);assert fish_eye(snap('fish-water-restored'))>0
 # Live rotation keeps the landscape canvas and the controls visible.
 page.set_viewport_size({'width':390,'height':844});frames(8)
 portrait=snap('portrait-framed');r=rect();assert abs(r['width']/r['height']-16/9)<.02
 assert page.locator('#landscape-hint').is_visible()
 page.set_viewport_size({'width':1200,'height':540});frames(8);wide=snap('ultrawide-fish')
 assert not page.locator('#landscape-hint').is_visible()
 assert fish_eye(wide)>0
 # Both sliders must still map pointer positions correctly after resize.
 drag(640,35,50);drag(1050,60,25);wide=snap('ultrawide-sliders')
 assert abs(slider(wide,640)-50)<3 and abs(slider(wide,1050)-25)<3
 for _ in range(3):back()
 page.set_viewport_size({'width':844,'height':390});frames(5)
 assert ImageChops.difference(home,snap('home-restored')).getbbox() is None
 c.close()
 # Fresh desktop context: mouse dragging and all top-level destinations.
 c=b.new_context(viewport={'width':960,'height':600},device_scale_factor=1,has_touch=False)
 page=c.new_page();page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000);frames(8)
 def click(x,y):
  x,y=pt(x,y);page.mouse.move(x,y);page.mouse.down();frames(2);page.mouse.up();frames()
 click(940,370);snap('desktop-scenarios');click(76,668);click(340,370);click(640,220);snap('desktop-rules');click(76,668)
 click(640,340);click(640,340)
 x,y=pt(640-115+230*.2,590);page.mouse.move(x,y);page.mouse.down();frames(2)
 x,y=pt(640-115+230*.7,590);page.mouse.move(x,y,steps=5);frames(3);page.mouse.up();frames()
 mouse=snap('desktop-mouse-water');assert abs(slider(mouse,640)-70)<3,'Mouse slider failed'
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'landscape_mobile':'passed','all_character_routes_and_actions':'passed','gallery_restore':'passed','scenery_routes':'passed','animated_water_and_fish':'passed','independent_defaults':'passed','touch_and_mouse_sliders':'passed','rotation_and_ultrawide':'passed','home_scenarios_rules':'passed','errors':errors}
 (ART/'landscape-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
