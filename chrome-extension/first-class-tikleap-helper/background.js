const UK_RANKINGS_URL = "https://www.tikleap.com/country/gb";

function sendToDataSpace(tabId, message) {
  if (tabId) chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

function waitForTickLeapTab(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("TickLeap took too long to load.")); }, 30000);
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(tabId);
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "uk-rankings-result") {
    sendToDataSpace(message.dataSpaceTabId, message.usernames?.length
      ? { type: "uk-rankings", usernames: message.usernames }
      : { type: "uk-rankings-error", error: "TickLeap did not show the 99 UK ranking names yet. Please try again in a moment." });
    return;
  }
  if (message?.type !== "pull-uk-rankings" || !sender.tab?.id) return;
  const dataSpaceTabId = sender.tab.id;
  (async () => {
    try {
      const tabs = await chrome.tabs.query({ url: "https://www.tikleap.com/*" });
      let tickleapTab = tabs.find((candidate) => candidate.url?.startsWith(UK_RANKINGS_URL));
      if (!tickleapTab?.id) {
        tickleapTab = await chrome.tabs.create({ url: UK_RANKINGS_URL, active: false });
        if (!tickleapTab.id) throw new Error("Could not open TickLeap.");
        await waitForTickLeapTab(tickleapTab.id);
      }
      await chrome.tabs.sendMessage(tickleapTab.id, { type: "read-uk-rankings", dataSpaceTabId });
    } catch (error) {
      sendToDataSpace(dataSpaceTabId, { type: "uk-rankings-error", error: error instanceof Error ? error.message : "Could not open TickLeap." });
    }
  })();
});
