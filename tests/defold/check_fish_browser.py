"""Optional mobile swipe/turn regression; requires Playwright, Chromium and Pillow."""
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
from pathlib import Path
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-fish-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.goto(URL)
 page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n):page.evaluate('n => new Promise(resolve => {const tick=()=>{if(--n<=0)resolve();else requestAnimationFrame(tick)};requestAnimationFrame(tick)})',n)
 frames(10);r=page.locator('canvas').bounding_box();session=c.new_cdp_session(page)
 def pt(x,y):return (r['x']+x/480*r['width'],r['y']+(800-y)/800*r['height'])
 def finger(x,y):
  x,y=pt(x,y);return {'x':x,'y':y,'id':1}
 def touch(kind,x=None,y=None):session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if x is None else [finger(x,y)]})
 def swipe(start,end,y):
  touch('touchStart',start,y);frames(3)
  for i in range(1,7):touch('touchMove',start+(end-start)*i/6,y);frames(2)
  touch('touchEnd');frames(8)
 def snap(name):return Image.open(io.BytesIO(page.screenshot(path=str(ART/name)))).convert('RGB')
 def eye(im):
  a=pt(35,625);z=pt(445,315);pixels=[]
  for y in range(round(a[1]),round(z[1])):
   for x in range(round(a[0]),round(z[0])):
    red,green,blue=im.getpixel((x,y))
    if red>225 and 140<green<235 and blue<45:pixels.append((x,y))
  assert len(pixels)>15,('Fish eye missing',len(pixels))
  return [sum(p[i] for p in pixels)/len(pixels) for i in [0,1]]
 before=snap('rive-fish-bird.png')
 swipe(400,70,560)
 right=snap('rive-fish-mobile-right.png');right_eye=eye(right)
 assert right_eye[0]>pt(240,480)[0]
 frames(15);swimming=snap('rive-fish-mobile-swimming.png')
 assert ImageChops.difference(right,swimming).getbbox(),'Fish did not animate'
 touch('touchStart',240,190);frames(4);touch('touchEnd');frames(95)
 left=snap('rive-fish-mobile-left.png');left_eye=eye(left)
 assert left_eye[0]<pt(240,480)[0] and right_eye[0]-left_eye[0]>80
 assert abs(right_eye[1]-left_eye[1])<15,'Fish flipped belly-up'
 swipe(70,400,560);frames(25)
 restored=snap('rive-fish-bird-restored.png')
 assert ImageChops.difference(before,restored).getbbox() is None,'Bird page did not restore'
 # Swiping over an equipment card navigates without toggling that item.
 swipe(405,70,340);eye(snap('rive-fish-card-swipe.png'))
 swipe(70,400,560);frames(20)
 assert ImageChops.difference(before,snap('rive-fish-card-swipe-restored.png')).getbbox() is None,'Swipe accidentally activated equipment'
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'swipe_navigation':'passed','automatic_swim':'passed','turn_keeps_belly_down':'passed','bird_restores':'passed','card_swipe_no_toggle':'passed','eyes':[right_eye,left_eye],'errors':errors}
 (ART/'rive-fish-browser-test.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result));b.close()
