"""Check water-owned vector bubble rendering and visibility in Release Web."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8153/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/water-bubbles');ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':1280,'height':820},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[];page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.add_init_script("""(()=>{
 localStorage.setItem('nightly-bird-orientation',location.search.includes('portrait')?'portrait':'landscape');
 const real=performance.now.bind(performance),epoch=Date.now(),raf=requestAnimationFrame.bind(window);
 let base=real(),elapsed=0,paused=false;const queue=[];const now=()=>elapsed+(paused?0:(real()-base)*.2);
 Object.defineProperty(performance,'now',{value:now});Date.now=()=>epoch+now();
 window.requestAnimationFrame=cb=>raf(()=>{if(paused)queue.push(cb);else cb(now())});
 window.__testPause=()=>{elapsed=now();paused=true};
 window.__testResume=()=>{base=real();paused=false;for(const cb of queue.splice(0))requestAnimationFrame(cb)};
 })()""")
 def frames(n=2):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 def mode():return page.evaluate('NightlyDisplay.getOrientation()')
 def tap(x,y):
  r=page.locator('canvas').bounding_box();w,h=(1280,720) if mode()=='landscape' else (480,800);s=min(r['width']/w,r['height']/h)
  x=r['x']+r['width']/2+(x-w/2)*s;y=r['y']+r['height']/2+(h/2-y)*s
  session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});page.wait_for_timeout(220);frames(2);session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});frames()
 def wait_ms(ms):
  end=page.evaluate('performance.now()')+ms
  while page.evaluate('performance.now()')<end:frames(8)
 def snap(name):
  page.evaluate('__testPause()');page.wait_for_timeout(50)
  raw=page.screenshot(path=str(ART/(name+'.png')),scale='css');im=Image.open(io.BytesIO(raw)).convert('RGB');r=page.locator('canvas').bounding_box();cyan=[]
  for y in range(round(r['y']+r['height']*590/720),round(r['y']+r['height']*710/720)):
   for x in range(round(r['x']),round(r['x']+r['width'])):
    a,g,bl=im.getpixel((x,y))
    # Ring cyan is distinct from grey fish (G-R<=25), gold reflection and the
    # white stars. Restrict below the wave envelope to omit the surface line.
    if g-a>30 and g>140 and bl>180:cyan.append((x,y))
  page.evaluate('__testResume()')
  result={'image':name+'.png','bubble_pixels':len(cyan)}
  if cyan:result['centroid']=[sum(x for x,y in cyan)/len(cyan),sum(y for x,y in cyan)/len(cyan)]
  return result
 def enter(portrait=False):
  page.goto(URL+('?bubble_test=portrait' if portrait else ''));page.wait_for_function('window.Module && Module.calledRun',timeout=60000);frames(8)
  if portrait:tap(240,475);tap(240,370);tap(240,240)
  else:tap(340,370);tap(640,340);tap(640,220)
 session=c.new_cdp_session(page)
 enter();assert mode()=='landscape'
 samples=[]
 for i in range(6):wait_ms(220);samples.append(snap('landscape-%02d'%i))
 assert max(v['bubble_pixels'] for v in samples)>5,'Vector bubbles are not visible above water fill'
 tap(810,596);hidden=snap('fish-hidden-existing-bubbles')
 assert hidden['bubble_pixels']>0,'Hiding fish incorrectly hid the water-owned bubbles'
 wait_ms(2200);drained=snap('fish-hidden-no-new-bubbles');assert drained['bubble_pixels']==0,'Hidden fish continued emitting'
 tap(810,596);wait_ms(800);restored=snap('fish-restored');assert restored['bubble_pixels']>5,'Emission did not resume'
 tap(470,596);dry=snap('water-hidden');assert dry['bubble_pixels']==0,'Hidden water left orphan bubbles'
 enter(True);assert mode()=='portrait';wait_ms(900);portrait=snap('portrait')
 assert portrait['bubble_pixels']>5,'Portrait bubbles missing'
 errors=[v for v in logs if any(s in v for s in ('ERROR:','PAGEERROR','GL_INVALID'))];assert not errors,errors
 result={'version':'0.8.36','landscape':samples,'fish_hidden_existing_bubbles':hidden,'stopped_and_drained':drained,'resumed':restored,'water_hidden':dry,'portrait':portrait,'test_clock':'0.2x, paused for screenshots; not an FPS benchmark','errors':errors}
 (ART/'test.json').write_text(json.dumps(result,indent=2));(ART/'browser.log').write_text('\n'.join(logs));print(json.dumps(result));b.close()
