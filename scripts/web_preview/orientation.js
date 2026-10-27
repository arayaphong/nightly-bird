/* Canvas/orientation integration only. All visible controls and layout are Defold GUI. */
(() => {
    const key = 'nightly-bird-orientation';
    let selected = 'portrait';
    try { if (localStorage.getItem(key) === 'landscape') selected = 'landscape'; } catch (_) {}
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#080e19; }
      .canvas-app-container { position:absolute; margin:0!important; background:#080e19!important; }
      #canvas { display:block; touch-action:none; outline:none; }
      .buttons-background { background:#080e19!important; height:24px!important; }
      .button,.link { margin-top:2px!important; padding:0 5px!important; font-size:12px!important; line-height:20px!important; }
    `;
    document.head.append(style);
    function resize() {
        const footer = document.fullscreenElement ? 0 : 24;
        const availableW = Math.max(1,window.innerWidth);
        const availableH = Math.max(1,window.innerHeight-footer);
        const wide = selected === 'landscape';
        const width = wide ? availableW : Math.min(availableW,availableH*480/800);
        const height = wide ? Math.min(availableH,width*9/16) : availableH;
        const app = document.getElementById('app-container');
        const canvas = document.getElementById('canvas');
        app.style.left = Math.max(0,(availableW-width)/2)+'px';
        app.style.top = Math.max(0,(availableH-height)/2)+'px';
        app.style.width = width+'px';app.style.height = height+footer+'px';
        canvas.style.width = width+'px';canvas.style.height = height+'px';
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1,Math.floor(width*dpr)),h = Math.max(1,Math.floor(height*dpr));
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
    }
    function lock() {
        if (document.fullscreenElement && screen.orientation?.lock)
            return screen.orientation.lock(selected).catch(() => {});
        return Promise.resolve();
    }
    window.NightlyDisplay = {
        getOrientation: () => selected,
        setOrientation(mode) {
            if (mode !== 'portrait' && mode !== 'landscape') return selected;
            selected = mode;
            try { localStorage.setItem(key,selected); } catch (_) {}
            resize();window.dispatchEvent(new Event('resize'));
            // Browser orientation locking usually requires fullscreen and a user gesture.
            if (!document.fullscreenElement && screen.orientation?.lock && document.documentElement.requestFullscreen)
                document.documentElement.requestFullscreen().then(lock).catch(() => {});
            else lock();
            return selected;
        }
    };
    CUSTOM_PARAMETERS.resize_window_callback = resize;
    document.addEventListener('fullscreenchange',() => {resize();lock();});
})();
