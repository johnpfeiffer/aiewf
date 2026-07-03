#!/usr/bin/env bash
#
# check-sessions-diff.sh — sanity-check a freshly downloaded sessions.json
# against the previous version, to catch upstream weirdness (dropped talks,
# vacated time slots, renames masquerading as removals).
#
# Usage:
#   ./check-sessions-diff.sh [OLD] [NEW]
#
# Defaults: OLD=sessions-old.json  NEW=sessions.json
#
# Recommended workflow on each upstream pull:
#   cp sessions.json sessions-old.json      # snapshot current
#   curl -o sessions.json <upstream-url>    # download new
#   ./check-sessions-diff.sh                # review the report
#
# Exit code is 0 always (report-only); scan output for ⚠ markers.

set -euo pipefail

OLD="${1:-sessions-old.json}"
NEW="${2:-sessions.json}"

for f in "$OLD" "$NEW"; do
  if [[ ! -f "$f" ]]; then echo "error: file not found: $f" >&2; exit 2; fi
  if ! jq empty "$f" >/dev/null 2>&1; then echo "error: invalid JSON: $f" >&2; exit 2; fi
done

OLD="$OLD" NEW="$NEW" python3 - <<'PY'
import json, os, re, sys
from collections import defaultdict

old_path, new_path = os.environ["OLD"], os.environ["NEW"]
old = json.load(open(old_path))
new = json.load(open(new_path))
o = old.get("sessions", [])
n = new.get("sessions", [])

def slot(s):  # identity of a schedule slot
    return (s.get("day",""), s.get("room",""), s.get("time",""))

def parse_min(t):
    # "9:05am" -> minutes since midnight; None if unparseable
    m = re.match(r'^\s*(\d{1,2}):(\d{2})\s*(am|pm)\s*$', t, re.I)
    if not m: return None
    h, mm, ap = int(m.group(1)), int(m.group(2)), m.group(3).lower()
    if ap == "pm" and h != 12: h += 12
    if ap == "am" and h == 12: h = 0
    return h*60 + mm

def span(time_str):
    # "9:05am-9:25am" -> (start_min, end_min)
    if "-" not in time_str: return (None, None)
    a, b = time_str.split("-", 1)
    return (parse_min(a.strip()), parse_min(b.strip()))

def fmt(s):
    sp = ", ".join(s.get("speakers", []) or [])
    return f'{s.get("day","?")} | {s.get("time","?")} | {s.get("room","?")} | {s.get("title","?")}' + (f' | {sp}' if sp else "")

BOLD="\033[1m"; RED="\033[31m"; YEL="\033[33m"; GRN="\033[32m"; DIM="\033[2m"; RST="\033[0m"
if not sys.stdout.isatty():
    BOLD=RED=YEL=GRN=DIM=RST=""

print(f"{BOLD}Sessions diff report{RST}  {DIM}({old_path} → {new_path}){RST}")
print(f"  old scheduleVersion: {old.get('scheduleVersion','?')}   new: {new.get('scheduleVersion','?')}")

# ---- 1. Count delta ----------------------------------------------------
delta = len(n) - len(o)
sign = "+" if delta > 0 else ""
print(f"\n{BOLD}1. Session count{RST}: {len(o)} → {len(n)}  ({sign}{delta})")

# ---- Index by slot -----------------------------------------------------
old_by_slot = defaultdict(list); new_by_slot = defaultdict(list)
for s in o: old_by_slot[slot(s)].append(s)
for s in n: new_by_slot[slot(s)].append(s)

old_titles = {s.get("title") for s in o}
new_titles = {s.get("title") for s in n}
removed_titles = old_titles - new_titles
added_titles   = new_titles - old_titles

# ---- 2. Renames (slot kept, title changed) -----------------------------
renames = []
for sl, olds in old_by_slot.items():
    news = new_by_slot.get(sl, [])
    ot = {s.get("title") for s in olds}
    nt = {s.get("title") for s in news}
    gone = (ot - nt) & removed_titles
    arrived = (nt - ot) & added_titles
    # pair them up when a slot lost one title and gained one
    for og, ar in zip(sorted(gone), sorted(arrived)):
        renames.append((sl, og, ar))

renamed_removed = {og for _, og, _ in renames}
renamed_added   = {ar for _, _, ar in renames}

print(f"\n{BOLD}2. Renames{RST} (same day/room/time, new title) — not real removals: {len(renames)}")
for (day, room, time), og, ar in sorted(renames):
    print(f"   {DIM}{day} | {time} | {room}{RST}")
    print(f"     {YEL}{og}{RST}  →  {GRN}{ar}{RST}")

# ---- 3. True drops (title gone, slot now empty) ------------------------
true_drops = []
for s in o:
    t = s.get("title")
    if t in new_titles or t in renamed_removed:
        continue
    sl = slot(s)
    slot_now_empty = len(new_by_slot.get(sl, [])) == 0
    true_drops.append((s, slot_now_empty))

hi = [s for s, empty in true_drops if empty]
lo = [s for s, empty in true_drops if not empty]
print(f"\n{BOLD}3. Removed sessions{RST}: {len(true_drops)}")
if hi:
    print(f"   {RED}⚠ HIGH signal — removed AND left an empty time slot (likely upstream mistake):{RST}")
    for s in sorted(hi, key=lambda x:(x.get('day',''),x.get('time',''))):
        print(f"     {RED}⚠{RST} {fmt(s)}")
if lo:
    print(f"   {DIM}lower signal — removed but slot was reused/overlapping (may be intentional):{RST}")
    for s in sorted(lo, key=lambda x:(x.get('day',''),x.get('time',''))):
        print(f"       {fmt(s)}")

# ---- 4. Pure additions -------------------------------------------------
pure_added = [s for s in n if s.get("title") not in old_titles and s.get("title") not in renamed_added]
print(f"\n{BOLD}4. Added sessions{RST}: {len(pure_added)}")
for s in sorted(pure_added, key=lambda x:(x.get('day',''),x.get('time',''))):
    print(f"     {GRN}+{RST} {fmt(s)}")

# ---- 5. Timeline gap scan (new file, informational) -------------------
# Within each day+room, flag gaps between consecutive talks. Big gaps around
# midday are usually lunch; flag only unusual mid-session gaps.
print(f"\n{BOLD}5. Timeline gaps in {new_path}{RST} {DIM}(informational; lunch breaks are normal){RST}")
GAP_MIN = 25
by_dr = defaultdict(list)
for s in n:
    by_dr[(s.get("day",""), s.get("room",""))].append(s)
flagged = 0
for (day, room), items in sorted(by_dr.items()):
    timed = []
    for s in items:
        st, en = span(s.get("time",""))
        if st is not None and en is not None:
            timed.append((st, en, s))
    timed.sort()
    for (st1, en1, s1), (st2, en2, s2) in zip(timed, timed[1:]):
        gap = st2 - en1
        if gap >= GAP_MIN and not (11*60+30 <= en1 <= 13*60+30):  # skip lunch window
            flagged += 1
            print(f"   {YEL}gap {gap}m{RST} {DIM}{day} | {room}{RST}: "
                  f'"{s1.get("title","?")}" ends {s1.get("time","").split("-")[-1]}'
                  f' → "{s2.get("title","?")}" starts {s2.get("time","").split("-")[0]}')
if not flagged:
    print(f"   {DIM}(none over {GAP_MIN}m outside the lunch window){RST}")

print(f"\n{BOLD}Summary{RST}: {len(renames)} renames, "
      f"{RED}{len(hi)} high-signal drops{RST}, {len(lo)} other removals, "
      f"{GRN}{len(pure_added)} additions{RST}, {flagged} timeline gaps flagged.")
if hi:
    print(f"{RED}⚠ Review the high-signal drops against the live schedule before trusting them.{RST}")
PY
