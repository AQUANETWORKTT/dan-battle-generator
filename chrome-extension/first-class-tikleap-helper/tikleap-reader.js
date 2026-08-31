function readUkRankings() {
  const heading = [...document.querySelectorAll("h1,h2,h3,div")].find((element) => /TikTok daily ranking\s*-\s*United Kingdom/i.test(element.textContent || ""));
  let container = heading;
  while (container && container.querySelectorAll('a[href*="/profile/"]').length < 90) container = container.parentElement;
  const seen = new Set();
  return [...(container || document).querySelectorAll('a[href*="/profile/"]')]
    .map((link) => {
      const match = link.href.match(/\/profile\/([^/?#]+)/i);
      const rank = Number((link.textContent || "").trim().match(/^(\d+)\b/)?.[1] || 0);
      return { rank, username: match?.[1] || "" };
    })
    .filter((row) => row.rank > 0 && row.rank <= 99 && row.username && !seen.has(row.username) && (seen.add(row.username), true))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 99)
    .map((row) => row.username);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "read-uk-rankings") return;
  const usernames = readUkRankings();
  chrome.runtime.sendMessage({ type: "uk-rankings-result", dataSpaceTabId: message.dataSpaceTabId, usernames });
});
