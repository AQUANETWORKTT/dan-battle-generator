import {creatorJoiningDate} from './creator-joining-date';
type Row = Record<string, unknown>;
const value = (v: unknown) => String(v ?? "").trim();
const name = (r: Row) => value(r.creator_username).replace(/^@/, "");
const manager = (r: Row) => value(r.manager_email || r.creator_network_manager || r["Creator Network manager"] || r.email);
export function buildCreatorHistory(rows: Row[]) {
  const ordered = [...rows].sort((a,b) => value(a.stat_date).localeCompare(value(b.stat_date)));
  const timeline: { date: string; title: string; detail: string }[] = [];
  const names = new Map<string, { username: string; firstSeen: string; lastSeen: string }>();
  let previousName = "", previousManager = "";
  const first = ordered[0];
  let joinedDate = "";
  if (first) {
    const observed = value(first.stat_date),joined=creatorJoiningDate(ordered);
    if(joined.date){joinedDate=joined.date;timeline.push({date:joinedDate,title:"Joined the agency",detail:joined.estimated?"Estimated from days since joining in the earliest saved record.":"Joining date from the saved Backstage upload."});}
    timeline.push({date: observed, title: "First saved record", detail: "History before this upload may not be available."});
  }
  for (const row of ordered) {
    const date = value(row.stat_date), username = name(row), managedBy = manager(row);
    if (username) {
      const key = username.toLowerCase(), saved = names.get(key);
      if (saved) saved.lastSeen = date;
      else names.set(key, {username, firstSeen: date, lastSeen: date});
      if (previousName && previousName.toLowerCase() !== key) timeline.push({date, title: "Username changed", detail: `@${previousName} → @${username}`});
      previousName = username;
    }
    if (managedBy) {
      if (!previousManager) timeline.push({date, title: "First recorded manager", detail: managedBy});
      else if (previousManager.toLowerCase() !== managedBy.toLowerCase()) timeline.push({date, title: "Switched management", detail: `${previousManager} → ${managedBy}`});
      previousManager = managedBy;
    }
  }
  return { joinedDate, username: previousName, manager: previousManager, nameHistory: [...names.values()], timeline, rows: [...ordered].reverse() };
}
