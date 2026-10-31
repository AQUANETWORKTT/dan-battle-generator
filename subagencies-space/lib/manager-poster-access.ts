// Manager entries share their agency's poster layouts, not the owners' dashboard.
export function managerPosterGeneratorLink(agency: string, manager: string, label: string) {
  const query = new URLSearchParams({ source: "manager", manager, label });
  return `/agency/${encodeURIComponent(agency)}/generator?${query.toString()}`;
}

export function managerPosterReturnLink(agency: string, query: URLSearchParams): string | null {
  const manager = query.get("manager")?.trim();
  if (agency !== "paradise" || query.get("source") !== "manager" || !manager) return null;
  const label = query.get("label") || "MANAGER";
  return `/agency/paradise/managers/${encodeURIComponent(manager)}?${new URLSearchParams({ label }).toString()}`;
}
