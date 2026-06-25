# A/B Test Design
## Fraud Alert Feedback Loop — Validation Experiment

**Part of:** [Should We Build the "This Was Me" Button?](./README.md)

---

## Why We Need a Controlled Experiment

The "This Was Me" feedback loop has an intuitive value proposition. But before shipping it to all users, we need to validate two things simultaneously:

1. **It works** — users who can give feedback actually generate fewer repeat false alerts
2. **It is safe** — the feature does not cause an increase in missed fraud

These two things cannot be assessed from analytics alone after a full rollout. If fraud miss rate increases post-launch, we would not know whether it was caused by the feedback feature, a change in fraud patterns, or something else entirely. A controlled experiment gives us a clean read.

---

## Hypothesis

> Users who can provide structured feedback on fraud alerts ("This Was Me" / "This Was Not Me") will experience a **15% relative reduction in false positive alerts for the same merchant-user patterns** within 30 days, compared to users who receive standard dismiss-only alerts.

Secondary hypothesis:

> Users in the variant group will have a lower alert opt-out rate at day 60 compared to control, reflecting improved trust in the notification system.

---

## Test Design

| Parameter | Value | Reasoning |
|---|---|---|
| Control | Standard fraud alert — dismiss or ignore only | Existing product experience, no changes |
| Variant | Fraud alert with "This Was Me" / "This Was Not Me" action buttons | The feature under test |
| Traffic split | 50 / 50 | Balanced split for clean statistical comparison |
| Randomisation unit | User ID | Each user is consistently assigned to one group. Transaction-level randomisation would expose users to inconsistent experiences and contaminate the model training signal. |
| Eligible population | Users with at least one fraud alert in the past 30 days, **excluding** users with any confirmed fraud event in the past 6 months | See eligibility criteria section below |
| Minimum run duration | 30 days | Fraud patterns and model learning operate on weekly-to-monthly cycles. Shorter windows do not give the model enough feedback to produce measurable changes. |
| Minimum detectable effect (MDE) | 15% relative reduction in false positive rate | Below this threshold, the effect is too small to be practically meaningful even if statistically significant |
| Statistical significance threshold | p < 0.05 | Standard |
| Statistical power | 80% | Standard — means a 20% chance of missing a true effect of the MDE size |

---

## Eligibility Criteria

### Included

- Active users (at least one app session in the past 30 days)
- Users who have received at least one fraud alert in the past 30 days (ensures the experiment measures users who actually interact with fraud alerts, not users who have never seen one)
- Users on mobile (iOS or Android) — push notification action buttons require mobile; web users are excluded from v1

### Excluded

- Users with any **confirmed fraud event** on their account in the past 6 months
- Users who have already **fully disabled** fraud notifications (they would not see the variant feature; including them dilutes the result)
- Users in any other active A/B experiment that modifies the fraud alert experience (experiment collision)
- Internal test accounts

### Why the fraud history exclusion matters

Users with recent confirmed fraud are at elevated risk during the test window. If they are in the variant group and a fraudulent transaction occurs, they may:
- Inadvertently tap "This Was Me" on a real fraud event (contaminating the training signal)
- Distort the fraud miss rate comparison between groups

Running the initial experiment on lower-risk users gives a cleaner validation before expanding to the full population.

---

## Metrics

### Primary metrics

**1. False positive rate (per-user, 30-day window)**

Definition: (transactions marked "This Was Me" by the user) / (total fraud alerts received by the user)

Why per-user: aggregate false positive rate can be dominated by a small number of high-alert users. Per-user rate gives a fairer comparison across the two groups.

Expected direction: **down** in variant vs control

**2. Repeat false positive rate for same merchant-user pair**

Definition: (alerts fired on a merchant-user pair where the user previously marked an alert as "This Was Me") / (total alerts fired on merchant-user pairs with prior feedback)

This is the most direct test of whether the feedback loop is teaching the model. If the model learns, this number should drop in the variant group over the 30-day window.

Expected direction: **down** in variant vs control

### Guardrail metrics (test pauses if these move adversely)

**3. Fraud miss rate**

Definition: (confirmed fraudulent transactions not caught by the fraud alert system) / (total confirmed fraudulent transactions)

Measurement: confirmed fraud events are identified retrospectively via the dispute process and chargeback data. This metric lags by approximately 30–45 days.

**Kill switch condition:** if fraud miss rate in the variant group rises more than **2% relative** to the control group at any interim check, the experiment is paused immediately and the variant is disabled pending a full review.

This condition is checked **daily**, not at end-of-test. The daily check uses a sequential testing approach to control for multiple comparisons — a standard Bayesian monitoring setup is appropriate here.

**4. Feedback abuse rate**

Definition: (feedback events flagged by the abuse detection system) / (total feedback events in variant group)

Target: below 0.5%. Above 1% triggers a review of the abuse detection logic and potentially the feedback weight cap before the experiment continues.

### Secondary / exploratory metrics

**5. Alert opt-out rate at day 60**

Definition: (users who disabled fraud push notifications during the 60-day window) / (total eligible users in each group)

Why day 60: model learning takes time to produce visible changes in alert behaviour. Alert opt-out is a lagging indicator of user trust. 30 days may be too short for this effect to be observable.

**6. Feedback engagement rate**

Definition: (users who tapped "This Was Me" or "This Was Not Me" at least once) / (users in variant group who received at least one alert)

If below 20%, the feedback prompt is not discoverable or legible enough to generate meaningful signal. This indicates a UX problem, not a model problem — and should be addressed before concluding the feature does not work.

---

## Timeline

| Phase | Duration | What happens |
|---|---|---|
| Pre-experiment | 2 weeks | Guardrails implemented and tested, baseline metrics collected, randomisation infrastructure validated |
| Ramp | Days 1–3 | Variant rolled to 10% of eligible users — watch for any immediate anomalies before full 50/50 split |
| Full experiment | Days 4–30 | 50/50 split running, daily guardrail metric checks |
| Analysis | Week 5–6 | Primary metric analysis, secondary metric review, fraud miss rate final read (accounts for 30–45 day chargeback lag) |
| Decision | Week 6 | Ship, iterate, or abandon based on results |

---

## Known Limitations of This Design

### Network effect / SUTVA violation

The feedback loop trains the fraud model — which affects users in **both** groups. If the variant group generates enough feedback to meaningfully shift the model's global parameters, control group users may also see improved alert accuracy. This would make the variant effect appear smaller than it actually is (underestimation bias).

Mitigation: run the experiment for a short enough window (30 days) that model retraining cycles do not propagate variant group feedback into the control group's experience. If the platform retrains the model weekly or more frequently, this is a real concern that should be discussed with ML Platform before the experiment runs.

### Chargebacks lag the experiment

Confirmed fraud data arrives via the dispute and chargeback process, which takes 30–45 days. The fraud miss rate guardrail metric cannot be fully evaluated until 30–45 days after the experiment ends. This means the final fraud safety assessment trails the primary metric results. Plan the decision timeline accordingly.

### User feedback quality

"This Was Me" feedback is user-generated and inherently noisy. A user who taps "This Was Me" out of habit, confusion, or disinterest in reading the alert copy introduces incorrect signal. The experiment cannot cleanly distinguish between users who gave feedback deliberately versus accidentally. The feedback weight cap (15%) is the primary protection against this noise distorting the model.

---

## Decision Framework

| Result | Action |
|---|---|
| Primary metrics improve, guardrail metrics flat | Ship to 100% of eligible users. Expand eligibility in a subsequent experiment. |
| Primary metrics improve, fraud miss rate rises > 2% | Pause. Review feedback weight cap and high-confidence lock implementation. Do not ship until root cause is identified. |
| Primary metrics flat, guardrail metrics flat | Investigate feedback engagement rate. If below 20%, fix the UX and re-run. If engagement is adequate, the model learning hypothesis may be wrong — reconsider the feature. |
| Primary metrics worsen | Abandon. This should not happen but would indicate a fundamental flaw in how feedback signals are integrated. Full review required. |

---

*Part of the [SaumyaDigsIn](https://www.linkedin.com/in/saumya-singh-0604/) series.*
