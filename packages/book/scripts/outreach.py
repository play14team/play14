#!/usr/bin/env python3
"""Draft the invitations asking each founding team to write their city's chapter.

Reads data/lineage.json and the city chapters, and writes into outreach/ (gitignored):

  outreach/tracker.md            one row per city: who to ask, where they first played,
                                 and whether their story has arrived. Only created if
                                 missing, so your own status notes survive (--force to
                                 recreate it).
  outreach/messages/<city>.md    a personalized invitation draft per city. Always
                                 regenerated; copy, adjust and send it yourself.

Nothing is sent. Usage: python3 scripts/outreach.py [--force] [--reply-by "November 15th"]
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "outreach"
GUIDE_URL = "https://github.com/play14team/play14/blob/main/packages/book/src/contribute.md"
REPLY_BY_PLACEHOLDER = "<reply-by date>"
# The exact marker the city chapters use for a story that hasn't arrived yet.
# Keep it in sync with the "In their words" block (see CONTRIBUTING.md).
PENDING_MARKER = '<div class="contribution-pending">'

# FOUNDERS, MET and GIVEN_NAMES are curated by hand, not derived from
# data/lineage.json: update them when a founder, a story or a name changes.
FOUNDERS = {"cedric-pontet", "yann-gensollen", "pierre-neis", "diego-de-biasio"}

# Where Cédric met the person who started the city, in his own words.
MET = {
    "London": "Chris, Christina and I met in Luxembourg in 2015, at the second edition",
    "Hamburg": "Karsten and I met in London in 2015",
    "Madrid": "Mari Luz and I met in Hamburg in 2016",
    "Sydney": "Hanna and I met in Madrid in 2018",
    "Kuala Lumpur": "Fred and I met in Sydney in 2019",
    "Manila": "Darwin and I met in Kuala Lumpur in 2019",
}

MONTHS = "January February March April May June July August September October November December".split()


def month_year(iso):
    y, m, _ = iso.split("-")
    return f"{MONTHS[int(m) - 1]} {y}"


def join(items):
    items = list(items)
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


# Given names of more than one word, which the first-word rule would cut short
GIVEN_NAMES = {"Mari Luz Garcia": "Mari Luz", "Wan Fadzil Adlan Wan Sidik": "Wan Fadzil", "Si Yu Lai": "Si Yu", "Yin Mei Ho": "Yin Mei"}


def first_name(name):
    if name in GIVEN_NAMES:
        return GIVEN_NAMES[name]
    if "(" in name and ")" in name:  # "Chompoonuch Tojaroen (Chompoo)" goes by the nickname
        nickname = name[name.index("(") + 1 : name.index(")")].strip()
        if nickname:
            return nickname
    words = name.split()
    return words[0] if words else name


def received(chapter):
    path = ROOT / "src" / chapter
    return path.exists() and PENDING_MARKER not in path.read_text()


def origin_sentence(city):
    if city["city"] in MET:
        return MET[city["city"]] + "."
    by_event = {}
    for h in city["hosts"]:
        if h["firstPlayed"] and h["slug"] not in FOUNDERS:
            by_event.setdefault(h["firstPlayed"]["event"], []).append(first_name(h["name"]))
    if not by_event:
        return ""
    parts = [f"{join(names)} first played at #play14 {event}" for event, names in by_event.items()]
    return "From the event records, " + join(parts) + "."


def message(city, reply_by):
    hosts = [h for h in city["hosts"] if h["slug"] not in FOUNDERS]
    others = [m["name"] for m in city["mentors"] if m["slug"] != "cedric-pontet"]
    me = any(m["slug"] == "cedric-pontet" for m in city["mentors"])
    edition = city["firstEdition"]
    mentor_part = ""
    if others:
        mentor_part = f", with {join(others)} as mentor{'s' if len(others) > 1 else ''}"
        mentor_part += ", and I came along too" if me else ""
    elif me:
        mentor_part = ", and I came as your mentor"
    origin = origin_sentence(city)
    to = "\n".join(f"- {h['name']}: https://play14.org/players/{h['slug']}" for h in hosts)
    return f"""<!-- To:
{to}
-->

Subject: #play14, the story: your chapter on {city['city']}

Hi {join(first_name(h['name']) for h in hosts)},

I'm writing a book about #play14: how it started, how it grew, and what makes it special. It's called "#play14, the story", and it follows how the community grew one encounter at a time, from city to city.

{city['city']} is part of that story. {origin + ' ' if origin else ''}In {month_year(edition['start'])} you hosted the first #play14 {city['city']}{mentor_part}.

Every city has its own chapter, and I'd love for you to write the part called "In their words": your story, in your own voice. How you discovered #play14, why you decided to bring it home, what happened at that first edition, and who you passed it on to.

There's a short guide with questions to get you started: {GUIDE_URL}
Around 500 to 1,500 words is plenty. Write in whatever language you prefer, together or each on your own, and you'll approve the final version before anything is published.

Could you send it by {reply_by}? Just reply to this message.

Thank you for bringing #play14 to {city['city']}.

Cédric
"""


def main():
    parser = argparse.ArgumentParser(description="Draft invitations to founding teams. Nothing is sent.")
    parser.add_argument("--force", action="store_true", help="recreate outreach/tracker.md, discarding your notes")
    parser.add_argument("--reply-by", default=REPLY_BY_PLACEHOLDER, help='deadline written into every draft, e.g. "November 15th"')
    args = parser.parse_args()
    if args.reply_by == REPLY_BY_PLACEHOLDER:
        print(f"warning: no --reply-by given; drafts say {REPLY_BY_PLACEHOLDER!r}", file=sys.stderr)
    data = json.loads((ROOT / "data" / "lineage.json").read_text())
    cities = [c for c in data["cities"] if c["chapter"] and any(h["slug"] not in FOUNDERS for h in c["hosts"])]

    (OUT / "messages").mkdir(parents=True, exist_ok=True)
    for c in cities:
        slug = Path(c["chapter"]).stem
        (OUT / "messages" / f"{slug}.md").write_text(message(c, args.reply_by))

    tracker = OUT / "tracker.md"
    if args.force or not tracker.exists():
        rows = []
        for c in cities:
            first = sorted({h["firstPlayed"]["event"] for h in c["hosts"] if h["firstPlayed"]})
            rows.append(
                f"| {c['city']} | {c['firstEdition']['start']} | "
                f"{', '.join(h['name'] for h in c['hosts'] if h['slug'] not in FOUNDERS)} | "
                f"{', '.join(first) or '?'} | {'received' if received(c['chapter']) else 'not asked'} | |"
            )
        tracker.write_text(
            "# Contribution tracker\n\n"
            "Status: not asked → asked → reminded → received → published.\n\n"
            "| City | First edition | Ask | First played at | Status | Notes |\n"
            "| --- | --- | --- | --- | --- | --- |\n" + "\n".join(rows) + "\n"
        )

    done = sum(received(c["chapter"]) for c in cities)
    print(f"{len(cities)} invitation drafts in {OUT / 'messages'}; {done}/{len(cities)} stories received")


if __name__ == "__main__":
    main()
