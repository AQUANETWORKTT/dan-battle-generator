from __future__ import annotations

import os
import re

import pandas as pd
from reportlab.lib import colors
from reportlab.pdfgen import canvas

from create_creator_activity_report import (
    INPUT, PAGE_H, PAGE_W, HEADER_H, FOOTER_H, ROW_H, MARGIN, GOLD, MUTED,
    TEXT, THRESHOLDS, classify, draw_footer, draw_header, draw_table,
    friendly_manager, next_requirement, parse_hours,
)

OUTPUT_DIR = r"C:\Users\james\daniel-battle-generator\output\pdf\manager-promotion-priorities"


def filename_part(value: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "", value).strip().replace(" ", "-")


def remaining_to_next(level: int, days: int, hours: float) -> tuple[int, float]:
    target = min(level + 1, 5)
    need_days, need_hours = THRESHOLDS[target]
    return max(0, need_days - days), max(0, need_hours - hours)


def draw_no_candidates(c: canvas.Canvas):
    c.setFillColor(colors.HexColor("#13120E"))
    c.roundRect(MARGIN, PAGE_H - HEADER_H - 65 * 3.7795, PAGE_W - 2 * MARGIN, 38 * 3.7795, 12, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(PAGE_W / 2, PAGE_H - HEADER_H - 35 * 3.7795, "NO IMMEDIATE PROMOTION PRIORITIES")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawCentredString(PAGE_W / 2, PAGE_H - HEADER_H - 44 * 3.7795, "No creator is within 3 valid live days and 12 live hours of their next level.")


def main():
    source = pd.read_excel(INPUT)
    period = str(source["Data period"].dropna().iloc[0])
    records = []
    for _, row in source.iterrows():
        days = int(pd.to_numeric(row["Valid go LIVE days"], errors="coerce") if pd.notna(row["Valid go LIVE days"]) else 0)
        hours = parse_hours(row["LIVE duration"])
        level = classify(days, hours)
        requirement, priority = next_requirement(level, days, hours)
        missing_days, missing_hours = remaining_to_next(level, days, hours)
        records.append({
            "manager_email": str(row["Creator Network manager"]),
            "creator": str(row["Creator's username"]),
            "days": days,
            "hours": hours,
            "level": level,
            "requirement": requirement,
            "priority": priority,
            "missing_days": missing_days,
            "missing_hours": missing_hours,
            # One valid live day is one hour of live time, so this measures
            # the practical minimum effort needed to achieve the next level.
            "effort_hours": missing_days + missing_hours,
        })
    data = pd.DataFrame(records)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    max_rows = int((PAGE_H - HEADER_H - FOOTER_H - 15 * 3.7795) // ROW_H)
    count = 0
    qualifying_total = 0
    for email, manager_rows in data.groupby("manager_email", sort=True):
        eligible = manager_rows[
            (manager_rows["level"] < 5)
            & (manager_rows["missing_days"] <= 3)
            & (manager_rows["missing_hours"] <= 12.0)
        ].sort_values(["effort_hours", "creator"], ascending=[True, True]).to_dict("records")
        qualifying_total += len(eligible)
        chunks = [eligible[i:i + max_rows] for i in range(0, len(eligible), max_rows)] or [[]]
        manager_name = friendly_manager(email)
        path = os.path.join(OUTPUT_DIR, f"{filename_part(manager_name)} - Promotion Priorities.pdf")
        c = canvas.Canvas(path, pagesize=(PAGE_W, PAGE_H), pageCompression=1)
        for page_no, rows in enumerate(chunks, start=1):
            draw_header(c, manager_name, email, page_no, len(chunks), period)
            if rows:
                draw_table(c, rows, PAGE_H - HEADER_H - 5 * 3.7795)
            else:
                draw_no_candidates(c)
            draw_footer(c)
            c.showPage()
        c.save()
        count += 1
    print(f"Created {count} manager PDFs with {qualifying_total} qualifying creators in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
