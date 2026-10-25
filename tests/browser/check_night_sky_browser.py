"""Exercise the rendered night sky, all 10 wind buttons and the folded panel."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-sky-test')
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
 def tap(x,y):touch('touchStart',x,y);frames(2);touch('touchEnd');frames(5)
 def key(value):page.keyboard.down(value);frames(2);page.keyboard.up(value);frames(3)
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def crop(im,x1,y1,x2,y2):
  a,z=pt(x1,y1),pt(x2,y2);return im.crop(tuple(round(v) for v in (*a,*z)))
 def selected(im):
  found=[]
  for row,y in enumerate((146,66)):
   for step in range(1,6):
    x=96+(step-1)*82;px,py=pt(x+27,y+24)
    red,green,blue=im.getpixel((round(px),round(py)))
    if red>120 and green>180 and blue<150:found.append((row,step))
  return found
 home=snap();tap(240,475);tap(240,370);scenery=snap('night-sky-menu.png')
 tap(240,500);initial=snap('night-sky-collapsed.png')
 assert selected(initial)==[],'Panel should start folded'
 art=crop(initial,10,680,470,280)
 dark=sum(1 for rgb in art.get_flattened_data() if max(rgb)<8)
 assert dark/(art.width*art.height)>.94,'Scene should have a black, sparse sky'
 # Tiny antialiased dots can cover less than one physical pixel on mobile.
 assert sum(1 for rgb in art.get_flattened_data() if max(rgb)>20)>60,'Vector sky is missing'
 frames(30);later=snap('night-sky-moving.png')
 assert ImageChops.difference(art,crop(later,10,680,470,280)).getbbox(),'Folded panel paused the sky'
 tap(435,28);expanded=snap('night-sky-expanded.png')
 assert selected(expanded)==[(0,3)],'Default wind must be left 0 degrees'
 for row,y in enumerate((146,66)):
  for step in range(1,6):
   tap(96+(step-1)*82,y)
   assert selected(snap())==[(row,step)],('Wrong wind selection',row,step)
 right=snap('night-sky-right-up.png')
 tap(435,228);folded=snap('night-sky-folded-right.png');assert selected(folded)==[]
 # A hidden angle button must not receive this touch.
 tap(96,146);tap(435,28);assert selected(snap())==[(1,5)]
 # Dragging across buttons must not change the selection.
 touch('touchStart',96,146);frames(2);touch('touchMove',260,146);frames(2);touch('touchEnd');frames(4)
 assert selected(snap())==[(1,5)]
 key('t');assert selected(snap())==[(0,5)]
 key('ArrowLeft');assert selected(snap())==[(0,4)]
 key(' ');assert selected(snap())==[]
 key(' ');assert selected(snap())==[(0,4)]
 # Global back/Esc must climb through scenery, without leaking the sky.
 tap(48,752);restored=snap('night-sky-return-menu.png')
 assert ImageChops.difference(scenery,restored).getbbox() is None,'Scene leaked into its menu'
 tap(240,500);assert selected(snap())==[(0,4)],'Wind/panel state reset on reentry'
 key('Escape');key('Escape');key('Escape')
 assert ImageChops.difference(home,snap('night-sky-home-restored.png')).getbbox() is None,'Sky leaked into home'
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'sparse_black_vector_sky':'passed','animation_while_folded':'passed','ten_wind_buttons':'passed','fold_preserves_selection':'passed','hidden_buttons_and_drag':'passed','keyboard':'passed','nested_back_and_reentry':'passed','errors':errors}
 (ART/'night-sky-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
