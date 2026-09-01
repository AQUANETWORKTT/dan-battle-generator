function pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function buttonByText(root, text) {
  return [...root.querySelectorAll("button")].find((button) => button.textContent?.trim().toLowerCase() === text.toLowerCase());
}

function setValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
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
  const dialog = await waitFor(() => [...document.querySelectorAll('[role="dialog"]')].find((element) => /Add creators/i.test(element.textContent || "")));
  const input = dialog.querySelector('textarea, input[placeholder*="30 creators"]');
  if (!input) throw new Error("Backstage did not show the creator entry box.");
  setValue(input, creators.map((creator) => creator.username).join("\n"));
  const next = buttonByText(dialog, "Next");
  if (!next) throw new Error("Backstage did not show the availability step.");
  next.click();
  const rows = await waitFor(() => [...dialog.querySelectorAll('[role="row"]')].filter((row) => /Available|Ineligible/i.test(row.textContent || "")));
  const results = creators.map((creator) => {
    const row = rows.find((candidate) => (candidate.textContent || "").includes(creator.username));
    const text = row?.textContent?.replace(/\s+/g, " ").trim() || "";
    const available = /\bAvailable\b/i.test(text) && !/Ineligible/i.test(text);
    return { ...creator, available, invitationType: available ? (/\bPremium\b/i.test(text) ? "Premium" : "Regular") : "", reason: available ? "" : (text.match(/Ineligible\s+(.+?)(?:\s+Follow|$)/i)?.[1] || "Not available") };
  });
  const close = dialog.querySelector("button");
  close?.click();
  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "check-backstage-batch") return;
  checkAvailability(Array.isArray(message.creators) ? message.creators : [])
    .then((results) => sendResponse({ results }))
    .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "Could not check Backstage availability." }));
  return true;
});
