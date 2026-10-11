import fs from "node:fs/promises";
import path from "node:path";

const root = "C:/Users/james/daniel-battle-generator";
const input = path.join(root, "tmp", "creator-actions-deck-data.json");
const output = path.join(root, "output", "Manager-Messages-Creator-Comparison-Sep1-8-vs-Oct1-8.md");

const managerNames = {
  "astryxplays@gmail.com": "Astryx",
  "byrne.gemma@icloud.com": "Gemma",
  "carrie_manager@outlook.com": "Carrie",
  "cjtokens1237@gmail.com": "CJ",
  "firstclassagency_ash@outlook.com": "Ash",
  "firstclassagency_dan@outlook.com": "Dan",
  "firstclassagency_kayden@outlook.com": "Kayden",
  "firstclassagency_kyran@outlook.com": "Kyran",
  "firstclassagency_mavis@outlook.com": "Mavis",
  "firstclassagency_millie@outlook.com": "Millie",
  "firstclassagency_olivia@outlook.com": "Olivia",
  "georgialilly.glow@gmail.com": "Georgia",
  "hollyshepherd-97@outlook.com": "Holly",
  "juggsyrespawn@gmail.com": "Juggsy",
  "kaybon03@icloud.com": "Kay",
  "luke_matthew121@hotmail.co.uk": "Luke",
  "megan25121990@hotmail.com": "Megan",
  "mikehalesjb@gmail.com": "Mike Hales",
  "rachellouise18.rl@yahoo.com": "Rachael",
  "stormliveagency@outlook.com": "Storm",
};

function commas(value) {
  return Math.round(value).toLocaleString("en-GB");
}

function duration(value) {
  const totalMinutes = Math.round(value * 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function dropLine(label, september, october, formatter = commas) {
  return `${label} — ${formatter(october)} / ${formatter(september)} last month`;
}

function contributingLines(creator) {
  if (creator.factors === "No October activity") return ["ACTIVITY — No October live activity recorded."];
  const lines = [];
  if (creator.factors.includes("Hours ")) {
    lines.push(dropLine("HOURS", creator.sep_8.hours, creator.oct.hours, duration));
  }
  if (creator.factors.includes("Matches ")) {
    lines.push(dropLine("MATCHES", creator.sep_8.matches, creator.oct.matches));
  }
  if (creator.factors.includes("Streams ")) {
    lines.push(dropLine("STREAMS", creator.sep_8.streams, creator.oct.streams));
  }
  if (creator.factors.includes("Same activity")) {
    lines.push("ACTIVITY — Live activity is broadly similar to September; diamond conversion is lower.");
  }
  return lines;
}

const creators = JSON.parse(await fs.readFile(input, "utf8"));
const groups = new Map();
for (const creator of creators) {
  if (!groups.has(creator.manager)) groups.set(creator.manager, []);
  groups.get(creator.manager).push(creator);
}

const lines = [
  "# Manager messages — creator comparison",
  "",
  "Comparison period: **1–8 September 2026 vs 1–8 October 2026**. Each section below is a separate copy-and-paste message.",
  "",
];

for (const [email, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const manager = managerNames[email] ?? email;
  lines.push(`## ${manager}`);
  lines.push("");
  lines.push("```text");
  lines.push("Hey 👋 Here are the stats 📊 for creators that are down compared to last month:");
  lines.push("");
  for (const creator of members.sort((a, b) => b.diamond_lost - a.diamond_lost)) {
    const sep = creator.sep_8.diamonds;
    const oct = creator.oct.diamonds;
    lines.push(`@${creator.username}`);
    lines.push(`DIAMONDS — ${commas(oct)} / ${commas(sep)} last month`);
    lines.push(...contributingLines(creator));
    lines.push("");
  }
  lines.push("Can you let me know your plan going forward with these, and any reason why they are down?");
  lines.push("```");
  lines.push("");
}

await fs.writeFile(output, `${lines.join("\n")}\n`, "utf8");
console.log(output);
