chrome.action.onClicked.addListener(async tab=>{
  if(!tab.url?.startsWith('https://www.tiktok.com/')){
    await chrome.tabs.create({url:chrome.runtime.getURL('controller.html')});return;
  }
  await chrome.windows.create({url:chrome.runtime.getURL('controller.html')+'?tab='+tab.id,type:'popup',width:620,height:650});
});
