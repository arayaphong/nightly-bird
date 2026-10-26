"""Check the real Rive swimmer, four-way travel and independent fixture controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-swimming-fish-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 frames(10);r=page.locator('canvas').bounding_box();session=c.new_cdp_session(page)
 def pt(x,y):return r['x']+x/480*r['width'],r['y']+(800-y)/800*r['height']
 def touch(kind,x=None,y=None):
  points=[]
  if x is not None:
   x,y=pt(x,y);points=[{'id':1,'x':x,'y':y}]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def tap(x,y):touch('touchStart',x,y);frames(2);touch('touchEnd');frames(6)
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def slider(im,track):
  y=round(pt(0,track+8)[1]);left=round(pt(145,0)[0]);right=round(pt(405,0)[0])
  xs=[x for x in range(left,right) if (lambda rgb:rgb[0]>120 and rgb[1]>180 and rgb[2]<150)(im.getpixel((x,y)))]
  assert xs,'Slider missing'
  center=((min(xs)+max(xs))/2-r['x'])/r['width']*480
  return (center-160)/230*100
 def drag(percent,track):
  old=slider(snap(),track);touch('touchStart',160+230*old/100,track);frames(2)
  for i in range(1,6):touch('touchMove',160+230*(old+(percent-old)*i/5)/100,track);frames(2)
  touch('touchEnd');frames(5)
 def fish(im):
  # Yellow eye is unique in the water; controls use green and lunar glints ivory.
  a,z=pt(0,400),pt(480,56);pixels=[]
  for y in range(round(a[1]),round(z[1])):
   for x in range(round(a[0]),round(z[0])):
    red,green,blue=im.getpixel((x,y))
    if red>140 and 90<green<235 and blue<60 and red>green*1.1:pixels.append((x,y))
  if not pixels:return None
  return [(sum(v[i] for v in pixels)/len(pixels)-r['x' if i==0 else 'y'])/r['width' if i==0 else 'height']*(480 if i==0 else 800) for i in (0,1)]
 home=snap();tap(240,475);tap(240,370);snap('fish-scenery-menu.png');tap(240,240)
 initial=snap('fish-scene-defaults.png')
 assert abs(slider(initial,578)-20)<2 and abs(slider(initial,500)-60)<2
 # Slightly deeper water exposes the full four-way movement for visual sampling.
 drag(40,578);positions=[]
 for i in range(60):
  frames(15);im=snap('fish-swimming-%02d.png'%i if i in (0,20,40,59) else None);pos=fish(im)
  if pos:positions.append(pos)
 assert len(positions)>35,('Fish eye not visible over water',len(positions))
 dx=[b[0]-a[0] for a,b in zip(positions,positions[1:])];dy=[b[1]-a[1] for a,b in zip(positions,positions[1:])]
 assert min(dx)<-1 and max(dx)>1,('Fish did not swim both horizontal directions',min(dx),max(dx))
 assert min(dy)<-.2 and max(dy)>.2,('Fish did not swim up and down',min(dy),max(dy))
 drag(75,500);snap('fish-rough-water.png')
 tap(48,752);tap(240,370);water=snap('fish-independent-water.png')
 assert abs(slider(water,578)-20)<2 and abs(slider(water,500)-60)<2,'Fish and water fixtures shared state'
 assert fish(water) is None,'Fish leaked into the water-only fixture'
 tap(48,752);tap(240,240);again=snap('fish-reentry.png')
 assert abs(slider(again,578)-40)<2 and abs(slider(again,500)-75)<2,'Fish fixture controls reset'
 drag(0,578);assert fish(snap('fish-no-water.png')) is None,'Fish remained visible without water'
 drag(20,578);frames(30);assert fish(snap('fish-water-restored.png')) is not None,'Fish did not resume after restoring water'
 for _ in range(3):
  page.keyboard.down('Escape');frames(2);page.keyboard.up('Escape');frames(5)
 assert ImageChops.difference(home,snap('fish-home-restored.png')).getbbox() is None,'Scene leaked into home'
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'default_level':20,'default_roughness':60,'four_way_random_swim':'passed','fish_visible_over_opaque_water':'passed','independent_fixture_state':'passed','reentry_and_zero_water':'passed','nested_back':'passed','positions':positions,'errors':errors}
 (ART/'swimming-fish-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
