from collections import defaultdict
from datetime import datetime
from pathlib import Path
import math
import re

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle


SOURCE_DIR = Path(r"C:\Users\james\OneDrive\Documents\Evidence - Agency Claim\lauren")
SOURCES = {
    "sep_8": SOURCE_DIR / "Creator data 2026_10_09 11_51 UTC+0 (1).xlsx",
    "oct": SOURCE_DIR / "Creator data 2026_10_09 11_51 UTC+0.xlsx",
    "sep": SOURCE_DIR / "Creator data 2026_10_09 11_59 UTC+0 (1).xlsx",
    "aug": SOURCE_DIR / "Creator data 2026_10_09 11_59 UTC+0.xlsx",
}
OUT = Path(r"C:\Users\james\daniel-battle-generator\output\pdf\Manager-Creator-Action-Review-October-2026.pdf")
TOP_50_USERNAMES = {
    "dylanjinks", "allannah.unknown444", "coran.purser", "arrcch", "xomarky", "x_cj_tokens_x", "flexzontik", "dam_it_chan",
    "lukebennett170.2", "glenifarr", "chloechapman2003", "failuretothrive2008", "nklnne", "dens2511", "lissy.grwm0", "libbyamberxoxo",
    "albi.j10", "lucylou449", "vitaliacy0", "hellodynamo", "j.wliveacc", "brandyfalconer", "al1ceroseb", "rhir3a", "kayjb_3",
    "pappa1901", "poppy_cooper06", "leighanne.thomson", "ace.t176", "bellescupids", "soph.x19x", "aiden..97", "kyzwrld1",
    "liambamford18", "sambaileysingerofficial", "rosiehughes81", "phantomjaguar", "goldengun62", "turbotagz", "clo.elizabeth1",
    "saraaelisabeth", "xlaurenj11x", "baby_b277", "kleelou_ygam_kiki", "astryxplays", "raachlouisexxx", "hannakingwoodward",
    "rustytrigger_1", "sallytuffery69", "ronniefieldd",
}

BLACK = colors.HexColor("#090909")
PANEL = colors.HexColor("#15140F")
GOLD = colors.HexColor("#E6BF56")
GOLD_PALE = colors.HexColor("#F3DB94")
WHITE = colors.HexColor("#F5F2E8")
MUTED = colors.HexColor("#BBB6A9")
GRID = colors.HexColor("#403A2D")


def clean(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return str(value).strip()


def number(value):
    text = clean(value)
    duration = re.fullmatch(r"\s*(\d+)h\s*(\d+)m\s*(\d+)s\s*", text)
    if duration:
        h, m, s = (int(part) for part in duration.groups())
        return h + m / 60 + s / 3600
    try:
        return float(value) if not pd.isna(value) else 0.0
    except (TypeError, ValueError):
        return 0.0


def short(value):
    value = number(value)
    if abs(value) >= 1_000_000:
        return f"{value / 1_000_000:.2f}m"
    if abs(value) >= 1_000:
        return f"{value / 1_000:.1f}k"
    return f"{value:,.0f}"


def hours(value):
    return f"{number(value):.0f}h"


def pct(actual, expected):
    return actual / expected if expected > 0 else None


def comparison_baseline(creator):
    sep8 = creator["sep_8"]
    sep = creator["sep"]
    if sep8["diamonds"] or sep8["hours"] or sep8["streams"]:
        return sep8
    return {
        "diamonds": sep["diamonds"] * 8 / 30,
        "hours": sep["hours"] * 8 / 30,
        "streams": sep["streams"] * 8 / 30,
        "matches": sep["matches"] * 8 / 30,
        "followers": 0,
    }


def read_period(path):
    raw = pd.read_excel(path)
    raw = raw[raw["Creator ID"].notna()].copy()
    raw["Creator ID"] = raw["Creator ID"].astype(str).str.strip()
    rows = {}
    for creator_id, group in raw.groupby("Creator ID", sort=False):
        # One row per creator. If an export contains repeat rows, retain the latest row;
        # numerical values are snapshot totals rather than rows to add together.
        row = group.iloc[-1]
        rows[creator_id] = {
            "id": creator_id,
            "username": clean(row.get("Creator's username")),
            "manager": clean(row.get("Creator Network manager")) or "Unassigned",
            "group": clean(row.get("Group")),
            "diamonds": number(row.get("Diamonds")),
            "hours": number(row.get("LIVE duration")),
            "streams": number(row.get("LIVE streams")),
            "matches": number(row.get("Matches")),
            "followers": number(row.get("New followers")),
            "status": clean(row.get("Status")),
        }
    return rows


def factor_and_task(creator):
    current = creator["oct"]
    baseline = comparison_baseline(creator)
    factors = []
    tasks = []

    if current["diamonds"] == 0 and current["hours"] == 0:
        factors.append((100, "No October activity"))
        tasks.append("This creator has not earned diamonds in October. Contact them today to confirm they are active, find out what is stopping them from going live, and agree their next scheduled live.")
    else:
        hour_ratio = pct(current["hours"], baseline["hours"])
        match_ratio = pct(current["matches"], baseline["matches"])
        stream_ratio = pct(current["streams"], baseline["streams"])
        diamond_ratio = pct(current["diamonds"], baseline["diamonds"])
        follower_ratio = pct(current["followers"], baseline["followers"])

        if hour_ratio is not None and hour_ratio < 0.85:
            factors.append((100 - hour_ratio * 100, f"Hours {hour_ratio * 100:.0f}% of Sep 1-8 ({hours(current['hours'])}/{hours(baseline['hours'])})"))
            tasks.append(f"Their live hours are down to {hour_ratio * 100:.0f}% of their September level. Ask what is stopping them from going live, then agree a realistic weekly live schedule and check it is followed.")
        if stream_ratio is not None and stream_ratio < 0.8:
            factors.append((95 - stream_ratio * 100, f"Streams {stream_ratio * 100:.0f}% of Sep 1-8 ({current['streams']:.0f}/{baseline['streams']:.0f})"))
            if hour_ratio is None or hour_ratio >= 0.85:
                tasks.append("They are starting fewer streams than usual. Agree fixed live slots for the week and make sure those slots are protected.")
        if match_ratio is not None and baseline["matches"] >= 1 and match_ratio < 0.8:
            factors.append((90 - match_ratio * 100, f"Matches {match_ratio * 100:.0f}% of Sep 1-8 ({current['matches']:.0f}/{baseline['matches']:.0f})"))
            expected_daily_hours = baseline["hours"] / 8
            if expected_daily_hours < 2:
                minimum_daily_matches = 5
            elif expected_daily_hours < 4:
                minimum_daily_matches = 10
            else:
                minimum_daily_matches = 15
            tasks.append(f"Their match activity is down. Set a plan for at least {minimum_daily_matches} matches a day, help them find suitable partners, and review how the plan is going after a few days.")
        if diamond_ratio is not None and diamond_ratio < 1:
            if (hour_ratio is None or hour_ratio >= 0.85) and (stream_ratio is None or stream_ratio >= 0.85):
                label = f"Same activity; diamonds {diamond_ratio * 100:.0f}% of Sep 1-8"
                tasks.append("They are putting in similar live time but earning less. Review their visual quality, consistency, stream set-up and how they convert viewers while live.")
            else:
                label = f"Diamonds {diamond_ratio * 100:.0f}% of Sep 1-8 ({short(current['diamonds'])}/{short(baseline['diamonds'])})"
            factors.append((85 - diamond_ratio * 100, label))

    unique_tasks = []
    for task in tasks:
        if task not in unique_tasks:
            unique_tasks.append(task)
    top_factors = [item[1] for item in sorted(factors, key=lambda item: -item[0])[:2]]
    return "<br/>".join(top_factors), "<br/><br/>".join(unique_tasks[:2])


def p(text, style):
    return Paragraph(str(text), style)


def styles(row_count=16):
    base = getSampleStyleSheet()
    if row_count == 1:
        scale = 1.55
    elif row_count == 2:
        scale = 1.38
    elif row_count <= 4:
        scale = 1.2
    elif row_count <= 7:
        scale = 1.08
    else:
        scale = 1
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, leading=21, textColor=GOLD, spaceAfter=4),
        "sub": ParagraphStyle("sub", parent=base["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=MUTED),
        "head": ParagraphStyle("head", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.5 * scale, leading=8 * scale, textColor=GOLD_PALE),
        "cell": ParagraphStyle("cell", parent=base["Normal"], fontName="Helvetica", fontSize=6.2 * scale, leading=7.6 * scale, textColor=WHITE),
        "bold": ParagraphStyle("bold", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.2 * scale, leading=7.6 * scale, textColor=WHITE),
    }


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=12 * mm, rightMargin=12 * mm, topMargin=13 * mm, bottomMargin=13 * mm)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates(PageTemplate(id="report", frames=[frame], onPage=self.header))

    def header(self, canvas, doc):
        canvas.saveState()
        width, height = A4
        canvas.setFillColor(BLACK)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#725C28"))
        canvas.setLineWidth(0.5)
        canvas.line(12 * mm, height - 10 * mm, width - 12 * mm, height - 10 * mm)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(GOLD)
        canvas.drawString(12 * mm, height - 7 * mm, "FIRST CLASS AGENCY / CREATOR ACTION REVIEW")
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 12 * mm, height - 7 * mm, f"PAGE {doc.page}")
        canvas.restoreState()


def make_table(data, widths, row_heights=None):
    result = Table(data, colWidths=widths, rowHeights=row_heights, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A2415")),
        ("TEXTCOLOR", (0, 0), (-1, 0), GOLD_PALE),
        ("TEXTCOLOR", (0, 1), (-1, -1), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.25, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE" if row_heights else "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for row in range(1, len(data)):
        commands.append(("BACKGROUND", (0, row), (-1, row), PANEL if row % 2 else colors.HexColor("#10100D")))
    result.setStyle(TableStyle(commands))
    return result


def build():
    periods = {name: read_period(path) for name, path in SOURCES.items()}
    ids = set().union(*[set(rows) for rows in periods.values()])
    zero = {"diamonds": 0, "hours": 0, "streams": 0, "matches": 0, "followers": 0, "username": "", "manager": "", "group": "", "status": ""}
    by_manager = defaultdict(list)
    for creator_id in ids:
        source = next((periods[key].get(creator_id) for key in ("oct", "sep", "aug", "sep_8") if creator_id in periods[key]), zero)
        creator = {"id": creator_id, "username": source["username"] or creator_id, "manager": source["manager"] or "Unassigned"}
        if creator["username"].lower().lstrip("@") not in TOP_50_USERNAMES:
            continue
        for key in periods:
            creator[key] = periods[key].get(creator_id, zero)
        baseline = comparison_baseline(creator)
        creator["factors"], creator["task"] = factor_and_task(creator)
        creator["severity"] = creator["oct"]["diamonds"] - baseline["diamonds"]
        by_manager[creator["manager"]].append(creator)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = ReportDoc(str(OUT))
    story = []
    page_index = 0
    for manager, creators in sorted(by_manager.items(), key=lambda item: item[0].lower()):
        creators.sort(key=lambda creator: (creator["severity"], creator["username"].lower()))
        # Seven rows keeps the manager instructions readable when they wrap to sentences.
        for chunk_index, start in enumerate(range(0, len(creators), 7)):
            if page_index:
                story.append(PageBreak())
            page_index += 1
            chunk = creators[start:start + 7]
            heading = manager if chunk_index == 0 else f"{manager} (continued)"
            page_style = styles(len(chunk))
            story += [Paragraph(heading, page_style["title"]), Paragraph("Includes the supplied Top 50 diamond declines only. October is compared with the matching 1-8 September period. Each creator has a required manager action.", page_style["sub"]), Spacer(1, 5 * mm)]
            rows = [[p("Creator", page_style["head"]), p("Aug", page_style["head"]), p("Sep", page_style["head"]), p("Oct 1-8", page_style["head"]), p("Top damaging factors", page_style["head"]), p("Manager task", page_style["head"])]]
            for creator in chunk:
                aug = creator["aug"]
                sep = creator["sep"]
                octo = creator["oct"]
                rows.append([
                    p("@" + creator["username"], page_style["bold"]),
                    p(f"{short(aug['diamonds'])}<br/>{hours(aug['hours'])}", page_style["cell"]),
                    p(f"{short(sep['diamonds'])}<br/>{hours(sep['hours'])}", page_style["cell"]),
                    p(f"{short(octo['diamonds'])}<br/>{hours(octo['hours'])}", page_style["cell"]),
                    p(creator["factors"], page_style["cell"]),
                    p(creator["task"], page_style["cell"]),
                ])
            if len(chunk) <= 4:
                body_height = {1: 125, 2: 88, 3: 60, 4: 47}[len(chunk)] * mm
                row_heights = [12 * mm] + [body_height] * len(chunk)
            else:
                row_heights = None
            story.append(make_table(rows, [25 * mm, 20 * mm, 20 * mm, 21 * mm, 48 * mm, 44 * mm], row_heights=row_heights))
    doc.build(story)
    print(f"Created {OUT} with {len(by_manager)} manager section(s) and {len(ids)} creators.")


if __name__ == "__main__":
    build()
