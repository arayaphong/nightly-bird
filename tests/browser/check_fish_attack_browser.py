"""Exercise the Release fixture through rendered pixels and real touch input."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8151/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-fish-attack');ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':997,'height':700},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 def record(s):
  logs.append(s);(ART/'browser.log').write_text('\n'.join(logs))
 page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
 page.add_init_script('Element.prototype.requestFullscreen=()=>Promise.reject(new Error("headless fullscreen unavailable"))')
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 session=c.new_cdp_session(page)
 def frames(n=2):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 def mode():return page.evaluate('NightlyDisplay.getOrientation()')
 def rect():return page.locator('canvas').bounding_box()
 def pt(x,y):
  w,h=(1280,720) if mode()=='landscape' else (480,800);r=rect();s=min(r['width']/w,r['height']/h)
  return r['x']+r['width']/2+(x-w/2)*s,r['y']+r['height']/2+(h/2-y)*s
 def touch(kind,x=None,y=None):
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if x is None else [{'id':1,'x':x,'y':y}]})
 def tap(x,y,wait=3,physical=False):
  if not physical:x,y=pt(x,y)
  touch('touchStart',x,y);page.wait_for_timeout(220);touch('touchEnd');frames(wait)
 def toggle():
  r=rect();w,h=(1280,720) if mode()=='landscape' else (480,800);s=min(r['width']/w,r['height']/h)
  tap(r['x']+r['width']/2,r['y']+16*s,physical=True);frames(5)
 def snap(name):return Image.open(io.BytesIO(page.screenshot(path=str(ART/(name+'.png')),scale='css'))).convert('RGB')
 def red(im):
  r=rect();pixels=[]
  for y in range(round(r['y']+r['height']*.35),round(r['y']+r['height']*.95)):
   for x in range(round(r['x']),round(r['x']+r['width'])):
    a,g,b=im.getpixel((x,y))
    if a>100 and a>g*1.6 and a>b*1.4:pixels.append((x,y))
  return None if not pixels else (sum(x for x,y in pixels)/len(pixels),sum(y for x,y in pixels)/len(pixels),len(pixels))
 frames(10);tap(240,475);tap(240,370);tap(240,240);frames(6)
 # Release builds strip Lua print; validate through rendered pixels below.
 snap('portrait-initial')
 # Invalid taps: far above, underwater, and a drag through the valid band.
 tap(240,390);tap(240,80)
 x,y=pt(180,245);touch('touchStart',x,y);page.wait_for_timeout(220);x,y=pt(280,245);touch('touchMove',x,y);page.wait_for_timeout(220);touch('touchEnd');frames(6)
 assert red(snap('invalid-taps')) is None,'Invalid tap placed a target'
 # Body anchor should coincide with the chosen point in the 128-world-unit band.
 tap(220,245,wait=1)
 sequence=[]
 for i in range(14):
  frames(1);im=snap('portrait-strike-%02d'%i);sequence.append(red(im))

 assert any(v and v[2]>30 for v in sequence),'Dead red bird missing'
 frames(40);static1=red(snap('portrait-target-stays'));frames(10);static2=red(snap('portrait-target-still'))
 assert static1 and static2 and abs(static1[0]-static2[0])<1 and abs(static1[1]-static2[1])<1,'Corpse moved'
 # Hide fish clears the target; tapping while hidden cannot place another.
 tap(240,545);assert red(snap('portrait-fish-hidden')) is None
 tap(240,245);assert red(snap('portrait-hidden-tap')) is None
 tap(240,545);toggle();assert mode()=='landscape'
 # Landscape conversion should produce the same world y=~500.
 tap(860,220,wait=1)
 for i in range(12):frames(1);snap('landscape-strike-%02d'%i)
 frames(30);land=red(snap('landscape-target'))
 assert land and land[2]>30,'Landscape target missing'
 expected=pt(860,220);assert abs(land[0]-expected[0])<15 and abs(land[1]-expected[1])<15,(land,expected)
 # Existing water toggle hides both actors; new taps have no effect.
 tap(470,596);assert red(snap('landscape-water-hidden')) is None
 tap(470,596);tap(76,668);snap('scenery-menu')
 # Re-enter; old target is cleared, ordinary swimming continues.
 tap(640,220);assert red(snap('landscape-reentry')) is None
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 (ART/'browser.log').write_text('\n'.join(logs));assert not errors,errors
 result={'touch_portrait':'passed','ballistic_path':'unit-tested','touch_landscape':'passed','invalid_taps_and_drag':'passed','stationary_corpse':'passed','one_sound_per_launch':'unit-tested','hide_water_fish_and_reentry':'passed','portrait_target_centroid':static2,'landscape_target_centroid':land,'errors':errors}
 (ART/'test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
