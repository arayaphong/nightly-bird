"""Optional mobile hawk action regression; needs Playwright, Chromium and Pillow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,json,sys,time
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-hawk-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.add_init_script('''window.__audio=[];
 const create=BaseAudioContext.prototype.createBufferSource;
 BaseAudioContext.prototype.createBufferSource=function(...args){
  const n=create.apply(this,args),start=n.start;
  n.start=function(...args){let energy=0;const a=n.buffer?.getChannelData(0);if(a)for(const v of a)energy+=v*v;
   window.__audio.push(energy);return start.apply(this,args)};return n;
 };''')
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n):page.evaluate('n => new Promise(resolve => {const tick=()=>{if(--n<=0)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)})',n)
 frames(8);r=page.locator('canvas').bounding_box();session=c.new_cdp_session(page)
 def pt(x,y):return (r['x']+x/480*r['width'],r['y']+(800-y)/800*r['height'])
 def finger(x,y):
  x,y=pt(x,y);return {'x':x,'y':y,'id':1}
 def touch(kind,x=None,y=None):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if x is None else [finger(x,y)]})
 def swipe(a,z):
  touch('touchStart',a,560);frames(2)
  for i in range(1,6):touch('touchMove',a+(z-a)*i/5,560);frames(2)
  touch('touchEnd');frames(6)
 def tap():touch('touchStart',240,190);frames(1);touch('touchEnd')
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def ready(im):
  x,y=pt(130,190);red,green,blue=im.getpixel((round(x),round(y)))
  return red>120 and green>200 and blue<150
 def art_height(im):
  a=pt(30,630);z=pt(450,320);ys=[]
  for y in range(round(a[1]),round(z[1])):
   for x in range(round(a[0]),round(z[0])):
    if max(im.getpixel((x,y)))>70:ys.append(y)
  assert ys,'Hawk artwork is missing'
  return max(ys)-min(ys)
 swipe(400,70);swipe(400,70)
 flight=snap('rive-hawk-flight.png');assert ready(flight)
 x,y=pt(260,12);assert flight.getpixel((round(x),round(y)))[1]>200,'Third indicator not selected'
 page.evaluate('window.__audio=[]')
 tap();started=time.monotonic();frames(2)
 dive=snap('rive-hawk-dive.png');assert not ready(dive),'Button did not enter busy state'
 assert art_height(dive)<art_height(flight)*.8,'Hawk did not switch to the folded dive pose'
 # A repeated action halfway through must not restart the three-second window.
 page.wait_for_timeout(700);page.keyboard.press('Space',delay=80)
 while time.monotonic()-started<2.5:page.wait_for_timeout(100)
 early=snap()
 if time.monotonic()-started<2.9:assert not ready(early),'Dive ended before three seconds'
 recovered=None
 while time.monotonic()-started<4.5:
  recovered=snap()
  if ready(recovered):break
  page.wait_for_timeout(80)
 elapsed=time.monotonic()-started
 assert ready(recovered),('Button did not recover after three seconds',elapsed)
 (ART/'rive-hawk-recovered.png').write_bytes(page.screenshot())
 assert art_height(recovered)>art_height(dive)*1.2,'Flight pose did not return'
 assert page.evaluate('window.__audio.reduce((a,b)=>a+b,0)')>1e-6,'Dive produced no audio'
 tap();frames(2);assert not ready(snap())
 swipe(70,400);swipe(400,70)
 assert ready(snap('rive-hawk-reentered.png')),'Leaving during a dive did not reset the action'
 # One more back swipe reaches fish; another reaches the original bird controls.
 swipe(70,400);swipe(70,400);snap('rive-hawk-back-to-bird.png')
 errors=[s for s in logs if any(t in s for t in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'three_page_swipe':'passed','timed_dive':'passed','recovery_observed_seconds':elapsed,'repeat_lock':'passed','sound':'passed','leave_cancels':'passed','errors':errors}
 (ART/'rive-hawk-browser-test.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result));b.close()
