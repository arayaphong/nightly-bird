/* Browser canvas framing only; all Studio content and layout are rendered by Defold. */
(() => {
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#080e19; }
      .canvas-app-container { position:absolute; margin:0!important; background:#080e19!important; }
      #canvas { display:block; touch-action:none; outline:none; }
      .buttons-background { background:#080e19!important; height:24px!important; }
      .button,.link { margin-top:2px!important; padding:0 5px!important; font-size:12px!important; line-height:20px!important; }
      #portrait-hint { position:fixed; top:20px; width:100%; text-align:center; color:#d9e3f4;
        font:16px system-ui,sans-serif; pointer-events:none; }
    `;
    document.head.append(style);
    const hint = document.createElement('div');
    hint.id = 'portrait-hint'; hint.textContent = 'หมุนอุปกรณ์เป็นแนวตั้ง';
    document.body.append(hint);
    CUSTOM_PARAMETERS.resize_window_callback = () => {
        const full = !!document.fullscreenElement;
        const footer = full ? 0 : 24;
        const availableW = window.innerWidth;
        const availableH = Math.max(1,window.innerHeight-footer);
        // Portrait canvas. Tall phones use their available area; wider windows
        // fit a portrait frame while every GUI and character keeps its ratio.
        const height = availableH;
        const width = Math.min(availableW,height*480/800);
        const app = document.getElementById('app-container');
        const canvas = document.getElementById('canvas');
        app.style.left = Math.max(0,(availableW-width)/2)+'px'; app.style.top = '0px';
        app.style.width = width+'px'; app.style.height = height+footer+'px';
        canvas.style.width=width+'px'; canvas.style.height=height+'px';
        const dpi=window.devicePixelRatio||1;
        const w=Math.max(1,Math.floor(width*dpi)), h=Math.max(1,Math.floor(height*dpi));
        if(canvas.width!==w)canvas.width=w;
        if(canvas.height!==h)canvas.height=h;
        hint.style.display=availableW>availableH?'block':'none';
    };
    document.addEventListener('fullscreenchange',()=>{
        CUSTOM_PARAMETERS.resize_window_callback();
        if(document.fullscreenElement && screen.orientation?.lock)
            screen.orientation.lock('portrait').catch(()=>{});
    });
})();
