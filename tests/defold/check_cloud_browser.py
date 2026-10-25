"""Optional rendered cloud/action check; requires Playwright, Chromium and Pillow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import base64,io,json,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-cloud-test')
ART.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=[
        '--no-sandbox','--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    page=context.new_page();logs=[]
    page.on('console',lambda m:logs.append(m.text))
    page.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
    # Capture inside a rendered frame: an external screenshot can miss a short
    # lightning action when Chromium uses a slow software GPU in CI.
    page.add_init_script('''
        window.__energy=0;window.__cloudFrames=[];
        const create=BaseAudioContext.prototype.createBufferSource;
        BaseAudioContext.prototype.createBufferSource=function(...args){
            const n=create.apply(this,args),start=n.start;
            n.start=function(...args){const a=n.buffer?.getChannelData(0);
                if(a)for(const v of a)window.__energy+=v*v;
                return start.apply(this,args)};return n;
        };
        const raf=window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame=fn=>raf(t=>{
            fn(t);
            if(window.__captureCloud && window.__cloudFrames.length<30){
                const c=document.querySelector('canvas');
                if(c && c.width)window.__cloudFrames.push(c.toDataURL());
            }
        });
    ''')
    page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000)
    def frames(n):
        page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
    frames(8);r=page.locator('canvas').bounding_box();session=context.new_cdp_session(page)
    def pt(x,y):return r['x']+x/480*r['width'],r['y']+(800-y)/800*r['height']
    def touch(kind,x=None,y=None):
        points=[]
        if x is not None:
            x,y=pt(x,y);points=[{'id':1,'x':x,'y':y}]
        session.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    def tap(x,y,after=5):
        touch('touchStart',x,y);frames(2);touch('touchEnd');frames(after)
    def screenshot(name):
        raw=page.screenshot();(ART/name).write_bytes(raw)
        return Image.open(io.BytesIO(raw)).convert('RGB')
    def ready(im):
        x,y=pt(130,190);red,green,blue=im.getpixel((round(x),round(y)))
        return red>120 and green>200 and blue<150
    screenshot('rive-cloud-gallery.png')
    tap(390,300);assert ready(screenshot('rive-cloud-design-a.png'))
    page.evaluate('window.__energy=0;window.__cloudFrames=[];window.__captureCloud=true')
    tap(240,190,1);page.wait_for_timeout(750);frames(4)
    page.evaluate('window.__captureCloud=false')
    assert ready(screenshot('rive-cloud-recovered.png')),'Action button did not recover'
    assert page.evaluate('window.__energy')>1e-6,'Thunder produced no audio'
    best=None;best_count=0;busy_seen=False
    for data in page.evaluate('window.__cloudFrames'):
        raw=base64.b64decode(data.split(',',1)[1]);im=Image.open(io.BytesIO(raw)).convert('RGB')
        # Bolt lies below the cloud, away from the text and action button.
        count=sum(1 for y in range(round(im.height*.47),round(im.height*.66))
                  for x in range(round(im.width*.38),round(im.width*.65))
                  if min(im.getpixel((x,y)))>180)
        red,green,blue=im.getpixel((round(im.width*130/480),round(im.height*610/800)))
        busy_seen|=not (red>120 and green>200 and blue<150)
        if count>best_count:best,best_count=raw,count
    assert best_count>15,('Vector lightning did not render',best_count)
    assert busy_seen,'Action never showed its busy button'
    (ART/'rive-cloud-lightning.png').write_bytes(best)
    # Keyboard action works too. Returning home during it clears the state.
    page.evaluate('window.__energy=0')
    page.keyboard.down('Space');frames(2);page.keyboard.up('Space')
    frames(2);assert page.evaluate('window.__energy')>1e-6,'Space did not trigger thunder'
    tap(48,752);tap(390,300)
    assert ready(screenshot('rive-cloud-reentered.png')),'Leaving did not reset the action'
    errors=[s for s in logs if any(t in s for t in ['ERROR:','PAGEERROR','GL_INVALID'])]
    assert not errors,errors
    result={'vector_lightning_pixels':best_count,'busy_and_recovery':'passed',
            'touch_and_keyboard':'passed','thunder_audio':'passed','leave_resets':'passed','errors':errors}
    (ART/'rive-cloud-browser-test.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result));browser.close()
