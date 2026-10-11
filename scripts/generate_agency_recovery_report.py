import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Agency-Recovery-Report-October-2026.pdf"

GOLD = colors.HexColor("#F5CA62")
GOLD_PALE = colors.HexColor("#FFF0A6")
BLACK = colors.HexColor("#080806")
PANEL = colors.HexColor("#16140F")
MUTED = colors.HexColor("#A8A29E")
WHITE = colors.HexColor("#F7F4ED")
RED = colors.HexColor("#E05A5A")
ORANGE = colors.HexColor("#E89A43")
GREEN = colors.HexColor("#77C791")

METRICS = [
    "diamonds",
    "hours",
    "streams",
    "matches",
    "new_followers",
    "match_diamonds",
    "multiguest_diamonds",
    "fan_club_diamonds",
]


def env_values():
    values = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def clean(value):
    return str(value or "").strip()


def number(value):
    try:
        return float(str(value or "0").replace(",", ""))
    except (ValueError, TypeError):
        return 0.0


def creator_id(row):
    return clean(row.get("creator_id") or row.get("Creator ID")) or clean(row.get("creator_username") or row.get("Creator's username") or row.get("username")).lstrip("@").lower()


def username(row):
    return clean(row.get("creator_username") or row.get("Creator's username") or row.get("username")).lstrip("@") or "Unknown"


def manager(row):
    return clean(row.get("manager_email") or row.get("creator_network_manager") or row.get("Creator Network manager") or row.get("email")) or "Unassigned"


def month(value):
    return value[:7]


def days_in_month(value):
    year, month_number = map(int, value.split("-"))
    if month_number == 12:
        return 31
    return (datetime(year, month_number + 1, 1) - timedelta(days=1)).day


def previous_month(value):
    year, month_number = map(int, value.split("-"))
    when = datetime(year, month_number, 1) - timedelta(days=1)
    return when.strftime("%Y-%m")


def is_quit(row):
    return bool(re.search(r"creator\s+has\s+quit\s+(the\s+)?network|quit\s+(the\s+)?creator\s+network", json.dumps(row), re.I))


def metrics(row):
    return {
        "diamonds": number(row.get("diamonds")),
        "hours": number(row.get("live_hours")),
        "streams": number(row.get("live_streams")),
        "matches": number(row.get("matches")),
        "new_followers": number(row.get("new_followers")),
        "match_diamonds": number(row.get("diamonds_from_matches")),
        "multiguest_diamonds": number(row.get("diamonds_from_multiguest")),
        "fan_club_diamonds": number(row.get("fan_club_diamonds")),
    }


def empty_metrics():
    return {key: 0.0 for key in METRICS}


def totals(rows):
    output = empty_metrics()
    for row in rows:
        for key, value in metrics(row).items():
            output[key] += value
    return output


def fetch_rows():
    config = env_values()
    url = config.get("NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL", "https://dxupgmsscysvztxdtaku.supabase.co")
    key = config.get("NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY")
    if not key:
        raise RuntimeError("Supabase credentials are unavailable.")
    columns = "stat_date,data_period,creator_id,creator_username,manager_email,email,group_name,agency,team,diamonds,live_hours,live_streams,valid_live_days,matches,new_followers,diamonds_from_matches,diamonds_from_multiguest,fan_club_diamonds,total_fans,active_fans,status,graduation_status,tier_status"
    base = f"{url}/rest/v1/creator_daily_stats"
    latest_params = urllib.parse.urlencode({"select": "stat_date", "order": "stat_date.desc", "limit": "1"})
    request = urllib.request.Request(f"{base}?{latest_params}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        latest_data = json.loads(response.read())
    if not latest_data:
        raise RuntimeError("No uploaded creator statistics were found.")
    newest = clean(latest_data[0].get("stat_date"))
    start = (datetime.fromisoformat(newest) - timedelta(days=89)).strftime("%Y-%m-%d")
    params = urllib.parse.urlencode({"select": columns, "stat_date": f"gte.{start}", "order": "stat_date.asc"})
    rows = []
    for offset in range(0, 200000, 1000):
        headers = {"apikey": key, "Authorization": f"Bearer {key}", "Range": f"{offset}-{offset + 999}"}
        request = urllib.request.Request(f"{base}?{params}", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                batch = json.loads(response.read())
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Supabase data request failed: {error.read().decode('utf-8', 'replace')}") from error
        rows.extend(batch)
        if len(batch) < 1000:
            break
    return newest, rows


def analyse():
    newest, raw = fetch_rows()
    raw = [row for row in raw if clean(row.get("data_period")).lower() != "mature_month_total"]
    date_counts = Counter(clean(row.get("stat_date")) for row in raw)
    largest = max(date_counts.values(), default=0)
    complete_dates = {day for day, count in date_counts.items() if count >= largest * 0.7}
    latest = max(complete_dates) if complete_dates else newest
    rows = [row for row in raw if clean(row.get("stat_date")) in complete_dates]
    current_month = month(latest)
    prior_month = previous_month(current_month)
    august_month = previous_month(prior_month)
    uploaded_days = int(latest[-2:])
    prior_days = days_in_month(prior_month)
    histories = defaultdict(list)
    for row in rows:
        key = creator_id(row)
        if key:
            histories[key].append(row)

    creators = []
    for key, history in histories.items():
        history.sort(key=lambda row: clean(row.get("stat_date")))
        current_rows = [row for row in history if month(clean(row.get("stat_date"))) == current_month]
        prior_rows = [row for row in history if month(clean(row.get("stat_date"))) == prior_month]
        august_rows = [row for row in history if month(clean(row.get("stat_date"))) == august_month]
        current = totals(current_rows)
        prior = totals(prior_rows)
        august = totals(august_rows)
        expected = {metric: prior[metric] / prior_days * uploaded_days for metric in METRICS}
        recent = history[-1]
        current_latest = next((row for row in reversed(current_rows) if clean(row.get("stat_date")) == latest), None)
        prior_latest = prior_rows[-1] if prior_rows else None
        last_live = next((row for row in reversed(history) if number(row.get("live_hours")) >= 1), None)
        last_live_date = clean(last_live.get("stat_date")) if last_live else ""
        days_since_live = (datetime.fromisoformat(latest) - datetime.fromisoformat(last_live_date)).days if last_live_date else None
        quit = any(is_quit(row) for row in history)
        diamond_gap = max(0, expected["diamonds"] - current["diamonds"])
        hour_gap = max(0, expected["hours"] - current["hours"])
        diamond_pace = current["diamonds"] / expected["diamonds"] if expected["diamonds"] else 1
        hour_pace = current["hours"] / expected["hours"] if expected["hours"] else 1
        match_pace = current["matches"] / expected["matches"] if expected["matches"] else 1
        stream_pace = current["streams"] / expected["streams"] if expected["streams"] else 1
        active_fans = number((current_latest or recent).get("active_fans"))
        prior_active_fans = number(prior_latest.get("active_fans")) if prior_latest else 0
        flags = []
        if quit:
            flags.append("Left or quit")
        if not current_rows:
            flags.append("No October data")
        elif not current_latest:
            flags.append("Missing from latest upload")
        if not quit and days_since_live is not None and days_since_live >= 7:
            flags.append("No live in 7+ days")
        if expected["diamonds"] >= 5000 and diamond_pace < 0.75:
            flags.append("Diamond pace down")
        if expected["hours"] >= 2 and hour_pace < 0.7:
            flags.append("Live hours down")
        if expected["matches"] >= 1 and match_pace < 0.6:
            flags.append("Match activity down")
        if prior_active_fans >= 5 and active_fans < prior_active_fans * 0.55:
            flags.append("Active fans down")
        priority = round((65 if quit or not current_rows else 0) + (25 if days_since_live is not None and days_since_live >= 7 else 0) + min(45, diamond_gap / max(expected["diamonds"], 1) * 45) + min(25, hour_gap / max(expected["hours"], 1) * 25) + (8 if "Match activity down" in flags else 0) + (6 if "Active fans down" in flags else 0))
        if flags or prior["diamonds"] > 0:
            creators.append({
                "id": key, "username": username(current_latest or recent), "manager": manager(current_latest or recent),
                "group": clean((current_latest or recent).get("group_name") or (current_latest or recent).get("team")) or "Unassigned",
                "agency": clean((current_latest or recent).get("agency")) or "Unassigned", "last_seen": clean(recent.get("stat_date")),
                "last_live": last_live_date, "days_since_live": days_since_live, "current": current, "prior": prior,
                "expected": expected, "diamond_gap": diamond_gap, "hour_gap": hour_gap, "diamond_pace": diamond_pace,
                "hour_pace": hour_pace, "match_pace": match_pace, "stream_pace": stream_pace,
                "active_fans": active_fans, "prior_active_fans": prior_active_fans,
                "august": august, "august_month": august_month,
                "status": clean((current_latest or recent).get("status")), "tier": clean((current_latest or recent).get("tier_status")),
                "graduation": clean((current_latest or recent).get("graduation_status")), "flags": flags, "priority": priority,
            })
    creators.sort(key=lambda item: (-item["priority"], -item["diamond_gap"], item["username"].lower()))
    return {"latest": latest, "current_month": current_month, "prior_month": prior_month, "uploaded_days": uploaded_days, "creators": creators}


def fmt(value):
    return f"{round(value):,}"


def short(value):
    value = float(value)
    if abs(value) >= 1_000_000:
        return f"{value / 1_000_000:.2f}m"
    if abs(value) >= 1000:
        return f"{value / 1000:.1f}k"
    return f"{value:.0f}"


def pct(value):
    return f"{round(value * 100)}%"


class NumberedDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm, bottomMargin=14 * mm)
        self.addPageTemplates([self.template()])

    def template(self):
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        return __import__("reportlab.platypus", fromlist=["PageTemplate"]).PageTemplate(id="report", frames=[frame], onPage=self.draw_header)

    def draw_header(self, canvas, doc):
        canvas.saveState()
        width, height = landscape(A4)
        canvas.setFillColor(BLACK)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#5B4820"))
        canvas.line(14 * mm, height - 10 * mm, width - 14 * mm, height - 10 * mm)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(GOLD)
        canvas.drawString(14 * mm, height - 7 * mm, "FIRST CLASS AGENCY  /  RECOVERY REPORT")
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 14 * mm, height - 7 * mm, f"PAGE {doc.page}")
        canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=28, leading=30, textColor=WHITE, spaceAfter=8),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName="Helvetica", fontSize=10, leading=15, textColor=MUTED, spaceAfter=10),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=GOLD, spaceBefore=6, spaceAfter=8),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=GOLD_PALE, spaceBefore=5, spaceAfter=5),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=WHITE),
        "small": ParagraphStyle("small", parent=base["Normal"], fontName="Helvetica", fontSize=7.4, leading=10, textColor=MUTED),
        "table": ParagraphStyle("table", parent=base["Normal"], fontName="Helvetica", fontSize=6.8, leading=8.2, textColor=WHITE),
        "table_bold": ParagraphStyle("table_bold", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.8, leading=8.2, textColor=WHITE),
    }


def paragraph(value, style):
    return Paragraph(str(value).replace("&", "&amp;"), style)


def table(data, widths, header=True, font_size=6.8):
    result = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A2415")),
        ("TEXTCOLOR", (0, 0), (-1, 0), GOLD_PALE),
        ("TEXTCOLOR", (0, 1), (-1, -1), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), font_size + 2),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#393427")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for index in range(1, len(data)):
        commands.append(("BACKGROUND", (0, index), (-1, index), PANEL if index % 2 else colors.HexColor("#10100D")))
    result.setStyle(TableStyle(commands))
    return result


def manager_rollup(creators):
    rows = defaultdict(lambda: {"creators": 0, "diamond_gap": 0, "hour_gap": 0, "stopped": 0, "hours_down": 0, "match_down": 0, "priority": 0})
    for creator in creators:
        item = rows[creator.get("manager_display", creator["manager"])]
        item["creators"] += 1
        item["diamond_gap"] += creator["diamond_gap"]
        item["hour_gap"] += creator["hour_gap"]
        item["stopped"] += int(any(flag in creator["flags"] for flag in ("Left or quit", "No October data", "Missing from latest upload", "No live in 7+ days")))
        item["hours_down"] += int("Live hours down" in creator["flags"])
        item["match_down"] += int("Match activity down" in creator["flags"])
        item["priority"] += creator["priority"]
    return sorted(((name, values) for name, values in rows.items()), key=lambda item: (-item[1]["diamond_gap"], -item[1]["stopped"], item[0].lower()))


def action(creator):
    flags = creator["flags"]
    if "Left or quit" in flags:
        return "Confirm exit; replace if needed."
    if "No October data" in flags or "Missing from latest upload" in flags:
        return "Confirm status and next live."
    if "No live in 7+ days" in flags:
        return "Book next live; rebuild consistency."

    improvements = []
    if "Live hours down" in flags:
        improvements.append("Increase live hours")
    if "Match activity down" in flags:
        improvements.append("Increase match activity")
    if "Active fans down" in flags:
        improvements.append("Rebuild fan engagement")
    if "Diamond pace down" in flags and creator["hour_pace"] >= 0.85 and creator["stream_pace"] >= 0.85:
        improvements.append("Maintain activity; improve conversion")
    elif "Diamond pace down" in flags and not improvements:
        improvements.append("Improve stream conversion")
    return "; ".join(improvements[:3]) if improvements else "Monitor October pace."


def manager_name(value):
    raw = clean(value).lower()
    known = {
        "firstclassagency_dan": "Dan", "mikehalesjb": "Mike Hales", "cjtokens1237": "CJ",
        "megan25121990": "Megan", "rachellouise18": "Rach", "firstclassagencyash": "Ash",
        "firstclassagencykyran": "Kyran", "firstclassagencyolivia": "Liv", "firstclassagencyabbie": "Abbie",
        "firstclassagencymillie": "Millie", "firstclassagencykayden": "Kayden", "firstclassagencylauren": "Lauren",
    }
    if raw in {"", "unassigned"}:
        return "Unassigned"
    local = raw.split("@")[0]
    normalised = re.sub(r"[^a-z0-9]", "", local)
    for key, name in known.items():
        if key in normalised:
            return name
    local = re.sub(r"^firstclassagency[_\-.]?", "", local)
    local = re.sub(r"[_\-.]+", " ", local).strip()
    return (local.split()[0].capitalize() if local else "Unassigned")


def is_first_class(creator):
    agency = clean(creator["agency"]).lower()
    owner = clean(creator["manager"]).lower()
    return agency == "first class" or "firstclassagency" in owner or "mikehales" in owner or owner in {"", "unassigned"}


def change_label(creator):
    flags = creator["flags"]
    if "Left or quit" in flags:
        return "Creator has quit"
    if "No October data" in flags or "Missing from latest upload" in flags:
        return "No October upload"
    if "No live in 7+ days" in flags:
        return f"No live for {creator['days_since_live']} days"

    reasons = []
    if "Live hours down" in flags:
        reasons.append(f"Hours {creator['hour_pace'] * 100:.0f}% of pace")
    if "Match activity down" in flags:
        reasons.append(f"Matches {creator['match_pace'] * 100:.0f}% of pace")
    if "Active fans down" in flags:
        reasons.append("Fan support down")
    if "Diamond pace down" in flags and creator["hour_pace"] >= 0.85 and creator["stream_pace"] >= 0.85:
        reasons.append("Same activity; conversion down")
    elif "Diamond pace down" in flags and not reasons:
        reasons.append("Diamond pace down")
    return " · ".join(reasons[:2]) or "Diamond pace down"


def three_month_review(creator):
    august = creator["august"]
    september = creator["prior"]
    october = creator["current"]
    changes = []
    if september["hours"] > august["hours"] * 1.15 and september["hours"] - august["hours"] >= 3:
        changes.append(f"September added {fmt(september['hours'] - august['hours'])} live hours")
    if september["streams"] > august["streams"] + 2:
        changes.append(f"September added {fmt(september['streams'] - august['streams'])} streams")
    if september["matches"] > august["matches"] + 1:
        changes.append(f"September added {fmt(september['matches'] - august['matches'])} matches")
    if september["match_diamonds"] > august["match_diamonds"] * 1.2 and september["match_diamonds"] - august["match_diamonds"] >= 1000:
        changes.append("September had more match diamonds")
    if september["multiguest_diamonds"] > august["multiguest_diamonds"] * 1.2 and september["multiguest_diamonds"] - august["multiguest_diamonds"] >= 1000:
        changes.append("September had more multi-guest diamonds")
    losses = []
    if creator["hour_pace"] < 0.7:
        losses.append("live hours and streams are below pace")
    if creator["current"]["matches"] < creator["expected"]["matches"] * 0.6 and creator["expected"]["matches"] >= 1:
        losses.append("match activity is below pace")
    if creator["current"]["match_diamonds"] < creator["expected"]["match_diamonds"] * 0.6 and creator["expected"]["match_diamonds"] >= 1000:
        losses.append("match diamonds are below pace")
    if creator["prior_active_fans"] >= 5 and creator["active_fans"] < creator["prior_active_fans"] * 0.55:
        losses.append("active fans have fallen")
    if not losses and creator["diamond_pace"] < 0.75:
        losses.append("diamonds are down despite reasonable activity - review conversion and stream quality")
    september_story = "; ".join(changes) if changes else "September did not show one clear activity increase against August"
    october_story = "; ".join(losses) if losses else "October is behind diamond pace without one single operational signal explaining it"
    return f"Aug {short(august['diamonds'])}; Sep {short(september['diamonds'])}. {september_story}. October: {october_story}."


def build_report(analysis):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    style = styles()
    doc = NumberedDoc(str(OUT))
    story = []
    creators = [creator for creator in analysis["creators"] if is_first_class(creator)]
    for creator in creators:
        creator["manager_display"] = manager_name(creator["manager"])
    flagged = [creator for creator in creators if creator["flags"]]
    top_fifty = sorted(flagged, key=lambda creator: (-creator["diamond_gap"], -creator["priority"], creator["username"].lower()))[:50]
    current_total = sum(creator["current"]["diamonds"] for creator in creators)
    expected_total = sum(creator["expected"]["diamonds"] for creator in creators)
    diamond_gap = max(0, expected_total - current_total)
    current_hours = sum(creator["current"]["hours"] for creator in creators)
    expected_hours = sum(creator["expected"]["hours"] for creator in creators)
    hour_gap = max(0, expected_hours - current_hours)
    stopped = [creator for creator in top_fifty if any(flag in creator["flags"] for flag in ("Left or quit", "No October data", "Missing from latest upload", "No live in 7+ days"))]
    hours_down = [creator for creator in top_fifty if "Live hours down" in creator["flags"]]
    conversion_down = [creator for creator in top_fifty if "Diamond pace down" in creator["flags"] and creator["hour_pace"] >= 0.7]
    matches_down = [creator for creator in top_fifty if "Match activity down" in creator["flags"]]

    story += [
        Spacer(1, 14 * mm),
        Paragraph("First Class Recovery Report", style["title"]),
        Paragraph(f"First Class creators only. October to {analysis['latest']}, using {analysis['uploaded_days']} complete uploaded days and the equivalent September pace.", style["subtitle"]),
        Spacer(1, 6 * mm),
        Paragraph("Purpose", style["h1"]),
        Paragraph("A short action list for the biggest diamond shortfalls. It shows the likely change and the immediate manager review needed.", style["body"]),
        Spacer(1, 8 * mm),
    ]
    cover_data = [
        [paragraph("Diamond pace shortfall", style["small"]), paragraph("Live-hours shortfall", style["small"]), paragraph("Top 50 inactive", style["small"]), paragraph("First Class reviews", style["small"])],
        [paragraph(short(diamond_gap), style["title"]), paragraph(f"{fmt(hour_gap)}h", style["title"]), paragraph(str(len(stopped)), style["title"]), paragraph(str(len(flagged)), style["title"])],
        [paragraph(f"{short(current_total)} earned vs {short(expected_total)} expected", style["small"]), paragraph(f"{fmt(current_hours)}h completed vs {fmt(expected_hours)}h expected", style["small"]), paragraph("No October data or inactive for 7+ days", style["small"]), paragraph(f"{len(flagged)} First Class creators flagged", style["small"])],
    ]
    cover = Table(cover_data, colWidths=[64 * mm] * 4)
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL), ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#7A6128")),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#4A3D20")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [cover, Spacer(1, 10 * mm), Paragraph("Immediate agency actions", style["h1"])]
    actions = [
        ["1", f"Confirm status and next live date for the {len(stopped)} inactive creators in the top 50."],
        ["2", f"Set a live-hours plan for the {len(hours_down)} creators whose activity is below pace."],
        ["3", f"Review conversion for the {len(conversion_down)} creators who are live but below diamond pace."],
        ["4", f"Plan matches or multi-guest activity for the {len(matches_down)} creators with weaker match activity."],
    ]
    story.append(table([["Priority", "Action"]] + [[paragraph(left, style["table_bold"]), paragraph(right, style["table"])] for left, right in actions], [22 * mm, 234 * mm]))
    story.append(PageBreak())

    story += [Paragraph("Top 50 shortfall by manager", style["h1"]), Paragraph("First Class only. Diamond gap is October actual versus expected pace.", style["subtitle"])]
    manager_rows = [["Manager", "Creators", "Diamond gap", "Hour gap", "Stopped / inactive", "Hours down", "Matches down"]]
    for name, values in manager_rollup(top_fifty):
        manager_rows.append([paragraph(name, style["table_bold"]), str(values["creators"]), f"-{short(values['diamond_gap'])}", f"-{fmt(values['hour_gap'])}h", str(values["stopped"]), str(values["hours_down"]), str(values["match_down"])])
    story.append(table(manager_rows, [65 * mm, 20 * mm, 32 * mm, 30 * mm, 36 * mm, 30 * mm, 30 * mm]))
    story += [Spacer(1, 8 * mm), Paragraph("Quick guide", style["h1"])]
    causes = [
        ["Inactive", "Confirm they are still active and agree a next live date."],
        ["Hours down", "Restore a realistic live-hours and stream plan."],
        ["Diamond pace down", "Review stream format, conversion and coaching."],
        ["Matches / fans down", "Plan partner activity and review engagement."],
    ]
    story.append(table([["Signal", "Meaning and review"]] + [[paragraph(left, style["table_bold"]), paragraph(right, style["table"])] for left, right in causes], [56 * mm, 200 * mm]))
    story.append(PageBreak())

    story += [Paragraph("Top 50 creators down in diamonds", style["h1"]), Paragraph("Largest First Class shortfalls. “Cause” explains what has changed; “Needs improvement” states the practical focus.", style["subtitle"])]
    priority_rows = [["Creator", "Manager", "August", "September", "October / pace", "Down", "Cause", "Needs improvement"]]
    for creator in top_fifty:
        priority_rows.append([
            paragraph("@" + creator["username"], style["table_bold"]), paragraph(creator["manager_display"], style["table"]), short(creator["august"]["diamonds"]), short(creator["prior"]["diamonds"]),
            f"{short(creator['current']['diamonds'])} / {short(creator['expected']['diamonds'])}", f"-{short(creator['diamond_gap'])}",
            paragraph(change_label(creator), style["table"]), paragraph(action(creator), style["table"]),
        ])
    story.append(table(priority_rows, [29 * mm, 22 * mm, 22 * mm, 22 * mm, 37 * mm, 22 * mm, 41 * mm, 50 * mm], font_size=6.2))
    story.append(PageBreak())

    by_manager = defaultdict(list)
    for creator in top_fifty:
        by_manager[creator["manager_display"]].append(creator)
    for display_name, group in sorted(by_manager.items(), key=lambda item: (-sum(creator["diamond_gap"] for creator in item[1]), item[0].lower())):
        total_gap = sum(creator["diamond_gap"] for creator in group)
        story += [Paragraph(display_name, style["h1"]), Paragraph(f"{len(group)} creator(s) in the First Class top 50. Combined diamond shortfall: {short(total_gap)}.", style["subtitle"])]
        rows = [["Creator", "August", "September", "October / pace", "Down", "Cause", "Needs improvement"]]
        for creator in sorted(group, key=lambda item: (-item["diamond_gap"], item["username"].lower())):
            rows.append([
                paragraph("@" + creator["username"], style["table_bold"]),
                short(creator['august']['diamonds']), short(creator['prior']['diamonds']),
                f"{short(creator['current']['diamonds'])} / {short(creator['expected']['diamonds'])}", f"-{short(creator['diamond_gap'])}",
                paragraph(change_label(creator), style["table"]), paragraph(action(creator), style["table"]),
            ])
        story.append(table(rows, [35 * mm, 25 * mm, 25 * mm, 35 * mm, 24 * mm, 55 * mm, 66 * mm], font_size=6.4))
        story.append(PageBreak())

    doc.build(story)


if __name__ == "__main__":
    analysis = analyse()
    build_report(analysis)
    print(json.dumps({"output": str(OUT), "latest": analysis["latest"], "creators": len(analysis["creators"]), "flagged": sum(bool(creator["flags"]) for creator in analysis["creators"])}, indent=2))
