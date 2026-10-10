// Allow microphone access and focused clipboard writes in trustworthy web documents.
const installed=new WeakSet();
function trustworthy(value){
 try{const u=new URL(value);return !u.username&&!u.password&&(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)));}catch{return false;}
}
function documentAllowed(details,origin){
 const url=details.requestingUrl||details.securityOrigin||origin;
 if(!trustworthy(url))return false;
 try{return !details.securityOrigin||new URL(url).origin===new URL(details.securityOrigin).origin;}catch{return false;}
}
function allowRequest(permission,details={}){
 return permission==='media'&&Array.isArray(details.mediaTypes)&&details.mediaTypes.length>0&&details.mediaTypes.every(type=>type==='audio')&&documentAllowed(details);
}
function allowCheck(permission,origin,details={}){
 return permission==='media'&&details.mediaType==='audio'&&documentAllowed(details,origin);
}
function allowClipboardWrite(permission,origin,details={},wc){
 return permission==='clipboard-sanitized-write'&&!!wc&&!wc.isDestroyed()&&wc.isFocused()&&documentAllowed(details,origin);
}
function enableMicrophone(session){
 if(installed.has(session))return;
 session.setPermissionRequestHandler((wc,permission,callback,details)=>callback(allowRequest(permission,details)||allowClipboardWrite(permission,null,details,wc)));
 session.setPermissionCheckHandler((wc,permission,origin,details)=>allowCheck(permission,origin,details)||allowClipboardWrite(permission,origin,details,wc));
 installed.add(session);
}
module.exports={enableMicrophone,allowRequest,allowCheck,allowClipboardWrite};
