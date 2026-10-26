"""Verify actual moving vector water, opaque occlusion and separate Studio scenes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-water-test')
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
 def tap(x,y):
  x,y=pt(x,y);session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});frames(2)
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});frames(6)
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def crop(im,x1,y1,x2,y2):
  a,z=pt(x1,y1),pt(x2,y2);return im.crop(tuple(round(v) for v in (*a,*z)))
 def speed(im):return crop(im,155,690,395,658)
 def deep_water(im):
  band=crop(im,12,210,468,80)
  assert all(blue>red+10 and blue>15 and red<35 and green<65 for red,green,blue in band.get_flattened_data()),'Stars/dust visible in opaque water or water missing'
  for y in range(band.height):
   row=[band.getpixel((x,y)) for x in range(band.width)]
   assert all(max(p[k] for p in row)-min(p[k] for p in row)<=2 for k in range(3)),'Particle/glow leaked into water'
  return band
 home=snap();tap(240,475);tap(240,370);menu=snap('water-studio-menu.png')
 tap(240,370);first=snap('water-initial.png');slow=speed(first)
 band=deep_water(first);edge=crop(first,10,310,470,250)
 # The surface must visibly curve across the screen.
 ys=[]
 for x in range(5,edge.width-5):
  hits=[y for y in range(edge.height) if edge.getpixel((x,y))[0]>80]
  if hits:ys.append(min(hits,key=lambda y:abs(y-edge.height/2)))
 assert len(ys)>edge.width*.85 and max(ys)-min(ys)>4,'Vector wave is missing or flat'
 frames(60);moved=snap('water-wave-moved.png')
 assert ImageChops.difference(edge,crop(moved,10,310,470,250)).getbbox(),'Wave animation stayed still'
 # Moving tessellation can round the fixed gradient by one output level.
 # Row uniformity above still catches visible particle cores, halos and tails.
 assert max(hi for lo,hi in ImageChops.difference(band,deep_water(moved)).getextrema())<=2,'Particles showed through the moving water'
 # Changing wind and star speed must not reveal particles underneath the wave.
 tap(275,674);fast=speed(snap());assert ImageChops.difference(slow,fast).getbbox()
 tap(435,28);tap(96,66);tap(435,228);frames(45)
 deep_water(snap('water-wind-down-right.png'))
 tap(48,752);assert ImageChops.difference(menu,snap()).getbbox() is None,'Water leaked into scenery menu'
 tap(240,500);sky=snap('water-original-sky-unchanged.png')
 old_band=crop(sky,12,210,468,80)
 assert sum(max(p)<8 for p in old_band.get_flattened_data())/(old_band.width*old_band.height)>.95,'Original sky unexpectedly gained water'
 assert ImageChops.difference(slow,speed(sky)).getbbox() is None,'Fixture speed state was shared'
 tap(48,752);tap(240,370);again=snap('water-reentered.png')
 assert ImageChops.difference(fast,speed(again)).getbbox() is None,'Water fixture speed reset on reentry'
 deep_water(again)
 for _ in range(3):
  page.keyboard.down('Escape');frames(2);page.keyboard.up('Escape');frames(5)
 assert ImageChops.difference(home,snap('water-home-restored.png')).getbbox() is None,'Scene leaked into home'
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'animated_curved_surface':'passed','opaque_water_no_particles':'passed','wind_and_star_controls':'passed','original_scene_unchanged':'passed','independent_fixture_state':'passed','nested_back_and_reentry':'passed','errors':errors}
 (ART/'water-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
