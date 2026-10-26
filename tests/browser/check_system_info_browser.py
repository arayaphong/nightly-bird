"""Actual in-game diagnostics: canvas renderer, navigation, DPR and masked GPU."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import json,re,subprocess,sys

URL=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8150/'
ART=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/tmp/nightly-system-info')
ART.mkdir(parents=True,exist_ok=True)
reader=re.search(r'M.browser_script=\[\[(.*?)\]\]',
    (Path(__file__).resolve().parents[2]/'shared/diagnostics/system.lua').read_text(),re.S)[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
        args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    logs=[]
    def record(value):
        logs.append(value);(ART/'browser.log').write_text('\n'.join(logs))
    def frames(n=3):
        page.evaluate('n=>new Promise(done=>{const tick=()=>--n<=0?done():requestAnimationFrame(tick);requestAnimationFrame(tick)})',n)
    def key(value):
        page.keyboard.down(value);frames(2);page.keyboard.up(value);frames()
    def snapshot(name):
        path=ART/(name+'.png');page.screenshot(path=str(path),scale='css')
        image=Image.open(path);image.resize((image.width*2,image.height*2)).save(ART/(name+'-ocr.png'))
        text=subprocess.run(['tesseract',str(ART/(name+'-ocr.png')),'stdout','--psm','11'],
            capture_output=True,text=True,check=True).stdout
        (ART/(name+'.txt')).write_text(text);return text
    def load(context):
        global page
        page=context.new_page();page.on('console',lambda m:record(m.text));page.on('pageerror',lambda e:record('PAGEERROR '+str(e)))
        page.goto(URL);page.wait_for_function('window.Module && Module.calledRun',timeout=60000);frames(6)
    context=browser.new_context(viewport={'width':1000,'height':600},device_scale_factor=1)
    load(context);canvases=page.locator('canvas').count();key('3');frames(6)
    info=json.loads(page.evaluate(reader))
    assert info['available'] and info['gpu_details'] and 'SwiftShader' in info['gpu_renderer'],info
    text=snapshot('system-info');assert 'SYSTEM INFO' in text and 'WebGL' in text and 'SwiftShader' in text,text
    assert 'Software renderer' in text,text
    assert page.locator('canvas').count()==canvases,'A separate probe canvas was created'
    key('Escape')
    for k in ['1','2','3']:key(k)
    frames(8)
    for _ in range(3):key('Escape')
    key('3');frames(5);snapshot('last-tested-fish')
    page.set_viewport_size({'width':1200,'height':540});frames(5);snapshot('ultrawide-info')
    page.set_viewport_size({'width':390,'height':844});frames(5);snapshot('portrait-info')
    context.close()
    # A browser may hide the GPU extension. The GUI must remain usable at DPR 2.
    context=browser.new_context(viewport={'width':844,'height':390},device_scale_factor=2,is_mobile=True,has_touch=True)
    context.add_init_script("""for(const type of [WebGLRenderingContext,WebGL2RenderingContext]) {
      const original=type.prototype.getExtension;
      type.prototype.getExtension=function(name){return name==='WEBGL_debug_renderer_info'?null:original.call(this,name)};
    }""")
    load(context)
    r=page.locator('canvas').bounding_box();s=min(r['width']/1280,r['height']/720)
    page.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2+(360-210)*s);frames(6)
    masked=json.loads(page.evaluate(reader))
    assert masked['available'] and not masked['gpu_details'] and masked['dpr']==2,masked
    assert abs(masked['width']-masked['css_width']*2)<=2 and abs(masked['height']-masked['css_height']*2)<=2
    text=snapshot('masked-gpu-dpr2');assert 'SYSTEM INFO' in text and 'WebGL' in text,text
    assert 'Software renderer' not in text,'Masked renderer was misidentified as software'
    errors=[s for s in logs if any(x in s for x in ['ERROR:','PAGEERROR','GL_INVALID'])]
    assert not errors,errors
    result={'actual_game_context':info,'masked_context':masked,'in_game_gui_and_mouse_keyboard_touch':'passed',
        'last_scene_snapshot':'captured','dpr_and_rotation':'passed','errors':errors}
    (ART/'system-info-test.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));browser.close()
