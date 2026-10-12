'use strict';
const {nativeTheme}=require('electron'),palette=require('../dist/theme-palette.js');
function themeView(view){const refresh=()=>{if(!view.webContents.isDestroyed())view.setBackgroundColor(palette[nativeTheme.shouldUseDarkColors?'dark':'light'].bg);};refresh();nativeTheme.on('updated',refresh);view.webContents.on('did-start-navigation',refresh);view.webContents.once('destroyed',()=>nativeTheme.removeListener('updated',refresh));return view;}
module.exports={themeView};
