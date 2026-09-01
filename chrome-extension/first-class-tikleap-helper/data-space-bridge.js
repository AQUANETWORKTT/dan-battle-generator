window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "first-class-daily-rankings") return;
  if (event.data?.type === "pull-uk-rankings" || event.data?.type === "pull-uk-live-leagues") {
    chrome.runtime.sendMessage({ type: event.data.type, leagues: event.data.leagues }).catch(() => {
      window.postMessage({ source: "first-class-tikleap-extension", type: "league-rankings-error", error: "The helper was just reloaded. Refresh Creator Search, then try again." }, window.location.origin);
    });
  }
  if (event.data?.type === "check-backstage-availability") {
    chrome.runtime.sendMessage({ type: event.data.type, creators: event.data.creators }).catch(() => {
      window.postMessage({ source: "first-class-tikleap-extension", type: "availability-error", error: "The helper was just reloaded. Refresh Creator Search, then try again." }, window.location.origin);
    });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!["uk-rankings", "uk-rankings-error", "league-rankings-row", "league-rankings-complete", "league-rankings-error", "availability-progress", "availability-complete", "availability-error"].includes(message?.type)) return;
  window.postMessage({ source: "first-class-tikleap-extension", ...message }, window.location.origin);
});
