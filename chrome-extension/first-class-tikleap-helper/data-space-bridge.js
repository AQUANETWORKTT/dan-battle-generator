window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "first-class-daily-rankings") return;
  if (event.data?.type === "pull-uk-rankings" || event.data?.type === "pull-uk-live-leagues") chrome.runtime.sendMessage({ type: event.data.type, leagues: event.data.leagues });
});

chrome.runtime.onMessage.addListener((message) => {
  if (!["uk-rankings", "uk-rankings-error", "league-rankings-row", "league-rankings-complete", "league-rankings-error"].includes(message?.type)) return;
  window.postMessage({ source: "first-class-tikleap-extension", ...message }, window.location.origin);
});
