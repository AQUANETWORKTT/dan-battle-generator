const UK_RANKINGS_URL = "https://www.tikleap.com/country/gb";
// Target the requested UK live leagues: A1–A3, B1–B5, C1–C5 and D1–D5.
const LEAGUES = ["A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5"];
const backstageBatchWaiters = new Map();

function sendToDataSpace(tabId, message) {
  if (tabId) chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

async function insertBackstageText(tabId, text) {
  const target = { tabId };
  try {
    await chrome.debugger.attach(target, "1.3");
    await chrome.debugger.sendCommand(target, "Input.insertText", { text });
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
}

async function clickBackstageControl(tabId, point) {
  const target = { tabId };
  try {
    await chrome.debugger.attach(target, "1.3");
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  } finally {
    await chrome.debugger.detach(target).catch(() => {});
  }
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

function waitForBackstageBatch(tabId, creators) {
  const jobId = crypto.randomUUID();
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      backstageBatchWaiters.delete(jobId);
      reject(new Error("Backstage took too long to return this availability batch."));
    }, 60000);
    backstageBatchWaiters.set(jobId, { resolve, reject, timer });
    const message = { type: "check-backstage-batch", jobId, creators };
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (!/Receiving end does not exist/i.test(error instanceof Error ? error.message : "")) {
        clearTimeout(timer);
        backstageBatchWaiters.delete(jobId);
        reject(error);
        return;
      }
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["backstage-availability-reader.js"] });
        await chrome.tabs.sendMessage(tabId, message);
      } catch (retryError) {
        clearTimeout(timer);
        backstageBatchWaiters.delete(jobId);
        reject(retryError);
      }
    }
  });
}

async function checkBackstageBatch(tabId, creators) {
  return waitForBackstageBatch(tabId, creators);
}

function resolveBackstageBatch(message) {
  const waiter = backstageBatchWaiters.get(message.jobId);
  if (!waiter) return;
  clearTimeout(waiter.timer);
  backstageBatchWaiters.delete(message.jobId);
  waiter.resolve({ results: Array.isArray(message.results) ? message.results : [], error: message.error });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "backstage-batch-results") {
    resolveBackstageBatch(message);
    return;
  }
  if (message?.type === "insert-backstage-text" && sender.tab?.id) {
    insertBackstageText(sender.tab.id, String(message.text || ""))
      .then(() => sender.tab && chrome.tabs.sendMessage(sender.tab.id, { type: "backstage-text-inserted" }))
      .catch(() => sender.tab && chrome.tabs.sendMessage(sender.tab.id, { type: "backstage-text-insert-failed" }));
    return;
  }
  if (message?.type === "click-backstage-control" && sender.tab?.id) {
    clickBackstageControl(sender.tab.id, { x: Number(message.x || 0), y: Number(message.y || 0) })
      .then(() => sender.tab && chrome.tabs.sendMessage(sender.tab.id, { type: "backstage-control-clicked" }))
      .catch(() => sender.tab && chrome.tabs.sendMessage(sender.tab.id, { type: "backstage-control-click-failed" }));
    return;
  }
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
  if (message?.type === "check-backstage-availability" && sender.tab?.id) {
    const dataSpaceTabId = sender.tab.id;
    const creators = Array.isArray(message.creators) ? message.creators.slice(0, 1500) : [];
    (async () => {
      try {
        const backstageTabs = await chrome.tabs.query({ url: "https://live-backstage.tiktok.com/*" });
        const backstage = backstageTabs.find((tab) => tab.id && /\/portal\/overview/.test(tab.url || "")) || backstageTabs.find((tab) => tab.id && /\/portal\//.test(tab.url || "")) || backstageTabs.find((tab) => tab.id);
        if (!backstage?.id) throw new Error("Open LIVE Backstage in Chrome and sign in first.");
        const allResults = [];
        for (let start = 0; start < creators.length; start += 30) {
          let pending = creators.slice(start, start + 30);
          let attempts = 0;
          while (pending.length && attempts < 3) {
            const response = await checkBackstageBatch(backstage.id, pending);
            if (response?.error) throw new Error(response.error);
            const returned = response?.results || [];
            allResults.push(...returned.filter((result) => !result.retry));
            pending = returned.filter((result) => result.retry).map(({ retry, ...result }) => result);
            attempts += 1;
            if (pending.length) await new Promise((resolve) => setTimeout(resolve, 2000));
          }
          if (pending.length) allResults.push(...pending.map((result) => ({ ...result, available: false, invitationType: "", reason: "Backstage network error — could not verify", retry: false })));
          sendToDataSpace(dataSpaceTabId, {
            type: "availability-progress",
            checked: allResults.length,
            total: creators.length,
            results: allResults,
            available: allResults.filter((result) => result.available).length,
          });
        }
        sendToDataSpace(dataSpaceTabId, { type: "availability-complete", results: allResults });
      } catch (error) { sendToDataSpace(dataSpaceTabId, { type: "availability-error", error: error instanceof Error ? error.message : "Could not check availability." }); }
    })();
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
