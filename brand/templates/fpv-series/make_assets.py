"""Generate HTML for the FPV, Flown Right series: reel covers, carousels and the one-take checklist PDF."""
import os, html, json, sys
OUT = sys.argv[1]
B = "file:///home/user/CaliDrones-Site/brand"
os.makedirs(OUT, exist_ok=True)

BASE = f"""<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=Big+Shoulders+Display:wght@800&display=block" rel="stylesheet">
<link rel="stylesheet" href="{B}/tokens.css">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:var(--abyss);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased}}
.bg{{position:absolute;inset:0;background:
 radial-gradient(70% 55% at 80% 18%, #0C3443 0%, transparent 62%),
 radial-gradient(60% 45% at 8% 92%, #082631 0%, transparent 70%), var(--abyss)}}
.dots{{position:absolute;inset:0;opacity:.22;background:radial-gradient(circle, rgba(111,227,238,.55) 1.1px, transparent 1.6px) 0 0/26px 26px;
 -webkit-mask-image:linear-gradient(to bottom, transparent 0%, #000 30%, #000 60%, transparent 100%);mask-image:linear-gradient(to bottom, transparent 0%, #000 30%, #000 60%, transparent 100%)}}
.label{{font-family:var(--font-display);font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--signal)}}
.wide{{font-variation-settings:"wdth" 118}}
.bands{{display:grid;gap:9px}} .bands i{{display:block;background:var(--signal)}}
.diam li{{position:relative;padding-left:44px;list-style:none}}
.diam li::before{{content:"";position:absolute;left:4px;top:.5em;width:16px;height:16px;background:var(--scan);transform:rotate(45deg)}}
</style>"""

def esc(s): return html.escape(s, quote=False)

# ---------------------------------------------------------------- Episodes
EPS = [
 (1, "1", "Fly it legal", "Goggles on means you need a spotter"),
 (2, "1", "Fly it legal", "Flying FPV for fun vs for pay: what changes"),
 (3, "1", "Fly it legal", "Why my FPV drone weighs 236 grams"),
 (4, "1", "Fly it legal", "Where to practice FPV around LA and Ventura County"),
 (5, "2", "Build the skill", "Before anyone paid me to fly FPV, I spent hours in a simulator"),
 (6, "2", "Build the skill", "The drill that makes one-takes smooth"),
 (7, "2", "Build the skill", "Cinewhoop, freestyle, long range: which FPV drone does what"),
 (8, "2", "Build the skill", "4 battery rules I never break"),
 (9, "3", "The one-take craft", "Goggles view vs the final cut"),
 (10, "3", "The one-take craft", "How I plan a one-take"),
 (11, "3", "The one-take craft", "My one-take checklist"),
 (12, "3", "The one-take craft", "Breaking down a one-take"),
 (13, "3", "The one-take craft", "My worst FPV crash, and what it taught me"),
]

def bands(widths=(4, 7, 10, 14)):
    return '<div class="bands">' + ''.join(f'<i style="height:{h}px"></i>' for h in widths) + '</div>'

def cover(num, module_no, module, title, kind="ep"):
    tlen = len(title)
    fs = 112 if tlen <= 30 else 96 if tlen <= 48 else 84
    top = f'EP. {num:02d}' if kind == "ep" else 'LIVE'
    mod = f'Module {module_no} · {esc(module)}' if kind == "ep" else esc(module)
    return f"""<!doctype html><html><head><meta charset="utf-8">{BASE}<style>
body{{width:1080px;height:1920px;position:relative;overflow:hidden}}
.safe{{position:absolute;left:96px;right:96px;top:240px;height:1440px;display:flex;flex-direction:column}}
.series{{font-size:60px}}
.mod{{margin-top:18px;font-size:32px;font-weight:600;color:var(--muted);letter-spacing:.01em}}
.num{{margin-top:auto;font-size:300px;line-height:.82;font-weight:320;font-variation-settings:"wdth" 125;letter-spacing:-.03em;color:var(--signal)}}
.num small{{display:block;font-size:44px;font-weight:600;letter-spacing:.08em;color:var(--muted);font-variation-settings:"wdth" 110;margin-bottom:10px}}
h1{{margin-top:46px;font-size:{fs}px;line-height:1.0;font-weight:740;font-variation-settings:"wdth" 116;letter-spacing:-.02em;text-wrap:balance}}
.foot{{margin-top:64px;display:flex;align-items:center;gap:26px}}
.foot img{{width:72px;height:72px}}
.foot .url{{font-size:30px;font-weight:560;color:var(--muted)}}
.base{{position:absolute;left:0;right:0;bottom:0}}
</style></head><body><div class="bg"></div><div class="dots"></div>
<div class="safe">
 <p class="label series">FPV, Flown Right</p>
 <p class="mod">{mod}</p>
 <p class="num"><small>{'EPISODE' if kind=='ep' else 'INSTAGRAM'}</small>{top if kind!='ep' else f'{num:02d}'}</p>
 <h1>{esc(title)}</h1>
 <div class="foot"><img src="{B}/logo/mark.svg" alt=""><span class="url">californiadrones.io</span></div>
</div>
<div class="base">{bands((5, 9, 14, 22))}</div>
</body></html>"""

# ---------------------------------------------------------------- Carousels
NOTE = "General information, not legal advice. Rules change: check faa.gov."
CAR = {
 2: [
  ("title", "Flying FPV for fun vs for pay: what changes", "Same goggles. Two rulebooks."),
  ("list", "Two rulebooks", ["Flying purely for fun: the FAA's recreational rules.",
                              "Anyone pays you, or the flight promotes a business: FAA Part 107.",
                              "The rest of this post is what changes between the two."]),
  ("compare", "The certificate", "For fun", ["Pass the free TRUST test", "Carry proof when you fly"],
                                  "For pay", ["Part 107 remote pilot certificate", "Recurrent training every 24 months"]),
  ("compare", "Registration and Remote ID", "For fun", ["Register drones over 250 g", "Registered drones broadcast Remote ID, or fly at an FAA-recognized field"],
                                             "For pay", ["Register every drone, any weight", "Remote ID on, every flight"]),
  ("list", "Goggles on? You need a spotter", ["For fun or for pay, FPV means a visual observer next to you.",
                                              "Their job: keep the drone in sight and call out hazards.",
                                              "If the pilot flies alone in goggles, that's not legal."]),
  ("list", "Airspace is the same for both", ["Stay at or below 400 ft.",
                                             "Near airports, get authorization first. LAANC works for both.",
                                             "Check for temporary flight restrictions before every flight."]),
  ("list", "Insurance", ["The FAA doesn't require it.",
                         "Venues, builders and event organizers do.",
                         "A pro can name you on a certificate of insurance."]),
  ("cta", "Hiring an FPV pilot? Ask for three things.", ["A Part 107 certificate", "Proof of insurance", "A spotter on set"], "Save this · DM ONE TAKE", NOTE),
 ],
 4: [
  ("title", "Where to practice FPV around LA and Ventura County", "Legally, and without a call from a ranger."),
  ("list", "Start with the map", ["Open an FAA-approved B4UFLY app before you go.",
                                  "Much of LA sits in controlled airspace near airports.",
                                  "Check for temporary flight restrictions: events, VIPs, fires."]),
  ("list", "FAA-recognized fields", ["FRIAs are usually model aircraft club fields.",
                                     "Drones without Remote ID can fly there.",
                                     "Join the club and follow its rules."]),
  ("list", "Private land, with permission", ["Get the owner's OK first.",
                                             "Stay out of controlled airspace, or get authorization.",
                                             "Keep well clear of people, roads and livestock."]),
  ("list", "Not here: national park land", ["No takeoffs or landings on National Park Service land.",
                                            "That includes NPS areas of the Santa Monica Mountains."]),
  ("list", "Check first: state, county and city parks", ["Many restrict drones or require a permit.",
                                                         "Rules differ park by park, so check that agency's page.",
                                                         "If a sign says no drones, it's no drones."]),
  ("list", "Never near a wildfire", ["If you fly, firefighting aircraft have to stop.",
                                     "Fires come with temporary flight restrictions.",
                                     "Same for stadium events and airshows."]),
  ("cta", "Knowing where you can't fly is half of flying right.", ["Save this before your next session", "Send it to someone who just bought goggles"], "Follow for Ep. 05", NOTE),
 ],
 7: [
  ("title", "Cinewhoop, freestyle, long range: which FPV drone does what", "Three tools. Three different jobs."),
  ("list", "Cinewhoop", ["Small, with ducted or guarded props.",
                         "Steady and precise in tight spaces.",
                         "Built for indoors and flying close to people."]),
  ("list", "Freestyle", ["Fast, light and agile.",
                         "Open props: for open spaces, away from people.",
                         "Flips, dives and chasing action."]),
  ("list", "Long range", ["Efficient, with bigger batteries.",
                          "Landscapes, ridgelines, following a vehicle.",
                          "Still within visual line of sight, with a spotter."]),
  ("list", "Why 250 grams matters", ["Under 250 g with no exposed props that can cut = FAA Category 1.",
                                     "Category 1 drones may fly over people.",
                                     "Weigh it with guards, battery and light all on."]),
  ("list", "What I fly for venues", ["A 236 g guarded drone that shoots 4K.",
                                     "Remote ID on, every flight.",
                                     "Light enough to fly over a crowd, legally."]),
  ("list", "Picking one", ["Indoors or near people: cinewhoop.",
                           "Open space, high speed: freestyle.",
                           "Big landscapes: long range, flown carefully."]),
  ("cta", "For your venue: guarded, light, and flown by someone who's rehearsed the route.", ["One-take fly-throughs", "Events and crowds", "Tracks and closed courses"], "DM ONE TAKE", "californiadrones.io"),
 ],
 11: [
  ("title", "My one-take checklist", "What I check before every venue fly-through. Save this."),
  ("list", "1 · Permission", ["Written OK from the venue or owner.",
                              "Releases from anyone who'll be in the shot.",
                              "A date and time the space can be cleared or staged."]),
  ("list", "2 · Airspace and rules", ["Outdoors: check the map, LAANC, TFRs.",
                                      "Indoors: confirm the venue's own rules.",
                                      "Plan the spotter's position."]),
  ("list", "3 · Walk the route", ["Walk it on foot with the client.",
                                  "Mark hazards: glass, fans, chandeliers, wires.",
                                  "Doors propped, gaps measured, the end shot chosen."]),
  ("list", "4 · People", ["Clear the route, or brief everyone in frame.",
                          "Consent from anyone identifiable.",
                          "No kids on camera without parents' OK."]),
  ("list", "5 · Light and timing", ["Interior lights on, no mixed color.",
                                    "Golden hour for anything outside.",
                                    "Leave time for retakes."]),
  ("list", "6 · Gear", ["Weigh it with guards: under 250 g for Category 1.",
                        "Batteries charged, props checked, DVR recording.",
                        "Spotter briefed, radio or hand signals agreed."]),
  ("list", "7 · Rehearse, then fly", ["Half speed first, then full speed.",
                                      "At least three full takes.",
                                      "Land with battery to spare."]),
  ("cta", "Want the one-page PDF?", ["Venues: use it to check any FPV pilot you hire", "Pilots: use it on your next shoot"], "DM CHECKLIST · DM ONE TAKE to book", "californiadrones.io"),
 ],
}

def slide(ep, i, n, s):
    kind = s[0]
    head = f'<div class="top"><span class="label">FPV, Flown Right · Ep. {ep:02d}</span><span class="count">{i}/{n}</span></div>'
    if kind == "title":
        _, title, sub = s
        fs = 104 if len(title) <= 34 else 88 if len(title) <= 56 else 78
        body = f"""<div class="tbody"><p class="bignum">{ep:02d}</p><h1 style="font-size:{fs}px">{esc(title)}</h1><p class="sub">{esc(sub)}</p><p class="swipe">Swipe <span>→</span></p></div>"""
    elif kind == "list":
        _, h, items = s
        body = f"""<div class="cbody"><h2>{esc(h)}</h2><ul class="diam">{''.join(f'<li>{esc(x)}</li>' for x in items)}</ul></div>"""
    elif kind == "compare":
        _, h, la, li, ra, ri = s
        col = lambda lab, it, c: f'<div class="col"><p class="clab" style="color:{c}">{esc(lab)}</p><ul class="diam">{"".join(f"<li>{esc(x)}</li>" for x in it)}</ul></div>'
        body = f"""<div class="cbody"><h2>{esc(h)}</h2><div class="cols">{col(la, li, 'var(--scan)')}{col(ra, ri, 'var(--signal)')}</div></div>"""
    else:
        _, h, items, cta, note = s
        fs = 76 if len(h) <= 50 else 64
        body = f"""<div class="cbody cta"><h2 style="font-size:{fs}px">{esc(h)}</h2><ul class="diam">{''.join(f'<li>{esc(x)}</li>' for x in items)}</ul>
<p class="ctabtn">{esc(cta)}</p><p class="note">{esc(note)}</p></div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8">{BASE}<style>
body{{width:1080px;height:1350px;position:relative;overflow:hidden}}
.top{{position:absolute;left:84px;right:84px;top:72px;display:flex;justify-content:space-between;align-items:baseline}}
.top .label{{font-size:36px}} .count{{font-size:28px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}}
.tbody{{position:absolute;left:84px;right:84px;top:200px;bottom:190px;display:flex;flex-direction:column}}
.bignum{{font-size:220px;line-height:.85;font-weight:320;font-variation-settings:"wdth" 125;letter-spacing:-.03em;color:var(--signal)}}
h1{{margin-top:auto;line-height:1.0;font-weight:740;font-variation-settings:"wdth" 116;letter-spacing:-.02em;text-wrap:balance}}
.sub{{margin-top:28px;font-size:38px;line-height:1.3;color:var(--lede);max-width:840px}}
.swipe{{margin-top:44px;font-size:30px;font-weight:650;color:var(--signal);letter-spacing:.02em}}
.cbody{{position:absolute;left:84px;right:84px;top:190px;bottom:190px;display:flex;flex-direction:column;justify-content:center}}
h2{{font-size:76px;line-height:1.02;font-weight:740;font-variation-settings:"wdth" 116;letter-spacing:-.018em;text-wrap:balance;padding-left:26px;border-left:6px solid var(--signal)}}
ul.diam{{margin-top:56px;display:grid;gap:30px;font-size:42px;line-height:1.28;color:var(--text)}}
.cols{{margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:44px}}
.cols ul.diam{{margin-top:24px;font-size:37px;gap:24px}}
.clab{{font-family:var(--font-display);font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:40px;padding-bottom:16px;border-bottom:2px solid var(--line)}}
.cta ul.diam{{font-size:38px;gap:22px;margin-top:44px}}
.ctabtn{{margin-top:56px;align-self:flex-start;background:var(--signal);color:var(--on-signal);font-weight:700;font-size:38px;padding:22px 34px;border-radius:12px;font-variation-settings:"wdth" 108}}
.note{{margin-top:30px;font-size:26px;color:var(--muted)}}
.bar{{position:absolute;left:0;right:0;bottom:0;height:108px;background:#020D12;display:flex;align-items:center;gap:20px;padding:0 84px}}
.bar img{{width:56px;height:56px}} .bar span{{font-size:28px;font-weight:560;color:var(--muted)}}
.bar .bands{{position:absolute;left:0;right:0;top:-34px;gap:6px}}
</style></head><body><div class="bg"></div><div class="dots" style="opacity:.12"></div>{head}{body}
<div class="bar">{bands((3,5,7,9))}<img src="{B}/logo/mark-mono-light.svg" alt=""><span>California Drones · californiadrones.io</span></div>
</body></html>"""

# ---------------------------------------------------------------- Checklist PDF (US Letter, Paper palette)
CHECK = [s for s in CAR[11] if s[0] == "list"]
def checklist():
    secs = ''.join(f"""<section><h3>{esc(h)}</h3><ul>{''.join(f'<li><span class="box"></span>{esc(x)}</li>' for x in items)}</ul></section>""" for _, h, items in CHECK)
    return f"""<!doctype html><html><head><meta charset="utf-8">{BASE}<style>
@page{{size:8.5in 11in;margin:0}}
html,body{{background:var(--paper);color:var(--ink)}}
body{{width:8.5in;height:11in;position:relative;overflow:hidden}}
.head{{background:var(--abyss);color:var(--text);padding:.45in .6in .4in;position:relative}}
.head img{{height:.42in}}
.head .label{{margin-top:.22in;font-size:15pt}}
.head h1{{margin-top:.06in;font-size:30pt;line-height:1.02;font-weight:740;font-variation-settings:"wdth" 118;letter-spacing:-.015em}}
.head p.sub{{margin-top:.08in;font-size:10.5pt;color:var(--lede);max-width:6in}}
.head .bands{{position:absolute;left:0;right:0;bottom:0;gap:3px}}
main{{padding:.32in .6in 0;display:grid;grid-template-columns:1fr 1fr;gap:.16in .4in}}
section{{break-inside:avoid}}
h3{{font-size:12.5pt;font-weight:740;font-variation-settings:"wdth" 112;padding-bottom:.05in;border-bottom:1.5pt solid var(--amber-ink)}}
ul{{list-style:none;margin-top:.08in;display:grid;gap:.05in}}
li{{display:flex;gap:.1in;font-size:10pt;line-height:1.35;color:var(--ink)}}
.box{{flex:none;width:.15in;height:.15in;border:1.2pt solid var(--slate);border-radius:2pt;margin-top:.02in}}
.why{{align-self:start;margin-top:.04in;padding:.14in .18in;border-left:3pt solid var(--amber-ink);background:#EFEADF;font-size:9.6pt;line-height:1.45;color:var(--ink)}}

.shoot{{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:.12in .4in;margin-top:.02in}}
.shoot p{{border-bottom:1pt solid #BFB6A3;height:.32in;position:relative}}
.shoot p span{{position:absolute;left:0;bottom:.05in;font-size:8.4pt;font-weight:600;color:var(--slate);text-transform:uppercase;letter-spacing:.06em}}
.shoot p.wide2{{grid-column:1/-1;height:.42in}}
footer{{position:absolute;left:.6in;right:.6in;bottom:.4in;display:flex;justify-content:space-between;align-items:center;font-size:8.6pt;color:var(--slate);border-top:1pt solid #D9D2C3;padding-top:.12in}}
footer b{{color:var(--ink)}}
</style></head><body>
<div class="head"><img src="{B}/logo/lockup-horizontal-on-dark.svg" alt="California Drones">
<p class="label">FPV, Flown Right · The one-take checklist</p>
<h1>Before every one-take fly‑through</h1>
<p class="sub">What a California Drones pilot checks before flying FPV through a venue, home or event space. Pilots: use it on your next shoot. Venues: use it to check any FPV pilot you hire.</p>
{bands((2,3,5,7))}</div>
<main>{secs}
<p class="why"><b>Why it matters:</b> a one-take only looks effortless when the route, the people and the airspace were sorted beforehand. Rushed one-takes are how props hit walls. General information, not legal advice; rules change, so check faa.gov.</p>
<div class="shoot"><p><span>Venue / site</span></p><p><span>Date and time</span></p><p><span>Pilot</span></p><p><span>Spotter</span></p><p class="wide2"><span>Route notes and hazards</span></p></div>

</main>
<footer><span><b>California Drones</b> · FAA Part 107 certified · Fully insured · FPV for Raging Waters</span><span>(805) 746-9775 · californiadrones.io</span></footer>
</body></html>"""

manifest = []
for num, mno, mod, title in EPS:
    p = f"cover_ep{num:02d}.html"; open(os.path.join(OUT, p), "w").write(cover(num, mno, mod, title)); manifest.append((p, 1080, 1920))
p = "cover_live.html"; open(os.path.join(OUT, p), "w").write(cover(0, "", "Monthly · last Thursday · 7 pm", "Ask a working FPV pilot", kind="live")); manifest.append((p, 1080, 1920))
for ep, slides in CAR.items():
    for i, s in enumerate(slides, 1):
        p = f"carousel_ep{ep:02d}_{i:02d}.html"; open(os.path.join(OUT, p), "w").write(slide(ep, i, len(slides), s)); manifest.append((p, 1080, 1350))
open(os.path.join(OUT, "checklist.html"), "w").write(checklist())
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"))
print(len(manifest), "images + checklist")
