"""Optional six-card gallery check; requires Playwright, Chromium and Pillow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-gallery-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n):page.evaluate('n => new Promise(resolve => {const tick=()=>{if(--n<=0)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)})',n)
 frames(10);r=page.locator('canvas').bounding_box();session=c.new_cdp_session(page)
 def pt(x,y):return (r['x']+x/480*r['width'],r['y']+(800-y)/800*r['height'])
 def finger(x,y):
  x,y=pt(x,y);return {'x':x,'y':y,'id':1}
 def touch(kind,x=None,y=None):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if x is None else [finger(x,y)]})
 def tap(x,y):touch('touchStart',x,y);frames(3);touch('touchEnd');frames(8)
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def dots(im):
  out=[]
  for i in range(6):
   x,y=pt(190+20*i,12);red,green,blue=im.getpixel((round(x),round(y)))
   out.append(red>100 and green>200 and blue<150)
  return out
 initial=snap('rive-gallery-home.png');assert not any(dots(initial))
 # Every card needs actual visible vector artwork, not just a label/hit box.
 for i in range(6):
  x,y=90+(i%3)*150,536-(i//3)*200
  a=pt(x-50,y+45);z=pt(x+50,y-45)
  icon=initial.crop((round(a[0]),round(a[1]),round(z[0]),round(z[1])))
  bright=sum(1 for px in range(icon.width) for py in range(icon.height) if max(icon.getpixel((px,py)))>110)
  assert bright>30,('Gallery icon missing',i,bright)
 for i,name in enumerate(['bird','fish','hawk','firefly','balloon','cloud']):
  tap(90+(i%3)*150,500-(i//3)*200)
  preview=snap('rive-gallery-'+name+'.png')
  assert dots(preview)==[j==i for j in range(6)],('Wrong preview selected',name,dots(preview))
  frames(7);moving=snap()
  if name!='bird':assert ImageChops.difference(preview,moving).getbbox(),'Preview did not animate: '+name
  tap(48,752)
  restored=snap()
  assert ImageChops.difference(initial,restored).getbbox() is None,'Home was not restored after '+name
 # Keyboard shortcuts open a card, Esc returns, and a swipe over a home card
 # does not accidentally select it.
 page.keyboard.down('6');frames(4);page.keyboard.up('6');frames(5)
 assert dots(snap())==[False]*5+[True]
 page.keyboard.press('Escape',delay=100);frames(6);assert not any(dots(snap()))
 touch('touchStart',390,500);frames(2)
 touch('touchMove',70,500);frames(3);touch('touchEnd');frames(6)
 assert ImageChops.difference(initial,snap('rive-gallery-home-restored.png')).getbbox() is None
 errors=[s for s in logs if any(t in s for t in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'six_icons_visible':'passed','six_cards_open':'passed','back_restores_home':'passed','keyboard_selection':'passed','swipe_does_not_select':'passed','errors':errors}
 (ART/'rive-gallery-browser-test.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result));b.close()
