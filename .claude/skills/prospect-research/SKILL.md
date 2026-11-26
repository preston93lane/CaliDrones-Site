---
name: prospect-research
description: Method for building a verified prospect list for California Drones in one segment and region, with public contact routes, a sourced personalization hook and an A/B/C priority. Use when asked to find leads, clients, companies to pitch, or to refresh the lead list.
---

# Prospect research

## Who buys each service
| Service | Real buyers (who signs the PO) |
|---|---|
| Cell tower inspection | Telecom GCs and turf vendors on carrier upgrades, tower engineering firms (mount mapping, TIA-222-H mount analysis, PMI, closeouts), tower owners' field services (American Tower, Crown Castle, SBA, Vertical Bridge), site acquisition / A&E firms, drone inspection networks that sub out pilots |
| 3D mapping / construction | GCs and CMs with active projects (monthly progress flights), developers and owners' reps, civil and survey firms without in-house drones, solar EPCs, quarries / landfills (stockpile volumes), wildfire rebuild contractors |
| Real estate | Listing photography companies (steady sub volume), luxury and land listing agents, builders, commercial brokerages |
| Cinematic / FPV | Hotels, wineries, venues, attractions, dealerships, gyms (one-take FPV fly-throughs); production companies, agencies, tourism boards |

## Steps
1. Search for companies with a current, sourced reason to need drone work now: an active project, a contract win, a new listing, a renovation or opening, a hiring post for drone or inspection roles.
2. For each company, find the public route in: a vendor or subcontractor portal, a department email, a contact form, a phone number, and a named person with a relevant role only where the company itself or a press release publishes them.
3. Write one hook sentence grounded in the source URL.
4. Score: **A** = in Southern California (or national and known to sub out pilots) **and** a current need; **B** = clear fit, need unclear; **C** = speculative.
5. Note vendor requirements you find (ISNetworld, Avetta, insurance minimums, COI, W-9, NATE/NWSA).

## Output CSV (exact header)
`company,segment,services_fit,region,website,contact_name,contact_role,contact_email,contact_phone,contact_url,hook,source_url,priority,notes`

## Rules
- Only business contact details the company or person publishes publicly. Never guess or pattern-generate emails. Nothing from behind logins.
- Every row has a source URL. No invented facts.
- Never contact anyone, submit forms, or sign up.
- Write outside the repo (it is public): the session scratchpad, or the owner's private Drive folder "California Drones Growth".
- Dedupe against the Lead Tracker sheet before handing over.
