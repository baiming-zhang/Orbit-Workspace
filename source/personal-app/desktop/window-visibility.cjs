'use strict';
// Restore a minimized window before revealing it; keep its existing size/state.
function revealWindow(win,{focus=false,maximized}={}){
 if(!win||win.isDestroyed())return;
 const keepMaximized=maximized??win.isMaximized();
 if(win.isMinimized())win.restore();
 if(!win.isVisible())win.show();
 if(keepMaximized&&!win.isMaximized())win.maximize();
 if(focus)win.focus();
}
module.exports={revealWindow};

