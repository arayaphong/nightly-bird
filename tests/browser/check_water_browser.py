"""Verify actual moving vector water, opaque occlusion and separate Studio scenes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import io,json,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-water-test')
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
  x,y=pt(x,y);session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':x,'y':y}]});frames(2)
  session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});frames(6)
 def snap(name=None):
  raw=page.screenshot()
  if name:(ART/name).write_bytes(raw)
  return Image.open(io.BytesIO(raw)).convert('RGB')
 def crop(im,x1,y1,x2,y2):
  a,z=pt(x1,y1),pt(x2,y2);return im.crop(tuple(round(v) for v in (*a,*z)))
 def speed(im):return crop(im,155,690,395,658)
 def slider_hits(im,track=578):
  y=round(pt(0,track+8)[1]);left=round(pt(145,0)[0]);right=round(pt(405,0)[0])
  return [x for x in range(left,right) if (lambda rgb:rgb[0]>120 and rgb[1]>180 and rgb[2]<150)(im.getpixel((x,y)))]
 def slider_level(im,track=578):
  xs=slider_hits(im,track);assert xs,'Water slider knob is missing'
  center=((min(xs)+max(xs))/2-r['x'])/r['width']*480
  return (center-160)/230*100
 def finger(kind,x=None,y=None):
  points=[]
  if x is not None:
   x,y=pt(x,y);points=[{'id':1,'x':x,'y':y}]
  session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 def set_level(level,track=578):
  before=slider_level(snap(),track);start=160+230*before/100;end=160+230*level/100
  finger('touchStart',start,track);frames(2)
  for i in range(1,5):finger('touchMove',start+(end-start)*i/4,track);frames(2)
  live=snap();assert abs(slider_level(live,track)-max(0,min(100,level)))<2,'Slider did not update during touch drag'
  finger('touchEnd');frames(5);return live
 def wave_at(im,level):
  line=crop(im,10,800*level/100+18,110,800*level/100-18)
  assert sum(red>55 for red,green,blue in line.get_flattened_data())>35,'Surface did not follow the slider'
  return line
 def deep_water(im):
  # Lunar shimmer occupies the strip under the moon; test particle masking left of it.
  band=crop(im,12,210,375,80)
  assert all(blue>red+10 and blue>15 and red<35 and green<65 for red,green,blue in band.get_flattened_data()),'Stars/dust visible in opaque water or water missing'
  for y in range(band.height):
   row=[band.getpixel((x,y)) for x in range(band.width)]
   assert all(max(p[k] for p in row)-min(p[k] for p in row)<=2 for k in range(3)),'Particle/glow leaked into water'
  return band
 def wave_span(im):
  area=crop(im,10,318,375,242);ys=[]
  for x in range(5,area.width-5):
   hits=[y for y in range(area.height) if (lambda rgb:rgb[0]>55 and rgb[2]-rgb[0]>30)(area.getpixel((x,y)))]
   if hits:ys.append(sum(hits)/len(hits))
  assert len(ys)>area.width*.8,'Surface disappeared during roughness adjustment'
  return max(ys)-min(ys),area
 home=snap();tap(240,475);tap(240,370);menu=snap('water-studio-menu.png')
 tap(240,370);first=snap('water-initial.png');slow=speed(first)
 assert abs(slider_level(first)-35)<2,'Default water level changed'
 assert abs(slider_level(first,500)-25)<2,'Default roughness must reproduce Legacy'
 band=deep_water(first);edge=crop(first,10,310,470,250)
 # The surface must visibly curve across the screen.
 ys=[]
 for x in range(5,edge.width-5):
  hits=[y for y in range(edge.height) if edge.getpixel((x,y))[0]>55]
  if hits:ys.append(min(hits,key=lambda y:abs(y-edge.height/2)))
 assert len(ys)>edge.width*.85 and max(ys)-min(ys)>2,'Legacy ripple line is missing or flat'
 reflection=crop(first,395,270,475,65)
 assert sum(red>40 for red,green,blue in reflection.get_flattened_data())>15,'Legacy lunar shimmer is missing'
 frames(60);moved=snap('water-wave-moved.png')
 assert ImageChops.difference(edge,crop(moved,10,310,470,250)).getbbox(),'Wave animation stayed still'
 assert ImageChops.difference(reflection,crop(moved,395,270,475,65)).getbbox(),'Lunar shimmer stayed still'
 # Moving tessellation can round the fixed gradient by one output level.
 # Row uniformity above still catches visible particle cores, halos and tails.
 assert max(hi for lo,hi in ImageChops.difference(band,deep_water(moved)).getextrema())<=2,'Particles showed through the moving water'
 flat=set_level(0,500);flat_span,_=wave_span(flat);assert flat_span<2.5,'Minimum roughness did not flatten the water'
 rough=set_level(100,500);rough_span,rough_line=wave_span(rough)
 assert rough_span>flat_span+8,'Roughness did not increase visible wave height'
 assert abs(slider_level(rough)-35)<2,'Roughness changed the mean water level'
 snap('water-roughness-100.png');frames(30)
 assert ImageChops.difference(rough_line,wave_span(snap())[1]).getbbox(),'Rough waves stopped animating'
 set_level(25,500)
 wave_at(set_level(75),75);snap('water-level-75.png')
 wave_at(set_level(20),20);snap('water-level-20.png')
 dry=set_level(-15);dry_band=crop(dry,12,210,468,80)
 assert sum(max(p)<8 for p in dry_band.get_flattened_data())/(dry_band.width*dry_band.height)>.95,'Minimum level did not lower the water'
 deep_water(set_level(115));snap('water-level-100.png')
 settled=set_level(50);before_wave=wave_at(settled,50);frames(30)
 assert abs(slider_level(settled,500)-25)<2,'Water level changed the roughness slider'
 assert ImageChops.difference(before_wave,wave_at(snap(),50)).getbbox(),'Adjusting the level stopped the waves'
 set_level(55,500)
 # Changing wind and star speed must not reveal particles underneath the wave.
 tap(275,674);fast=speed(snap());assert ImageChops.difference(slow,fast).getbbox()
 tap(435,28);tap(96,66);tap(435,228);frames(45)
 deep_water(snap('water-wind-down-right.png'))
 tap(48,752);assert ImageChops.difference(menu,snap()).getbbox() is None,'Water leaked into scenery menu'
 tap(240,500);sky=snap('water-original-sky-unchanged.png')
 old_band=crop(sky,12,210,468,80)
 assert sum(max(p)<8 for p in old_band.get_flattened_data())/(old_band.width*old_band.height)>.95,'Original sky unexpectedly gained water'
 assert ImageChops.difference(slow,speed(sky)).getbbox() is None,'Fixture speed state was shared'
 assert not slider_hits(sky),'Water slider leaked into the original sky'
 assert not slider_hits(sky,500),'Roughness slider leaked into the original sky'
 tap(48,752);tap(240,370);again=snap('water-reentered.png')
 assert ImageChops.difference(fast,speed(again)).getbbox() is None,'Water fixture speed reset on reentry'
 assert abs(slider_level(again)-50)<2,'Water level reset on reentry'
 assert abs(slider_level(again,500)-55)<2,'Wave roughness reset on reentry'
 deep_water(again)
 for _ in range(3):
  page.keyboard.down('Escape');frames(2);page.keyboard.up('Escape');frames(5)
 assert ImageChops.difference(home,snap('water-home-restored.png')).getbbox() is None,'Scene leaked into home'
 # A fresh desktop context must support the same live drag with a mouse.
 c.close();c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=False)
 page=c.new_page();page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
 page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000);frames(10)
 r=page.locator('canvas').bounding_box()
 def click(x,y):
  x,y=pt(x,y);page.mouse.move(x,y);page.mouse.down();frames(2);page.mouse.up();frames(5)
 click(240,475);click(240,370);click(240,370)
 x,y=pt(160+230*.35,578);page.mouse.move(x,y);page.mouse.down();frames(2)
 x,y=pt(160+230*.6,578);page.mouse.move(x,y,steps=5);frames(3)
 assert abs(slider_level(snap('water-mouse-drag.png'))-60)<2,'Mouse drag did not update the water live'
 page.mouse.up();frames(3);x,y=pt(160,578);page.mouse.move(x,y);frames(3)
 assert abs(slider_level(snap())-60)<2,'Mouse release did not end slider capture'
 x,y=pt(160+230*.25,500);page.mouse.move(x,y);page.mouse.down();frames(2)
 x,y=pt(160+230*.9,500);page.mouse.move(x,y,steps=5);frames(3)
 mouse_rough=snap('water-mouse-roughness.png')
 assert abs(slider_level(mouse_rough,500)-90)<2 and abs(slider_level(mouse_rough)-60)<2,'Mouse roughness drag changed the wrong slider'
 page.mouse.up();frames(3)
 errors=[s for s in logs if any(v in s for v in ['ERROR:','PAGEERROR','GL_INVALID'])]
 assert not errors,errors
 result={'roughness_height_and_flat_water':'passed','independent_roughness_and_level':'passed','touch_slider_0_to_100':'passed','mouse_slider':'passed','level_persistence_and_live_waves':'passed','legacy_ripples_and_lunar_shimmer':'passed','opaque_water_no_particles':'passed','wind_and_star_controls':'passed','original_scene_unchanged':'passed','independent_fixture_state':'passed','nested_back_and_reentry':'passed','errors':errors}
 (ART/'water-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
