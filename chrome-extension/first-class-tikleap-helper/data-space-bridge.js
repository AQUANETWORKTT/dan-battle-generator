window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "first-class-daily-rankings") return;
  const reportDisconnected = (type) => window.postMessage({ source: "first-class-tikleap-extension", type, error: "The helper was reloaded. Refresh this Creator Search page, then try again." }, window.location.origin);
  if (event.data?.type === "pull-uk-rankings" || event.data?.type === "pull-uk-live-leagues") {
    try { chrome.runtime.sendMessage({ type: event.data.type, leagues: event.data.leagues }).catch(() => reportDisconnected("league-rankings-error")); }
    catch { reportDisconnected("league-rankings-error"); }
  }
  if (event.data?.type === "check-backstage-availability") {
    try { chrome.runtime.sendMessage({ type: event.data.type, creators: event.data.creators }).catch(() => reportDisconnected("availability-error")); }
    catch { reportDisconnected("availability-error"); }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!["uk-rankings", "uk-rankings-error", "league-rankings-row", "league-rankings-complete", "league-rankings-error", "availability-progress", "availability-complete", "availability-error"].includes(message?.type)) return;
  window.postMessage({ source: "first-class-tikleap-extension", ...message }, window.location.origin);
});
