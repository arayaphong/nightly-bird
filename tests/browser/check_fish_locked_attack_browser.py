"""Verify pre-launch cancellation and patrol acquisition through real touch input."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8153/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/fish-locked-attack');ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':997,'height':700},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[];page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.add_init_script("""(()=>{
 localStorage.setItem('nightly-bird-orientation','landscape');
 // Slow only this test's clock and freeze it during screenshots. Otherwise
 // software rendering/screenshot latency can skip the entire short leap.
 const real=performance.now.bind(performance),epoch=Date.now(),raf=requestAnimationFrame.bind(window);
 let base=real(),elapsed=0,paused=false;const queue=[];
 const now=()=>elapsed+(paused?0:(real()-base)*.2);
 Object.defineProperty(performance,'now',{value:now});Date.now=()=>epoch+now();
 window.requestAnimationFrame=cb=>raf(()=>{if(paused)queue.push(cb);else cb(now())});
 window.__testPause=()=>{elapsed=now();paused=true};
 window.__testResume=()=>{base=real();paused=false;for(const cb of queue.splice(0))requestAnimationFrame(cb)};
 })()""")
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 session=c.new_cdp_session(page)
 def frames(n=2):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 def wait_ms(ms):
  end=page.evaluate('performance.now()')+ms
  while page.evaluate('performance.now()')<end:frames(3)
 def rect():return page.locator('canvas').bounding_box()
 def tap(x,y):
  r=rect();s=min(r['width']/1280,r['height']/720);x=r['x']+r['width']/2+(x-640)*s;y=r['y']+r['height']/2+(360-y)*s
  session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});page.wait_for_timeout(220);frames(2);session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});frames(1)
 def snapshot(name):
  page.evaluate('__testPause()');page.wait_for_timeout(50)
  im=Image.open(io.BytesIO(page.screenshot(path=str(ART/(name+'.png')),scale='css'))).convert('RGB');r=rect();blue=set();red=[]
  for y in range(round(r['y']+r['height']*.45),round(r['y']+r['height']*.99)):
   for x in range(round(r['x']),round(r['x']+r['width'])):
    a,g,bl=im.getpixel((x,y))
    if a>100 and a>g*1.6 and a>bl*1.4:red.append((x,y))
    if a>125 and g>145 and bl>165 and bl>a*1.15 and g>a*1.05:blue.add((x,y))
  largest=[]
  while blue:
   q=[blue.pop()];component=[]
   while q:
    x,y=q.pop();component.append((x,y))
    for n in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
     if n in blue:blue.remove(n);q.append(n)
   # The blue wave outline can span the whole screen and exceed the fish's
   # pixel area. Track only compact connected shapes, not that long line.
   width=max(x for x,y in component)-min(x for x,y in component)
   height=max(y for x,y in component)-min(y for x,y in component)
   if width<r['width']*.18 and height<r['height']*.3 and len(component)>len(largest):largest=component
  assert len(largest)>40,'Fish disappeared'
  world=lambda x,y:((x-r['x']-r['width']/2)*720/r['height']+640,(y-r['y'])*720/r['height'])
  centre=world(sum(x for x,y in largest)/len(largest),sum(y for x,y in largest)/len(largest))
  bird=None if not red else {'centre':world(sum(x for x,y in red)/len(red),sum(y for x,y in red)/len(red)),'pixels':len(red)}
  page.evaluate('__testResume()')
  return {'fish':centre,'top':world(0,min(y for x,y in largest))[1],'bird':bird,'image':name+'.png'}
 frames(10);assert page.evaluate('NightlyDisplay.getOrientation()')=='landscape'
 tap(340,370);tap(640,340);tap(640,220);frames(4)
 initial=snapshot('initial')
 def approach_case(name,replacement):
  # A target far to the right requires swimming before the jump. Remove/replace
  # it immediately, while the fish is still far from the locked approach range.
  before=snapshot(name+'-before');assert before['fish'][0]<900,before
  tap(1140,220)
  tap(560,220) if replacement else tap(640,360)
  tracks=[]
  for i in range(36):
   wait_ms(100);v=snapshot(name+'-%02d'%i);tracks.append(v)
   assert not (v['fish'][1]<555 and v['fish'][0]>930),'Fish leaped at the abandoned lock'
   if replacement and v['bird'] and v['bird']['centre'][1]>590 and v['bird']['pixels']<180:break
   if not replacement and len(tracks)>=12 and all(v['top']>585 for v in tracks[-3:]):break
  (ART/(name+'-tracks.json')).write_text(json.dumps(tracks,indent=2))
  airborne=[v for v in tracks if v['fish'][1]<555]
  if replacement:
   assert airborne and all(v['fish'][0]<800 for v in airborne),'Fish kept the abandoned lock'
   assert any(v['bird'] and v['bird']['centre'][1]>590 and v['bird']['pixels']<180 for v in tracks),'Patrol did not catch replacement prey'
  else:
   assert not airborne,'Removed prey caused a leap during the approach'
   assert all(v['bird'] is None for v in tracks)
   assert all(v['top']>585 for v in tracks[-3:]),'Fish failed to return underwater'
  return tracks
 removed=approach_case('removed',False)
 # Reload for an independent fixture whose fish starts near world x=640.
 page.reload();page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 frames(10);tap(340,370);tap(640,340);tap(640,220);frames(4)
 replaced=approach_case('replaced',True)
 errors=[s for s in logs if any(v in s for v in ('ERROR:','PAGEERROR','GL_INVALID'))]
 assert not errors,errors
 result={'version':'0.8.41','orientation':'landscape','test_clock':'0.2x; frozen during screenshots (not an FPS benchmark)','prelaunch_missing_prey_cancels':True,'old_lock_is_abandoned':True,'patrol_acquires_existing_prey_after_recovery':True,'automatic_followup_catches':True,'removed':removed,'replaced':replaced,'errors':errors}
 (ART/'test.json').write_text(json.dumps(result,indent=2));(ART/'browser.log').write_text('\n'.join(logs));print(json.dumps({k:v for k,v in result.items() if k not in ('removed','replaced','catch')}));b.close()
