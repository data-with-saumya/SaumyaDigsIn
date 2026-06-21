# Trust & Safety — Policy Enforcement Spike Investigation

Personal investigation project: modeled a synthetic trust & safety enforcement data mart and ran a full root-cause investigation on a sudden spike in content removals.

## The Problem

Weekly content moderation removals jumped **+248% in a single week**. The question: was the system over-reacting (a classifier/policy bug), or was something real happening (a coordinated attack)?

## The Setup

| | |
|---|---|
| **Domain** | Content moderation / trust & safety |
| **Data** | Simulated by me — modeled to behave the way real enforcement logs are structured (not real platform data) |
| **Metric** | Weekly removals, "Misinformation" category |
| **Window** | 16 weeks |

## Why It Matters

On a normal dashboard, "classifier bug" and "coordinated attack" look identical — both show a removals spike. But they call for opposite fixes:

- **Classifier bug** → loosen the policy threshold
- **Coordinated push** → escalate and build network defenses

Get the diagnosis wrong, and the fix does nothing (or makes things worse).

## Approach

1. **Detect** — week-over-week anomaly scan on removed counts, flagged automatically past a +75% threshold (`analysis_queries.sql`, Section 3)
2. **Disentangle** — RCA drill-down across device × channel age × detection source to isolate the driving cohort (Section 4)
3. **Validate** — precision check comparing appeal overturn rate during the spike vs. baseline, to confirm whether removals were actually correct (Section 5)

## Findings

- Removals jumped from **810 → 2,822** in one week (**+248%**) — caught by an automated anomaly query, not eyeballed on a chart.
- **41%** of the spike traced to a single cohort: **accounts under 7 days old, uploading from mobile** — the same pattern held across every cut of the data.
- Appeal overturn rate **fell** during the spike (**2.9%**) vs. the 16-week baseline (**15.0%**) — enforcement got *more* confident, not less, during the anomaly window.

## Verdict

**Not a system bug. A real, coordinated push.**

A genuine classifier/policy bug would show *rising* overturns during the spike (more false positives getting reversed on appeal). Instead, overturns dropped — meaning the system was catching real violations more reliably, not less. Combined with the concentrated new-account/mobile cohort, the pattern points to a coordinated, low-effort channel network rather than organic creator behavior — likely timed to a regional news cycle.

**Recommendation:** route to network-detection (channel-creation-velocity signals as an early-warning feature) rather than adjusting the Misinformation classifier threshold.

## What's in this folder

- [`analysis_queries.sql`](./analysis_queries.sql) — full SQL analysis pack: schema, weekly KPI framework, anomaly detection, RCA drill-down, precision check
- [`dashboard.html`](./dashboard.html) — interactive dashboard visualizing the investigation (KPI strip, regional trend, category/region heatmap, RCA case file)

---

🔗 Full visual writeup posted on [LinkedIn](https://www.linkedin.com/in/saumya-singh-0604/)
