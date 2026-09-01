const UK_RANKINGS_URL = "https://www.tikleap.com/country/gb";
// Only target the lower live leagues: B3–B5, C1–C5 and D1–D5.
const LEAGUES = ["B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5"];

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

function navigateAndWait(tabId, url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("TickLeap took too long to load.")); }, 30000);
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(tabId);
    }
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tabId, { url }).catch((error) => { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); reject(error); });
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "uk-rankings-result") {
    sendToDataSpace(message.dataSpaceTabId, message.usernames?.length
      ? { type: "uk-rankings", usernames: message.usernames }
      : { type: "uk-rankings-error", error: "TickLeap did not show the 99 UK ranking names yet. Please try again in a moment." });
    return;
  }
  if (message?.type === "league-rankings-result") {
    sendToDataSpace(message.dataSpaceTabId, { type: "league-rankings-row", league: message.league, rows: message.rows || [] });
    return;
  }
  if (message?.type === "pull-uk-live-leagues" && sender.tab?.id) {
    const dataSpaceTabId = sender.tab.id;
    const requestedLeagues = Array.isArray(message.leagues)
      ? message.leagues.map((league) => String(league).toUpperCase()).filter((league) => LEAGUES.includes(league))
      : LEAGUES;
    (async () => {
      let readerTab;
      try {
        if (!requestedLeagues.length) throw new Error("Select at least one live league.");
        readerTab = await chrome.tabs.create({ url: "about:blank", active: false });
        if (!readerTab.id) throw new Error("Could not open TickLeap.");
        for (const league of requestedLeagues) {
          const url = `${UK_RANKINGS_URL}/league/${league.toLowerCase()}`;
          await navigateAndWait(readerTab.id, url);
          await chrome.tabs.sendMessage(readerTab.id, { type: "read-league-rankings", dataSpaceTabId });
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        sendToDataSpace(dataSpaceTabId, { type: "league-rankings-complete", leagues: requestedLeagues });
      } catch (error) {
        sendToDataSpace(dataSpaceTabId, { type: "league-rankings-error", error: error instanceof Error ? error.message : "Could not read TickLeap live leagues." });
      } finally {
        if (readerTab?.id) chrome.tabs.remove(readerTab.id).catch(() => {});
      }
    })();
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
