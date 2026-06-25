# Should We Build the "This Was Me" Button?
### A Product Manager Investigation into Fraud Alert False Positives

**Domain:** Fintech / Consumer Banking Apps
**Type:** Feature decision investigation
**Framework:** RICE prioritization, PRD, KPI design, A/B test spec
**Series:** [SaumyaDigsIn](https://www.linkedin.com/in/saumya-singh-0604/) — personal PM investigations

---

## The Problem

Users are turning off fraud alerts because they fire too often.

That sentence sounds like a UX complaint. It is actually a security catastrophe hiding inside a product metric.

When a user disables fraud notifications, they are not just opting out of annoying pings. They are removing the only real-time channel through which a bank can tell them their account has been compromised. The alert that would have caught a fraudulent transaction at 2am on a Tuesday — they will not see it. They turned it off three weeks ago because the same alert fired when they bought coffee at a new café.

This investigation asks: **should we build a user-facing feedback mechanism — a "This Was Me" button on fraud alerts — that feeds signal back into the fraud detection model?**

The answer is not straightforward. This document walks through the full decision.

---

## Research & Context

### The scale of the false positive problem

The financial industry has a well-documented false positive problem in fraud and transaction monitoring. The figures below are sourced from published industry research — important methodology notes follow each.

| Stat | Figure | Source | Methodology note |
|---|---|---|---|
| Industry avg false positive rate | ~95% | Flagright (2026) | This figure refers specifically to **AML (anti-money laundering) compliance monitoring** — the internal analyst alert queue at financial institutions. It is not a direct measure of consumer-facing push notification false positives, which are a related but distinct system. Used here as a proxy for the broader false positive problem. |
| Best-in-class target | 30–50% | Flagright (2026) | Same AML compliance context. Leading institutions with ML-native detection systems aim for this range. |
| Consumer switching behaviour | "Significant share consider switching within 90 days of a false decline" | Javelin Strategy & Research, cited in FluxForce AI (2026) | Exact percentage not published in the secondary source reviewed. Quoted conservatively and without a specific figure. |
| 2026 customer frustration trend | Growing complaints about false declines at groceries, subscriptions, regular merchants | thefreefinancialadvisor.com (May 2026) | Consumer reporting, not primary research. Directionally consistent with the AML data above. |

### Why it is getting worse, not better

Real fraud has gotten more sophisticated — synthetic identities, account takeovers, coordinated networks. In response, fraud detection systems have been tuned more aggressively. The consequence is a classic precision-recall tradeoff: casting a wider net catches more real fraud, but also catches far more legitimate transactions.

The deeper problem is **alert fatigue**. When analysts (and users) are flooded with false positive alerts, they stop reading them carefully. A fraud analyst who has cleared 200 false positives in a row is not in the right state to catch a sophisticated synthetic identity scheme. The system designed to catch fraud ends up enabling it.

### What already exists

Enterprise fraud detection platforms — Feedzai, Sardine, ComplyAdvantage, BioCatch — have made significant progress on reducing false positives at the model level using behavioural AI. The backend is genuinely getting smarter.

The gap is at the **user-facing layer**. When a legitimate transaction is flagged, the user currently has no structured way to tell the model it was wrong. They dismiss the alert. The model does not learn. The same merchant fires the same alert next month.

---

## The PM Decision

> **Should we build a "This Was Me" / "This Was Not Me" feedback button on fraud alert notifications?**

The feature itself is obvious. A user taps "This Was Me" on a flagged transaction. That signal feeds back into the fraud detection model. The model learns to trust this user's pattern at this merchant. Future alerts for the same pattern are suppressed or scored lower.

The risk is also obvious — once you see it. **Attackers are also users.**

```
IF build without guardrails:
  → attacker completes fraudulent transaction
  → marks it "This Was Me"
  → model learns to trust this pattern
  → repeat attack succeeds undetected
  → you have built a model bypass, not a product improvement
```

This is why the decision is not "build or don't build." It is "what are the conditions under which building this is safe?"

---

## RICE Prioritization

Three candidate features were scored against the RICE framework to determine which to build first.

**RICE formula:** Score = (Reach × Impact × Confidence) / Effort

| Feature | Reach | Impact | Confidence | Effort | Score | Reasoning |
|---|---|---|---|---|---|---|
| **"This Was Me" feedback loop** | 10 | 9 | 7 | 10 | **63** | Every user who receives a false positive alert is a potential beneficiary. Impact is high because the model learns continuously. Confidence is moderate because model training pipelines add implementation complexity. |
| Smarter global alert thresholds | 10 | 6 | 5 | 7 | 43 | Improves accuracy for everyone but does not personalise. A threshold that works for most users will still misfire on outliers. Lower confidence because threshold tuning is empirically hard to get right without causing regression in fraud catch rate. |
| Alert snooze (7-day suppress) | 10 | 3 | 9 | 9 | 30 | High confidence and low effort, but this is a band-aid. It does not improve the model. It just delays the false positive. Users who snooze alerts are exactly the users most at risk of missing genuine fraud during the snooze window. |

**Winner: feedback loop.** Highest long-term ROI, hardest to build safely. The difficulty is not a reason to avoid it — it is a reason to plan it carefully.

*Note: RICE scores are reasoned estimates based on the problem context above, not derived from real backlog data. They are intended to illustrate the prioritization framework and the relative trade-offs, not to serve as precise numerical outputs.*

---

## PRD Snapshot

A condensed product requirements document for the feedback feature.

### User
Any user who has received a fraud alert on a flagged or declined transaction within the past 48 hours.

### Feature description
A "This Was Me" and "This Was Not Me" binary feedback prompt, surfaced in two places:
1. Directly on the fraud alert push notification (as action buttons)
2. On the in-app transaction detail card for any flagged transaction

### In scope
- Feedback signal (user ID, transaction ID, merchant, amount, timestamp, response) sent to the fraud model training pipeline
- User-level false positive rate tracked as a derived metric
- Gradual alert suppression for merchant-user pairs where the user has confirmed legitimacy 3+ times

### Out of scope
- User-visible explanation of how the model uses their feedback
- Real-time score updates visible to the user
- Reversal or dispute flow triggered by "This Was Not Me" (this should go through the existing dispute process, not a new flow)
- Any changes to the fraud model architecture itself

### Guardrails (non-negotiable, ship before the feature)
1. **Feedback weight cap:** user feedback contributes a maximum of 15% to the overall fraud risk score. It cannot override the model's primary signal.
2. **High-confidence lock:** for any transaction with a fraud probability score above 0.85, user feedback is accepted as a data point but cannot reduce the risk score below the threshold that triggers mandatory review. The attacker who marks real fraud as "This Was Me" still gets reviewed.
3. **Abuse detection:** unusual feedback patterns (e.g. a user account marking multiple high-value transactions as legitimate within a short window, or feedback patterns that match known fraud rings) are flagged for manual review. The feedback system itself is monitored for adversarial use.

### Acceptance criteria
- A user who receives a fraud alert can tap "This Was Me" within 48 hours of the alert
- The feedback signal is logged and available to the model training pipeline within 24 hours
- The user sees confirmation that their feedback was received (single toast message, no additional flow)
- The guardrails above are unit-tested and code-reviewed before the feedback UI ships

---

## KPI Framework

How we know if this worked — and how we know if it broke something.

### Primary metrics (the feature is working if these move)

**1. False positive rate — down**
Defined as: (transactions marked "This Was Me" by users) / (total fraud alerts fired)
Baseline: establish from existing alert data before launch
Target: 15% relative reduction within 90 days of launch
Why this metric: it is the most direct measure of what the feature is designed to fix

**2. Alert opt-out rate — down**
Defined as: (users who have disabled fraud push notifications) / (total active users)
Baseline: measure before launch
Target: statistically significant reduction within 60 days
Why this metric: this is the downstream consequence of the false positive problem. If the feature works, fewer users should feel the need to turn alerts off.

### Guardrail metrics (the feature has broken something if these move)

**3. Fraud miss rate — must remain flat**
Defined as: (fraudulent transactions not caught by the model) / (total fraudulent transactions)
This metric is non-negotiable. Any increase in fraud miss rate above 2% relative to control triggers an immediate pause on the feedback feature. This is the kill switch condition.

**4. Feedback abuse rate — must remain low**
Defined as: (user feedback events flagged by the abuse detection system) / (total feedback events)
Target: below 0.5%. Above 1% triggers a review of the abuse detection logic and potentially the feedback weight cap.

### Leading indicator (tells us early if the feature will work)

**5. Feedback engagement rate**
Defined as: (users who tap "This Was Me" or "This Was Not Me" when shown the prompt) / (users who received an alert with the prompt)
Why this matters: if fewer than 20% of users engage with the feedback prompt, the feature will not generate enough signal to meaningfully improve the model. This indicates a discoverability or UX problem, not a model problem — and should be addressed before concluding the feature does not work.

---

## Risk Assessment

### Risk 1 — Model bypass via attacker feedback (HIGH)
**Scenario:** An attacker completes a fraudulent transaction. They mark it "This Was Me." The model learns to trust this user-merchant-amount pattern. A repeat attack using the same pattern succeeds undetected.

**Mitigation:** The feedback weight cap (15% of score) and high-confidence lock (no override above 0.85 fraud probability) together ensure that a single "This Was Me" tap cannot meaningfully shift the model's output on a transaction the model is already confident about. The attacker who completes a high-confidence fraud event and marks it legitimate still gets reviewed.

**Residual risk:** This mitigation reduces but does not eliminate the risk. Sophisticated attackers operating at low transaction values (below the high-confidence threshold) over a long period could gradually shift their user profile toward "trusted." This is a known limitation of user-feedback-based model training.

### Risk 2 — Coordinated feedback abuse (MEDIUM)
**Scenario:** A bot network or fraud ring systematically trains the model to whitelist a specific merchant, amount range, or time window by generating large volumes of "This Was Me" feedback.

**Mitigation:** The abuse detection system monitors for feedback patterns that deviate from normal user behaviour. A single account marking five high-value transactions as legitimate within 24 hours is an anomaly. A cluster of accounts all marking the same merchant as legitimate on the same day is a signal. Both are flagged for manual review.

### Risk 3 — User misclassification (LOW)
**Scenario:** A user receives an alert about a genuinely fraudulent transaction — real fraud that happened without their knowledge. In a moment of confusion, haste, or unfamiliarity with the alert format, they tap "This Was Me," inadvertently telling the model the fraud was legitimate.

**Mitigation:** The UX of the "This Was Me" button should be designed with friction proportional to the transaction value. A ₹200 coffee shop transaction can have low-friction confirmation. A ₹40,000 transfer should require a secondary confirmation step before the feedback is accepted.

---

## A/B Test Design

### Hypothesis
Users who can provide structured feedback on fraud alerts will generate fewer repeat false alerts for the same merchant-user pattern within 30 days, compared to users with standard dismiss-only alerts.

### Test setup

| Parameter | Value |
|---|---|
| Control | Standard fraud alert — dismiss or ignore only |
| Variant | Fraud alert with "This Was Me" / "This Was Not Me" buttons |
| Split | 50/50 |
| Eligible users | Users with at least one fraud alert in the past 30 days, **excluding** users with any confirmed fraud event in the past 6 months |
| Minimum duration | 30 days |
| Minimum detectable effect | 15% relative reduction in false positive rate |
| Statistical significance threshold | p < 0.05, 80% power |

### Kill switch condition
If the fraud miss rate in the variant group rises more than 2% relative to control at any point during the test, the variant is paused immediately pending review. This condition is checked daily, not at end-of-test.

### Why this exclusion criterion matters
Excluding users with recent confirmed fraud history from the test variant is important. These users are more likely to be exposed to genuine fraud during the test window. If they mis-tap "This Was Me" on real fraud, it distorts both the model training signal and the experiment results. Running the initial test on lower-risk users gives a cleaner read on whether the feature works, before expanding to the full population.

---

## Verdict

**Build it. But the guardrails ship before the feature does.**

A "This Was Me" button is obvious. Any PM who has looked at fraud alert opt-out rates for more than ten minutes will propose it. What is not obvious is:

- The feedback weight cap
- The high-confidence override lock
- The fraud miss rate kill switch
- The abuse detection layer
- The tiered UX friction by transaction value

Without those five things, you have not built a product improvement. You have built a social engineering tool — a mechanism by which attackers can gradually train a financial institution's fraud model to trust them.

The PM job here is not deciding to build. It is defining the conditions under which building is safe, specifying those conditions clearly enough that engineering can implement and test them independently of the feature itself, and making sure those conditions ship first.

The feature is the easy part. The conditions are the job.

---

## What I Would Do Differently

A few honest limitations of this analysis:

1. **The 95% false positive stat is an AML compliance figure, not a consumer push notification figure.** These are related systems but not identical. A more rigorous version of this investigation would source data specifically on consumer-facing mobile fraud alert false positive rates, which is harder to find because banks do not publish it.

2. **RICE scores are estimates.** The Effort denominator in particular is difficult to calibrate without knowing the existing fraud model architecture. A team with an ML feature store and a mature training pipeline ships this in weeks. A team without those things ships it in months. The score assumes moderate implementation complexity.

3. **The A/B test design does not account for network effects.** In fraud detection, what happens to users in the control group can be affected by what the variant group teaches the model. If the feedback loop improves model accuracy overall, control group users benefit too — which would make the variant effect look smaller than it is. A proper experiment design would need to consider this.

---

## Sources

- Flagright. *Understanding False Positives in Transaction Monitoring.* February 2026. https://www.flagright.com/post/understanding-false-positives-in-transaction-monitoring
- FluxForce AI. *False Positive Cost Fraud Detection: The Real Bill.* April 2026. https://www.fluxforce.ai/blog/false-positives-in-fraud-detection-why-they-cost-more-than-actual-fraud
- FluxForce AI. *Drowning in Alerts? How False Positives Are Sinking Your Fraud Team.* December 2025. https://www.fraud.net/resources/drowning-in-alerts-how-false-positives-are-sinking-your-fraud-team
- The Free Financial Advisor. *The New Banking Frustration of 2026: More Customers Say Fraud Alerts Are Blocking Legitimate Purchases.* May 2026. https://www.thefreefinancialadvisor.com
- DownBeach. *Why Bank Fraud Alerts Got Smarter in 2026.* May 2026. https://downbeach.com
- Javelin Strategy & Research. Consumer switching behaviour stat cited via FluxForce AI (2026). Primary source not directly reviewed.

---

*This is a personal investigation — not affiliated with any employer or client. All analysis is my own. Feedback welcome.*

*Part of the [SaumyaDigsIn](https://www.linkedin.com/in/saumya-singh-0604/) series.*
