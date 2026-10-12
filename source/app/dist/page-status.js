window.orbitPageStatus.onState(state=>{
 const zh=state.language==='zh',tr=(en,cn)=>zh?cn:en,code=state.code||'';let title=tr('Unable to open this page','无法打开此网页'),message=tr('Check the address and your internet connection, then try again.','请检查网址及网络连接，然后重试。');
 if(state.kind==='loading'){title=tr('Opening page…','正在打开网页…');message=tr('Waiting for the website to respond.','正在等待网站响应。');}
 else if(state.kind==='slow'){title=tr('This website is taking longer than expected','网站响应时间较长');message=tr('No visible response has arrived yet. You can keep waiting, check the address or try again.','暂未收到可显示的响应。你可以继续等待、检查网址或重试。');}
 else if(state.kind==='empty'){title=tr('This page returned no visible content','网页未返回可显示的内容');message=tr('Check the address, try reloading or view the original response.','请检查网址、重试，或查看网站原始响应。');}
 else if(state.kind==='http'){title=tr('The website returned an error','网站返回了错误');message=code==='404'?tr('This page could not be found. Check the address.','找不到此页面，请检查网址。'):code==='403'?tr('The website denied access. You may need to sign in or view its original response.','网站拒绝访问，你可能需要登录或查看原始响应。'):code==='401'?tr('The website requires sign-in. View its original response to continue.','网站要求登录，请查看原始响应继续。'):tr('The website could not complete this request. Try again later or view its original response.','网站暂时无法完成请求，请稍后重试或查看原始响应。');}
 else if(state.kind==='crash'){title=tr('This page stopped unexpectedly','网页意外停止运行');message=tr('Reload the page to continue. Other tabs remain available.','请重试加载此页，其他标签仍可使用。');}
 else if(state.kind==='unresponsive'){title=tr('This page is not responding','网页暂时没有响应');message=tr('You can wait, view the page or reload it.','你可以继续等待、查看网页或重新加载。');}
 else if(/NAME_NOT_RESOLVED|NAME_RESOLUTION/.test(code))message=tr('The website address could not be found. Check the spelling and your network connection.','无法找到此网址，请检查拼写及网络连接。');
 else if(/CERT_|SSL_/.test(code))message=tr('A secure connection could not be established. Check the address, your clock and the website certificate.','无法建立安全连接，请检查网址、系统时间及网站证书。');
 else if(/INTERNET_DISCONNECTED|NETWORK_CHANGED/.test(code))message=tr('Check your internet connection, then try again.','请检查网络连接后重试。');
 else if(/TIMED_OUT/.test(code))message=tr('The website did not respond in time. Try again or check the address.','网站未及时响应，请重试或检查网址。');
 document.querySelector('#edit').hidden=state.pane==='chat';document.documentElement.lang=zh?'zh-CN':'en';document.title=title;document.querySelector('#title').textContent=title;document.querySelector('#message').textContent=message;document.querySelector('#url').textContent=state.url||'';document.querySelector('#code').textContent=code?(state.kind==='http'?'HTTP '+code:code):'';
 for(const [id,label] of [['retry',tr('Retry','重试')],['edit',tr('Edit address','修改网址')],['home',tr('Workspace home','工作台主页')],['original',state.kind==='slow'||state.kind==='loading'?tr('Keep waiting','继续等待'):tr('View website response','查看网站响应')]])document.getElementById(id).textContent=label;
});
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)window.orbitPageStatus.action(button.dataset.action);});
