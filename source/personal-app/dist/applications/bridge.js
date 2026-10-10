window.desktopAPI=Object.freeze({
 readEmail:async name=>{const result=await parent.orbitDesktop.readApplicationEmail(name);if(result.ok===false)throw Error(result.error);return result;},
 openWebsite:url=>parent.openWebsite(url),
 onOpenBrowserTab:()=>()=>{},
 getApplications:()=>parent.orbitDesktop.getApplications(),
 saveApplication:input=>parent.orbitDesktop.saveApplication(input),
 saveBudget:input=>parent.orbitDesktop.saveApplicationBudget(input),
 syncApplications:()=>parent.orbitDesktop.syncApplications(),
 authorizeCalendar:()=>parent.enableCalendarWrite()
});
