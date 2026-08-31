window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "first-class-daily-rankings" || event.data?.type !== "pull-uk-rankings") return;
  chrome.runtime.sendMessage({ type: "pull-uk-rankings" });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "uk-rankings" && message?.type !== "uk-rankings-error") return;
  window.postMessage({ source: "first-class-tikleap-extension", ...message }, window.location.origin);
});
