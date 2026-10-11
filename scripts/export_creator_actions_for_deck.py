import json
from pathlib import Path

import generate_manager_creator_tasks as report


OUT = Path(r"C:\Users\james\daniel-battle-generator\tmp\creator-actions-deck-data.json")


def main():
    periods = {name: report.read_period(path) for name, path in report.SOURCES.items()}
    creators = []
    for creator_id in set().union(*[set(rows) for rows in periods.values()]):
        source = next((periods[key].get(creator_id) for key in ("oct", "sep", "aug", "sep_8") if creator_id in periods[key]), None)
        if not source:
            continue
        username = source["username"].lower().lstrip("@")
        if username not in report.TOP_50_USERNAMES:
            continue
        creator = {"id": creator_id, "username": source["username"], "manager": source["manager"] or "Unassigned"}
        for name, rows in periods.items():
            creator[name] = rows.get(creator_id, {"diamonds": 0, "hours": 0, "streams": 0, "matches": 0, "followers": 0})
        baseline = report.comparison_baseline(creator)
        creator["factors"], creator["task"] = report.factor_and_task(creator)
        creator["diamond_lost"] = max(0, baseline["diamonds"] - creator["oct"]["diamonds"])
        creators.append(creator)
    creators.sort(key=lambda item: (-item["diamond_lost"], item["username"].lower()))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(creators, ensure_ascii=False), encoding="utf-8")
    print(f"Exported {len(creators)} creators to {OUT}")


if __name__ == "__main__":
    main()
