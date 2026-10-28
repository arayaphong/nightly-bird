"""Verify committed attacks in the rendered Release game through real touch input."""
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
 def committed_case(name,replacement):
  # A target far to the right requires swimming before the jump. Remove/replace
  # it immediately, while the fish is still far from the locked approach range.
  before=snapshot(name+'-before');assert before['fish'][0]<900,before
  tap(1140,220)
  tap(560,220) if replacement else tap(640,360)
  tracks=[];saw_locked_leap=False
  for i in range(36):
   frames(3);v=snapshot(name+'-%02d'%i);tracks.append(v)
   saw_locked_leap=saw_locked_leap or (v['fish'][1]<555 and v['fish'][0]>930)
   if saw_locked_leap:
    if replacement and v['fish'][0]<900:break
    if not replacement and len(tracks)>=3 and all(v['top']>585 for v in tracks[-3:]):break
  (ART/(name+'-tracks.json')).write_text(json.dumps(tracks,indent=2))
  airborne=[v for v in tracks if v['fish'][1]<555]
  assert airborne,'Removing/replacing the bird canceled the committed leap'
  assert min(v['fish'][0] for v in airborne)>930,'Fish jumped from far away or chased replacement prey'
  assert all(v['bird'] is None for v in tracks) if not replacement else all(v['bird'] and abs(v['bird']['centre'][0]-560)<65 for v in tracks)
  if replacement:assert tracks[-1]['fish'][0]<900,'Patrol did not acquire remaining prey automatically'
  else:assert all(v['top']>585 for v in tracks[-3:]),'Fish failed to return underwater'
  return tracks
 removed=committed_case('removed',False)
 # Reload for an independent fixture whose fish starts near world x=640.
 page.reload();page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 frames(10);tap(340,370);tap(640,340);tap(640,220);frames(4)
 replaced=committed_case('replaced',True)
 # Do not place or move anything. The remaining bird must be acquired by
 # patrol itself and caught in a second attack after the original miss lands.
 catch=[]
 for i in range(28):
  frames(3);catch.append(snapshot('auto-catch-%02d'%i))
  v=catch[-1]
  if v['bird'] and v['bird']['centre'][1]>590 and v['bird']['pixels']<180:break
 held=[v for v in catch if v['bird'] and v['bird']['centre'][1]>590 and v['bird']['pixels']<180]
 assert held,'Patrol required another placement event to attack existing prey'
 errors=[s for s in logs if any(v in s for v in ('ERROR:','PAGEERROR','GL_INVALID'))]
 assert not errors,errors
 result={'version':'0.8.35','orientation':'landscape','test_clock':'0.2x; frozen during screenshots (not an FPS benchmark)','removed_prey_attack_finishes':True,'active_attack_does_not_retarget':True,'patrol_acquires_existing_prey_without_tap':True,'swims_before_launch':True,'automatic_followup_catches':True,'removed':removed,'replaced':replaced,'catch':catch,'errors':errors}
 (ART/'test.json').write_text(json.dumps(result,indent=2));(ART/'browser.log').write_text('\n'.join(logs));print(json.dumps({k:v for k,v in result.items() if k not in ('removed','replaced','catch')}));b.close()
