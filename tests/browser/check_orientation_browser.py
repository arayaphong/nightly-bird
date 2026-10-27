"""Switch real Defold GUI profiles using the in-game control, with touch input."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageChops
import io,json,sys
URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8150/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-orientation')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 c=b.new_context(viewport={'width':997,'height':700},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=c.new_page();logs=[]
 def record(v):logs.append(v);(ART/'browser.log').write_text('\n'.join(logs))
 page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
 # Exercise the supported fallback without a physical display to rotate.
 page.add_init_script('Element.prototype.requestFullscreen=()=>Promise.reject(new Error("headless fullscreen unavailable"))')
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
 def frames(n=4):page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
 frames(8);session=c.new_cdp_session(page)
 def mode():return page.evaluate('NightlyDisplay.getOrientation()')
 def dimensions():return (1280,720) if mode()=='landscape' else (480,800)
 def rect():return page.locator('canvas').bounding_box()
 def pt(x,y):
  w,h=dimensions();r=rect();s=min(r['width']/w,r['height']/h)
  return r['x']+r['width']/2+(x-w/2)*s,r['y']+r['height']/2+(h/2-y)*s
 def touch(kind,x=None,y=None,physical=False):
  points=[]
  if x is not None:
   if not physical:x,y=pt(x,y)
   points=[{'id':1,'x':x,'y':y}]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def tap(x,y,physical=False):touch('touchStart',x,y,physical);frames(2);touch('touchEnd');frames()
 def back():tap(*( (76,668) if mode()=='landscape' else (48,752)))
 def toggle():
  old=mode();w,h=dimensions();r=rect();s=min(r['width']/w,r['height']/h)
  tap(r['x']+r['width']/2,r['y']+16*s,True);frames(6)
  assert mode()!=old,('Toggle did not switch',old)
  assert page.evaluate('localStorage.getItem("nightly-bird-orientation")')==mode()
 def snap(name):
  im=Image.open(io.BytesIO(page.screenshot(path=str(ART/(name+'.png')),scale='css'))).convert('RGB')
  w,h=dimensions();r=rect();s=min(r['width']/w,r['height']/h)
  ImageDraw.Draw(im).rectangle(tuple(round(v) for v in (r['x']+r['width']-170*s,r['y'],r['x']+r['width'],r['y']+40*s)),fill=(0,0,0))
  return im
 def slide(x,y,old,new):
  touch('touchStart',x-115+230*old,y);frames(2);touch('touchMove',x-115+230*new,y);frames(2);touch('touchEnd');frames()
 def knob(im,x,y):
  screen_y=round(pt(x,y+8)[1]);start,end=pt(x-125,y)[0],pt(x+125,y)[0]
  xs=[a for a in range(round(start),round(end)) if (lambda q:q[0]>120 and q[1]>180 and q[2]<150)(im.getpixel((a,screen_y)))]
  assert xs,('Knob missing',mode(),x,y)
  return ((min(xs)+max(xs))/2-pt(x-115,y)[0])/(pt(x+115,y)[0]-pt(x-115,y)[0])
 assert mode()=='portrait';snap('home-portrait');toggle();home=snap('home-landscape')
 tap(640,210);frames(8);snap('system-info-landscape');toggle();snap('system-info-portrait');back()
 tap(240,475);tap(240,500);gallery=snap('gallery-portrait');toggle();gallery_wide=snap('gallery-landscape')
 for i,name in enumerate(['bird','fish','hawk','firefly','balloon','cloud']):
  tap(260+i%3*380,405-i//3*205);snap(name+'-landscape')
  if name=='bird':
   for x,y in [(850,470),(1080,470),(850,330),(1080,330)]:tap(x,y)
   tap(1080,210)
  elif name=='fish':tap(950,300)
  elif name=='hawk':tap(975,240)
  elif name=='cloud':tap(1070,120)
  toggle();snap(name+'-portrait')
  if name=='bird':
   # Equipped badges and action input must survive both rebuilds.
   tap(130,245);tap(350,245)
  elif name=='fish':tap(240,190)
  elif name=='hawk':tap(130,190)
  elif name=='cloud':tap(240,190)
  toggle();snap(name+'-landscape-restored');back()
  restored=snap('gallery-after-'+name)
  assert ImageChops.difference(gallery_wide,restored).getbbox() is None,('Gallery leaked or failed navigation',name)
 back();tap(640,340);tap(640,460);snap('sky-landscape')
 slide(640,590,1,0);slide(1050,590,1,0)
 toggle();zero=snap('sky-zero-portrait')
 assert abs(knob(zero,275,578))<.04 and abs(knob(zero,275,500))<.04
 slide(275,578,0,.4);slide(275,500,0,.3);toggle();changed=snap('sky-counts-landscape')
 assert abs(knob(changed,640,590)-.4)<.04 and abs(knob(changed,1050,590)-.3)<.04
 back();tap(640,340);slide(640,590,.2,.45);slide(1050,590,.6,.85)
 toggle();wet=snap('water-portrait')
 assert abs(knob(wet,275,578)-.45)<.04 and abs(knob(wet,275,500)-.85)<.04
 toggle();wet=snap('water-landscape')
 assert abs(knob(wet,640,590)-.45)<.04 and abs(knob(wet,1050,590)-.85)<.04
 back();tap(640,220);tap(810,596);toggle();snap('fish-hidden-portrait');tap(240,545);tap(240,615);toggle();snap('fish-water-hidden-landscape');tap(470,596)
 for _ in range(3):back()
 snap('home-landscape-restored')
 page.reload();page.wait_for_function('window.Module && Module.calledRun',timeout=60000);frames(8)
 assert mode()=='landscape';tap(640,210);snap('persisted-landscape-system')
 page.set_viewport_size({'width':472,'height':997});frames(6);toggle();snap('phone-portrait');back();tap(240,475);tap(240,500);snap('phone-gallery')
 errors=[v for v in logs if any(e in v for e in ['ERROR:','PAGEERROR','GL_INVALID'])]
 (ART/'browser.log').write_text('\n'.join(logs));assert not errors,errors
 result={'both_gui_profiles':'passed','touch_after_switch':'passed','all_character_routes':'passed','equipment_and_animation_continuity':'captured','gallery_restoration':'passed','particle_and_water_settings':'passed','fish_visibility_controls':'captured','persisted_selection':'passed','phone_resize':'passed','errors':errors}
 (ART/'orientation-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
