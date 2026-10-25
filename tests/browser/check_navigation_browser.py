"""Exercise actual Studio/Scenarios menus, nested back navigation and visibility."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-navigation-test')
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
  x,y=pt(x,y);session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});frames(3)
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});frames(7)
 def key(value):page.keyboard.down(value);frames(3);page.keyboard.up(value);frames(5)
 signatures={}
 def route(expected):
  # Release builds remove Lua print(), so verify the rendered header and
  # repeated navigation visually instead of depending on debug console output.
  im=Image.open(io.BytesIO(page.screenshot())).convert('RGB')
  a,z=pt(95,725),pt(465,620)
  header=im.crop(tuple(round(v) for v in (*a,*z)))
  if expected in signatures:
   assert ImageChops.difference(header,signatures[expected]).getbbox() is None,('Wrong restored page',expected)
  else:
   assert all(ImageChops.difference(header,v).getbbox() for v in signatures.values()),('Navigation did not change page',expected)
   signatures[expected]=header
 def snap(name):
  raw=page.screenshot();(ART/name).write_bytes(raw);return Image.open(io.BytesIO(raw)).convert('RGB')
 route('home');home=snap('refactor-main-menu.png')
 tap(240,475);route('studio');snap('refactor-studio-menu.png')
 tap(240,370);route('scenery');snap('refactor-scenery-empty.png')
 tap(48,752);route('studio')
 tap(240,240);route('rules_and_items');key('Escape');route('studio')
 tap(240,500);route('characters');snap('refactor-character-gallery.png')
 tap(90,500);route('bird');key('Escape');route('characters')
 key('Escape');route('studio');key('Escape');route('home')
 assert ImageChops.difference(home,snap('refactor-main-restored.png')).getbbox() is None,'Preview artwork leaked into the main menu'
 tap(240,345);route('scenarios');snap('refactor-scenarios-menu.png')
 tap(48,752);route('home')
 key('1');route('studio');key('Escape');key('2');route('scenarios');key('Escape');route('home')
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'main_menu':'passed','studio_categories':'passed','scenarios_empty_state':'passed','nested_back':'passed','preview_visibility':'passed','keyboard':'passed','errors':errors}
 (ART/'refactor-navigation-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
