---
name: google-ads-campaign
description: How California Drones runs Google Ads search on a small budget, covering structure, keywords and negatives, RSA limits, measurement without site pixels, the weekly optimization routine and kill rules. Use when building, launching, reviewing or optimizing paid search, or when the owner shares a search-terms or campaign report.
---

# Google Ads on a small budget

## Structure
- Search only. Turn off Search Partners and Display expansion, keep auto-apply recommendations off, and don't use broad match at the start.
- One campaign per service intent with tight ad groups (phrase and exact match), each pointing to its own landing page:
  - `/construction-drone-services/` and `/drone-mapping/`: highest ticket, recurring work.
  - `/real-estate-drone-photography/`: high volume, low ticket.
  - `/fpv-drone-videography/`: mid ticket.
  - `/drone-services-los-angeles/` and `/drone-services-ventura-county/`: generic "drone services near me" searches.
  - `/cell-tower-inspection/`: national, tiny volume. Usually better won by outreach.
- Location targeting: "Presence: people in or regularly in". LA, Ventura, Santa Barbara and Orange counties; telecom nationwide.
- Bidding: start with Manual CPC or Maximize Clicks with a CPC cap. Switch to Maximize Conversions after about 15 to 30 recorded conversions.

## Measurement (no pixels on the site)
- Turn on auto-tagging. The site form puts `gclid` and `utm_*` into each lead email.
- Log each lead in the Lead Tracker with its gclid. Upload qualified leads and won jobs as offline conversions (Google Ads > Goals > Uploads) weekly.
- Use call assets with a Google forwarding number and count calls of 60 seconds or longer as conversions.

## RSA rules
- 15 headlines of 30 characters or fewer and 4 descriptions of 90 or fewer. Check lengths with a script.
- Use only facts from `.claude/business-facts.md`. Pin only the brand or service headline if needed.

## Shared negatives (starter)
jobs, job, hiring, salary, career, training, course, school, class, license, licence, certification, part 107 test, exam, buy, sale, price of drone, cheap drone, toy, kids, repair, fix, parts, battery, DJI store, rental, rent a drone, how to, tutorial, diy, free, simulator, game, regulations, laws, no fly zone, app, software, download, reddit, youtube

## Weekly routine (20 minutes)
1. Review search terms: add negatives and promote converting terms to exact match.
2. Pause keywords that spend more than 2× the target cost per lead with no conversion.
3. Check lead quality in the tracker and upload offline conversions.
4. Shift budget toward the campaign with the lowest cost per qualified lead.
5. Kill rule: if a campaign spends $300 with no qualified lead, pause it and rethink the landing page and offer.

## Approval
Never create accounts, change budgets or launch campaigns without the owner's explicit go-ahead.
