'use strict';
// Chromium's OOPIF PDF path can leave the native document surface blank in
// Windows WebContentsView while parsing, text and thumbnails still work.
// Keep the established PDF guest renderer; retain normal GPU acceleration.
function configurePdfRendering(app){
 if(process.platform!=='win32')return;
 const disabled=new Set(app.commandLine.getSwitchValue('disable-features').split(',').filter(Boolean));
 disabled.add('PdfOopif');
 app.commandLine.appendSwitch('disable-features',[...disabled].join(','));
}
module.exports={configurePdfRendering};
