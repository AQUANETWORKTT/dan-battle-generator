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

function visibleText(element) {
  // Backstage nests each cell's labels in separate elements. textContent joins
  // them into strings like “AvailableRegular”, whereas innerText preserves the
  // visible word boundaries needed to identify each status.
  return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
}

function insertThroughChrome(value) {
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(() => finish(new Error("Chrome did not enter the creator usernames.")), 5000);
    function listener(message) {
      if (message?.type !== "backstage-text-inserted" && message?.type !== "backstage-text-insert-failed") return;
      message.type === "backstage-text-inserted" ? finish() : finish(new Error("Chrome could not enter the creator usernames."));
    }
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: "insert-backstage-text", text: value }).catch(() => finish(new Error("Chrome could not enter the creator usernames.")));
  });
}

function clickThroughChrome(element) {
  const bounds = element.getBoundingClientRect();
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(() => finish(new Error("Chrome did not press Backstage Next.")), 5000);
    function listener(message) {
      if (message?.type !== "backstage-control-clicked" && message?.type !== "backstage-control-click-failed") return;
      message.type === "backstage-control-clicked" ? finish() : finish(new Error("Chrome could not press Backstage Next."));
    }
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: "click-backstage-control", x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }).catch(() => finish(new Error("Chrome could not press Backstage Next.")));
  });
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
  await pause(750);
  const dialog = await waitFor(() => findAll('[role="dialog"]').find((element) => /Add creators/i.test(element.textContent || "")));
  const input = findAll('textarea, input[placeholder*="30 creators"]', dialog)[0];
  if (!input) throw new Error("Backstage did not show the creator entry box.");
  const usernames = creators.map((creator) => creator.username).join("\n");
  input.focus();
  input.click();
  await insertThroughChrome(usernames);
  await waitFor(() => input.value === usernames, 3000);
  await pause(750);
  const next = buttonByText(dialog, "Next");
  if (!next) throw new Error("Backstage did not show the availability step.");
  await clickThroughChrome(next);
  await pause(4000);
  const statusPattern = /\b(?:Available|Regular|Premium|Ineligible|Not available|Network error)\b/i;
  const resultTextFor = (username) => [...dialog.querySelectorAll("*")]
    .map(visibleText)
    .filter((text) => text.includes(username) && statusPattern.test(text))
    .sort((left, right) => left.length - right.length)[0] || "";
  // Backstage fills the result table row by row. Do not read the first result
  // and assume every other row is unavailable; wait until each submitted name
  // has a final status. The result cards do not consistently use role="row",
  // so read the smallest matching result element instead of a table role.
  await waitFor(() => creators.every((creator) => Boolean(resultTextFor(creator.username))), 30000).catch(() => null);
  const results = creators.map((creator) => {
    const text = resultTextFor(creator.username);
    // A failed Backstage request is the only case worth retrying. A late or
    // missing card is reported once as unverified; it must not make the helper
    // repeatedly submit the same group of 30 creators.
    const retry = /network error/i.test(text);
    // Workspace does not always render the word “Available”. Some versions show
    // the creator's Regular or Premium eligibility only. Either tier is a valid
    // availability result, unless the row explicitly says it is ineligible.
    const explicitlyUnavailable = /\b(?:Ineligible|Not available|Network error)\b/i.test(text);
    const hasInviteTier = /\b(?:Regular|Premium)\b/i.test(text);
    const available = !explicitlyUnavailable && (/\bAvailable\b/i.test(text) || hasInviteTier);
    const reason = retry
      ? "Network error — retrying"
      : available
        ? ""
        : text.match(/Ineligible\s+(.+?)(?:\s+Follow|$)/i)?.[1] || (text ? "Not available" : "Backstage did not return a final status");
    return { ...creator, available, invitationType: available ? (/\bPremium\b/i.test(text) ? "Premium" : "Regular") : "", reason, retry };
  });
  const close = findAll('button,[role="button"]', dialog)[0];
  close?.click();
  await pause(1000);
  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "check-backstage-batch") return;
  // With Workspace embedded in multiple frames, only the frame that owns the
  // visible Invite creators control should handle this batch.
  if (!buttonByText(document, "Invite creators")) return;
  checkAvailability(Array.isArray(message.creators) ? message.creators : [])
    .then((results) => {
      chrome.runtime.sendMessage({ type: "backstage-batch-results", jobId: message.jobId, results }).catch(() => {});
      sendResponse({ accepted: true });
    })
    .catch((error) => {
      const messageText = error instanceof Error ? error.message : "Could not check Backstage availability.";
      chrome.runtime.sendMessage({ type: "backstage-batch-results", jobId: message.jobId, error: messageText }).catch(() => {});
      sendResponse({ accepted: true });
    });
  return true;
});
