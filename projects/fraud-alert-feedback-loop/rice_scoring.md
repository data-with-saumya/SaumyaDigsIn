# RICE Prioritization — Fraud Alert False Positive Features

Part of the [Should We Build the "This Was Me" Button?](./README.md) investigation.

---

## Framework

RICE is a product prioritization framework that scores features on four dimensions:

| Dimension | Definition |
|---|---|
| **Reach** | How many users does this affect per quarter? Scored 1–10 as a relative scale here. |
| **Impact** | How much does it move the needle for each user it reaches? (1 = minimal, 10 = massive) |
| **Confidence** | How confident are we in our Reach and Impact estimates? (1 = very uncertain, 10 = very confident) |
| **Effort** | How much work does this take? Scored 1–10 where 10 = lowest effort (inverse, to keep higher = better) |

**Score = (Reach × Impact × Confidence) / (10 − Effort + 1)**

*Note: Standard RICE uses Effort in person-months as a divisor. Here Effort is scored 1–10 and inverted so that higher scores consistently mean better. Scores are relative to each other, not absolute.*

---

## Candidate Features

Three features were evaluated as responses to the fraud alert false positive problem.

---

### Feature 1: "This Was Me" Feedback Loop

**Description:** A binary feedback prompt ("This Was Me" / "This Was Not Me") on fraud alert notifications and in-app alert cards. User feedback is sent as a training signal to the fraud detection model. The model learns to adjust its risk scoring for this user's transaction patterns over time.

| Dimension | Score | Reasoning |
|---|---|---|
| Reach | 10 | Every user who receives a false positive fraud alert is a direct beneficiary. For most consumer fintech apps, this is a significant proportion of active users — fraud alert systems with high false positive rates affect almost everyone eventually. |
| Impact | 9 | This is the only candidate feature that actually teaches the model. Personalised model improvement compounds over time — each confirmed false positive makes future alerts more accurate for that specific user. The impact per user is high and durable. |
| Confidence | 7 | The feedback loop's effectiveness depends on: (a) sufficient user engagement with the feedback prompt, (b) the ML training pipeline being able to ingest user feedback signals, and (c) the guardrails working as designed. These are non-trivial dependencies. Confidence is moderate, not high. |
| Effort | 7 | Moderate-to-high effort. Requires: UI changes to the notification and alert card, a new feedback API endpoint, logging infrastructure, integration with the fraud model training pipeline, guardrail implementation and testing, and abuse detection. Not a two-week build. |

**RICE Score: 63**

---

### Feature 2: Smarter Global Alert Thresholds

**Description:** Re-tune the fraud model's alert thresholds using ML techniques (e.g. gradient boosting, threshold optimisation) to reduce false positives globally, without requiring user feedback. The model becomes more accurate for the average user.

| Dimension | Score | Reasoning |
|---|---|---|
| Reach | 10 | Affects all users — threshold changes apply globally. |
| Impact | 6 | Improves accuracy for the median user, but threshold tuning is a blunt instrument. It cannot personalise. A threshold that eliminates false positives for most users will still misfire on outliers — users with unusual but legitimate spending patterns. Impact per individual user is lower than the feedback loop. |
| Confidence | 5 | Threshold tuning is empirically difficult. There is a well-documented risk of regression: loosening thresholds to reduce false positives also reduces the fraud catch rate. Confidence that this approach meaningfully reduces false positives without increasing missed fraud is moderate at best without access to the actual model and data. |
| Effort | 7 | Requires ML model retraining, threshold experiment design, shadow testing, and careful monitoring of fraud catch rate during rollout. Similar effort to the feedback loop but with less infrastructure required. |

**RICE Score: ~43**

---

### Feature 3: Alert Snooze (7-Day Suppress)

**Description:** A "Snooze alerts for 7 days" option on the fraud alert notification. Users who find alerts disruptive can suppress them temporarily without fully disabling them.

| Dimension | Score | Reasoning |
|---|---|---|
| Reach | 10 | Affects all users who receive alerts — the option would be universally available. |
| Impact | 3 | This is a band-aid, not a fix. Snoozing alerts does not improve the model. It does not reduce false positives — it just delays them. More importantly: users who snooze alerts are exactly the users most at risk of missing genuine fraud during the snooze window. The feature may feel helpful while making the underlying problem worse. |
| Confidence | 9 | Very high confidence in Reach and Impact estimates because the feature is simple and well-understood. The low Impact score is itself high-confidence. |
| Effort | 9 | Low engineering effort. A time-limited notification suppression is a small change to the notification settings layer. Could be built and shipped in 1–2 sprints. |

**RICE Score: ~27**

---

## Summary

| Rank | Feature | RICE Score | Key trade-off |
|---|---|---|---|
| 1 | "This Was Me" feedback loop | 63 | Highest long-term ROI. Hardest to build safely. |
| 2 | Smarter global thresholds | 43 | Improves average accuracy. Cannot personalise. |
| 3 | Alert snooze | 27 | Easy to ship. Solves the symptom, not the problem. |

**Recommendation:** Build the feedback loop. Use threshold tuning as a complementary background improvement, not a substitute. Do not ship the snooze feature — it addresses user frustration at the cost of security.

---

## Limitations of This Analysis

- Scores are reasoned estimates, not derived from real backlog or product data.
- The Effort scores assume a mid-sized engineering team with a reasonably mature ML infrastructure. A team without a feature store or model training pipeline would score the feedback loop significantly lower on Effort.
- RICE does not capture strategic or regulatory constraints. In a regulated fintech, the feedback loop may require compliance sign-off that adds significant time to the Effort dimension.

---

*Part of the [SaumyaDigsIn](https://www.linkedin.com/in/saumya-singh-0604/) series.*
