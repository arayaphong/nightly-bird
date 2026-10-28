"""Compare real Rive turn silhouettes against a prior bundle with artboard cropping."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,json,sys
BEFORE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8152/'
AFTER=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:8151/'
ART=Path(sys.argv[3]) if len(sys.argv)>3 else Path('/tmp/nightly-fish-clipping');ART.mkdir(parents=True,exist_ok=True)
results={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 for label,url in [('before',BEFORE),('after',AFTER)]:
  context=browser.new_context(viewport={'width':997,'height':700},device_scale_factor=1,has_touch=True,is_mobile=True)
  page=context.new_page();logs=[];page.on('pageerror',lambda e:logs.append(str(e)))
  page.goto(url);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
  page.wait_for_timeout(600)
  session=context.new_cdp_session(page)
  def rect():return page.locator('canvas').bounding_box()
  def pt(x,y):
   r=rect();s=min(r['width']/480,r['height']/800)
   return r['x']+r['width']/2+(x-240)*s,r['y']+r['height']/2+(400-y)*s
  def tap(x,y):
   x,y=pt(x,y);session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});page.wait_for_timeout(250)
   session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(350)
  tap(240,475);tap(240,500);tap(240,500);page.wait_for_timeout(500)
  # Hold the engine's rAF queue so screenshots cannot skip the steep turn.
  page.evaluate('''()=>{window.__qaFrames=[];window.requestAnimationFrame=f=>{__qaFrames.push(f);return __qaFrames.length}}''')
  page.wait_for_timeout(500)
  def step():page.evaluate('()=>{const q=__qaFrames.splice(0);for(const f of q)f(performance.now())}')
  page.keyboard.down('Space');step();page.keyboard.up('Space')
  counts=[]
  for i in range(9):
   step();im=Image.open(io.BytesIO(page.screenshot(path=str(ART/(label+'-turn-%02d.png'%i)),scale='css'))).convert('RGB')
   count=0
   # Empty strips beyond the former 1024-high artboard, with no UI text.
   for lo,hi in [(315,355),(605,631)]:
    x1,y1=pt(130,hi);x2,y2=pt(350,lo)
    for y in range(round(y1),round(y2)):
     for x in range(round(x1),round(x2)):
      r,g,b=im.getpixel((x,y))
      if r>40 and b>r*1.08 and g>r*1.04:count+=1
   counts.append(count)
  assert not logs,logs;results[label]={'blue_pixels_beyond_old_artboard':counts,'max':max(counts),'page_errors':logs}
  context.close()
 browser.close()
assert results['before']['max']<10,results
assert results['after']['max']>50,results
(ART/'comparison.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
