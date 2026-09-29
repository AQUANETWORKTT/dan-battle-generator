from __future__ import annotations

import math
import os
import re
from datetime import datetime

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

INPUT = r"C:\Users\james\Downloads\Creator data 2026_09_29 12_34 UTC+0.xlsx"
LOGO = r"C:\Users\james\daniel-battle-generator\public\branding\first-class-logo.png"
OUTPUT = r"C:\Users\james\daniel-battle-generator\output\pdf\creator-activity-priority-report-september-2026.pdf"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 16 * mm
HEADER_H = 43 * mm
FOOTER_H = 13 * mm
ROW_H = 10.6 * mm

BLACK = colors.HexColor("#070706")
PANEL = colors.HexColor("#13120E")
PANEL_ALT = colors.HexColor("#191712")
GOLD = colors.HexColor("#F2C965")
GOLD_DARK = colors.HexColor("#8F6A20")
TEXT = colors.HexColor("#F5F0E2")
MUTED = colors.HexColor("#ACA696")
GRID = colors.HexColor("#3A3321")
LEVEL_COLOURS = {
    5: colors.HexColor("#7C5CFA"),
    4: colors.HexColor("#5966E8"),
    3: colors.HexColor("#2F7CF6"),
    2: colors.HexColor("#35C7E8"),
    1: colors.HexColor("#B6D539"),
    0: colors.HexColor("#9B9486"),
}
THRESHOLDS = {
    1: (8, 20),
    2: (11, 30),
    3: (15, 40),
    4: (18, 60),
    5: (22, 80),
}


def parse_hours(value) -> float:
    if pd.isna(value):
        return 0.0
    text = str(value)
    match = re.search(r"(\d+)h(?:\s*(\d+)m)?", text)
    if not match:
        return float(value) if isinstance(value, (int, float)) else 0.0
    return int(match.group(1)) + int(match.group(2) or 0) / 60


def format_hours(value: float) -> str:
    minutes = max(0, int(round(value * 60)))
    return f"{minutes // 60}h {minutes % 60:02d}m"


def classify(days: int, hours: float) -> int:
    achieved = 0
    for level, (need_days, need_hours) in THRESHOLDS.items():
        if days >= need_days and hours >= need_hours:
            achieved = level
    return achieved


def next_requirement(level: int, days: int, hours: float) -> tuple[str, float]:
    target = min(level + 1, 5)
    if level == 5:
        return "Maintain Level 5", 999.0
    need_days, need_hours = THRESHOLDS[target]
    missing_days = max(0, need_days - days)
    missing_hours = max(0, need_hours - hours)
    pieces = []
    if missing_days:
        pieces.append(f"+{missing_days} day{'s' if missing_days != 1 else ''}")
    if missing_hours > 0.01:
        pieces.append(f"+{format_hours(missing_hours)}")
    remaining = " & ".join(pieces) if pieces else "Ready to rank up"
    priority = max(missing_days / need_days, missing_hours / need_hours)
    return f"Level {target}: {remaining}", priority


def friendly_manager(email: str) -> str:
    names = {
        "firstclassagency_dan@outlook.com": "Dan",
        "trident125@mail.com": "Trident",
        "firstclassagency_olivia@outlook.com": "Olivia",
        "firstclassagency_ash@outlook.com": "Ash",
        "firstclassagency_abbie@outlook.com": "Abbie",
        "louise.squelch@gmail.com": "Louise",
        "fearnegurry1@gmail.com": "Fearne",
        "firstclassagency_creators@outlook.com": "First Class Creators",
        "cjtokens1237@gmail.com": "CJ",
        "firstclassagency_kyran@outlook.com": "Kyran",
        "demileawebster7@gmail.com": "Demi",
        "firstclassagency_millie@outlook.com": "Millie",
        "firstclassagency_mavis@outlook.com": "Mavis",
        "steven06@gmx.com": "Stephen O Six",
        "kaybon03@icloud.com": "Kaybon",
        "firstclassagency_jacob@outlook.com": "Jacob",
        "emilymcclarence2006@icloud.com": "Emily",
        "firstclassagency.jenson@gmail.com": "Jenson",
        "teritilcock1994@gmail.com": "Teri",
        "firstclassagency_jack@outlook.com": "Jack",
    }
    return names.get(email, email)


def fit_text(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, size: float, font: str = "Helvetica"):
    rendered = str(text)
    while len(rendered) > 1 and stringWidth(rendered, font, size) > max_width:
        rendered = rendered[:-2] + "…"
    c.setFont(font, size)
    c.drawString(x, y, rendered)


def draw_header(c: canvas.Canvas, manager: str, email: str, page_no: int, page_total: int, period: str):
    c.setFillColor(BLACK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#211B0D"))
    c.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(0.5)
    c.line(MARGIN, PAGE_H - HEADER_H, PAGE_W - MARGIN, PAGE_H - HEADER_H)
    if os.path.exists(LOGO):
        c.drawImage(LOGO, MARGIN, PAGE_H - 28 * mm, width=55 * mm, height=13 * mm, preserveAspectRatio=True, mask="auto")
    else:
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 17)
        c.drawString(MARGIN, PAGE_H - 20 * mm, "FIRST CLASS AGENCY")
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 16 * mm, "CREATOR ACTIVITY PRIORITY REPORT")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN, PAGE_H - 37 * mm, manager.upper())
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(MARGIN, PAGE_H - 43 * mm, f"Manager: {email}   •   Reporting period: {period}")
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 43 * mm, f"PAGE {page_no} OF {page_total}")


def draw_table(c: canvas.Canvas, rows: list[dict], start_y: float):
    cols = [
        ("PRIORITY", 27 * mm), ("CREATOR", 57 * mm), ("CURRENT LEVEL", 31 * mm),
        ("VALID DAYS", 25 * mm), ("LIVE HOURS", 29 * mm), ("NEXT LEVEL REQUIREMENT", PAGE_W - (2 * MARGIN + 169 * mm)),
    ]
    x = MARGIN
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7)
    for title, width in cols:
        c.drawString(x + 3 * mm, start_y - 6.5 * mm, title)
        x += width
    c.setStrokeColor(GOLD_DARK)
    c.line(MARGIN, start_y - 9 * mm, PAGE_W - MARGIN, start_y - 9 * mm)
    y = start_y - 9 * mm
    for index, row in enumerate(rows):
        y -= ROW_H
        c.setFillColor(PANEL if index % 2 == 0 else PANEL_ALT)
        c.roundRect(MARGIN, y + 0.7 * mm, PAGE_W - 2 * MARGIN, ROW_H - 1.4 * mm, 2.1 * mm, fill=1, stroke=0)
        x = MARGIN
        colour = LEVEL_COLOURS[row["level"]]
        c.setFillColor(GOLD if row["level"] < 5 else MUTED)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(x + 13.5 * mm, y + 4.1 * mm, "PROMOTION" if row["level"] < 5 else "MAINTAIN")
        x += cols[0][1]
        c.setFillColor(TEXT)
        fit_text(c, row["creator"], x + 3 * mm, y + 4.2 * mm, cols[1][1] - 6 * mm, 10, "Helvetica-Bold")
        x += cols[1][1]
        c.setFillColor(colour)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(x + cols[2][1] / 2, y + 4.2 * mm, f"LEVEL {row['level']}" if row["level"] else "BELOW LEVEL 1")
        x += cols[2][1]
        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + cols[3][1] / 2, y + 4.2 * mm, str(row["days"]))
        x += cols[3][1]
        c.drawCentredString(x + cols[4][1] / 2, y + 4.2 * mm, format_hours(row["hours"]))
        x += cols[4][1]
        c.setFillColor(MUTED)
        fit_text(c, row["requirement"], x + 3 * mm, y + 4.2 * mm, cols[5][1] - 6 * mm, 8.5, "Helvetica")


def draw_footer(c: canvas.Canvas):
    c.setStrokeColor(GRID)
    c.line(MARGIN, FOOTER_H, PAGE_W - MARGIN, FOOTER_H)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 7 * mm, "Levels: 1 = 8 days / 20h · 2 = 11 days / 30h · 3 = 15 days / 40h · 4 = 18 days / 60h · 5 = 22 days / 80h")
    c.drawRightString(PAGE_W - MARGIN, 7 * mm, "Closest next-level requirement shown first")


def main():
    source = pd.read_excel(INPUT)
    period = str(source["Data period"].dropna().iloc[0])
    records = []
    for _, row in source.iterrows():
        days = int(pd.to_numeric(row["Valid go LIVE days"], errors="coerce") if pd.notna(row["Valid go LIVE days"]) else 0)
        hours = parse_hours(row["LIVE duration"])
        level = classify(days, hours)
        requirement, priority = next_requirement(level, days, hours)
        records.append({
            "manager_email": str(row["Creator Network manager"]),
            "creator": str(row["Creator's username"]),
            "days": days,
            "hours": hours,
            "level": level,
            "requirement": requirement,
            "priority": priority,
        })
    data = pd.DataFrame(records)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    c = canvas.Canvas(OUTPUT, pagesize=landscape(A4), pageCompression=1)
    max_rows = int((PAGE_H - HEADER_H - FOOTER_H - 15 * mm) // ROW_H)
    manager_pages = []
    for email, manager_rows in data.groupby("manager_email", sort=True):
        ordered = manager_rows.sort_values(["priority", "level", "creator"], ascending=[True, False, True]).to_dict("records")
        chunks = [ordered[i:i + max_rows] for i in range(0, len(ordered), max_rows)]
        manager_pages.extend([(email, chunk) for chunk in chunks])
    total_pages = len(manager_pages)
    for page_no, (email, rows) in enumerate(manager_pages, start=1):
        draw_header(c, friendly_manager(email), email, page_no, total_pages, period)
        draw_table(c, rows, PAGE_H - HEADER_H - 5 * mm)
        draw_footer(c)
        c.showPage()
    c.save()
    print(f"Created {OUTPUT} with {len(records)} creators across {total_pages} pages")


if __name__ == "__main__":
    main()
