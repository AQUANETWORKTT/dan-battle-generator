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

function diamondsToNumber(value) {
  const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return 0;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[String(match[2] || "").toUpperCase()] || 1;
  return Math.round(Number(match[1]) * multiplier);
}

function readLeagueRankings() {
  const league = location.pathname.match(/\/league\/([a-d][1-5])/i)?.[1]?.toUpperCase() || "";
  const rows = [...document.querySelectorAll('a[href*="/profile/"]')]
    .map((link) => {
      const username = link.href.match(/\/profile\/([^/?#]+)/i)?.[1] || "";
      const text = (link.textContent || "").replace(/\s+/g, " ").trim();
      const rank = Number(text.match(/^(\d+)\b/)?.[1] || 0);
      const diamondText = text.match(/(\d+(?:\.\d+)?[KMB]?)\s*$/i)?.[1] || "";
      return { rank, username, diamonds: diamondsToNumber(diamondText), diamondText, liveNow: /\blive now\b/i.test(text) };
    })
    .filter((row) => row.rank > 0 && row.rank <= 100 && row.username)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 100);
  return { league, rows };
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "read-uk-rankings") {
    const usernames = readUkRankings();
    chrome.runtime.sendMessage({ type: "uk-rankings-result", dataSpaceTabId: message.dataSpaceTabId, usernames });
  } else if (message?.type === "read-league-rankings") {
    chrome.runtime.sendMessage({ type: "league-rankings-result", dataSpaceTabId: message.dataSpaceTabId, ...readLeagueRankings() });
  }
});
