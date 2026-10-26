-- Read the game's existing WebGL context. No probe canvas or DOM interface.
local M={}
M.browser_script=[[
(function () {
  var result = {available: false};
  try {
    var canvas = typeof Module !== 'undefined' && Module.canvas;
    if (!canvas) canvas = document.getElementById('canvas');
    if (!canvas) { result.error = 'Game canvas unavailable'; return JSON.stringify(result); }
    var rect = canvas.getBoundingClientRect();
    result.width = canvas.width; result.height = canvas.height;
    result.css_width = Math.round(rect.width); result.css_height = Math.round(rect.height);
    result.dpr = window.devicePixelRatio || 1;
    result.browser = navigator.userAgent;
    var gl = typeof Module !== 'undefined' && Module.ctx;
    if (!gl || typeof gl.getParameter !== 'function' || gl.canvas !== canvas) {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }
    if (!gl) { result.error = 'No active WebGL context'; return JSON.stringify(result); }
    result.available = true; result.context_lost = gl.isContextLost();
    result.width = gl.drawingBufferWidth; result.height = gl.drawingBufferHeight;
    result.api = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1';
    if (result.context_lost) return JSON.stringify(result);
    result.version = gl.getParameter(gl.VERSION);
    result.vendor = gl.getParameter(gl.VENDOR);
    result.renderer = gl.getParameter(gl.RENDERER);
    var debug = gl.getExtension('WEBGL_debug_renderer_info');
    if (debug) {
      result.gpu_vendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL);
      result.gpu_renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
    }
    result.gpu_details = !!result.gpu_renderer;
  } catch (error) { result.error = String(error.message || error); }
  return JSON.stringify(result);
})()
]]
function M.renderer_status(web)
    if not web.available then return 'อ่าน WebGL ไม่ได้' end
    if web.context_lost then return 'Context lost · การเรนเดอร์ถูกขัดจังหวะ' end
    local renderer=(web.gpu_renderer or web.renderer or ''):lower()
    for _,name in ipairs({'swiftshader','llvmpipe','softpipe','lavapipe','software','basic render'}) do
        if renderer:find(name,1,true) then return 'Software renderer · ใช้ CPU เรนเดอร์' end
    end
    if not web.gpu_details then return 'WebGL ทำงาน · ชื่อ GPU ถูกซ่อน' end
    return 'WebGL ทำงาน · พบชื่อ GPU ด้านล่าง'
end
function M.collect()
    local info={system=sys.get_sys_info(),engine=sys.get_engine_info()}
    if html5 and html5.run then
        local ok,web=pcall(function() return json.decode(html5.run(M.browser_script)) end)
        info.web=ok and type(web)=='table' and web or {available=false,error='Browser information unavailable'}
    end
    return info
end
return M
