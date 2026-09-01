function pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function findAll(selector, root = document) {
  const results = [...root.querySelectorAll(selector)];
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) results.push(...findAll(selector, element.shadowRoot));
  }
  return results;
}

function buttonByText(root, text) {
  return findAll('button,[role="button"]', root).find((button) => button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() === text.toLowerCase());
}

function setValue(input, value) {
  input.focus();
  input.click();
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, value);
}

async function waitFor(predicate, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = predicate();
    if (value) return value;
    await pause(250);
  }
  throw new Error("Backstage took too long to return availability.");
}

async function checkAvailability(creators) {
  const openInvite = await waitFor(() => buttonByText(document, "Invite creators"), 30000)
    .catch(() => null);
  if (!openInvite) throw new Error("LIVE Backstage is open, but its Invite creators button did not finish loading. Refresh Backstage and try again.");
  openInvite.click();
  const dialog = await waitFor(() => findAll('[role="dialog"]').find((element) => /Add creators/i.test(element.textContent || "")));
  const input = findAll('textarea, input[placeholder*="30 creators"]', dialog)[0];
  if (!input) throw new Error("Backstage did not show the creator entry box.");
  const usernames = creators.map((creator) => creator.username).join("\n");
  setValue(input, usernames);
  await waitFor(() => input.value === usernames, 3000);
  const next = buttonByText(dialog, "Next");
  if (!next) throw new Error("Backstage did not show the availability step.");
  next.click();
  const rows = await waitFor(() => findAll('[role="row"]', dialog).filter((row) => /Available|Ineligible/i.test(row.textContent || "")));
  const results = creators.map((creator) => {
    const row = rows.find((candidate) => (candidate.textContent || "").includes(creator.username));
    const text = row?.textContent?.replace(/\s+/g, " ").trim() || "";
    const available = /\bAvailable\b/i.test(text) && !/Ineligible/i.test(text);
    return { ...creator, available, invitationType: available ? (/\bPremium\b/i.test(text) ? "Premium" : "Regular") : "", reason: available ? "" : (text.match(/Ineligible\s+(.+?)(?:\s+Follow|$)/i)?.[1] || "Not available") };
  });
  const close = findAll('button,[role="button"]', dialog)[0];
  close?.click();
  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "check-backstage-batch") return;
  // With Workspace embedded in multiple frames, only the frame that owns the
  // visible Invite creators control should handle this batch.
  if (!buttonByText(document, "Invite creators")) return;
  checkAvailability(Array.isArray(message.creators) ? message.creators : [])
    .then((results) => sendResponse({ results }))
    .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Could not check Backstage availability." }));
  return true;
});
