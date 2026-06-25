# Product Requirements Document
## Feature: Fraud Alert Feedback Loop ("This Was Me")

**Status:** Draft — for review
**Author:** Saumya
**Part of:** [Should We Build the "This Was Me" Button?](./README.md)
**Last updated:** June 2026

---

## Problem

Fraud alert systems fire on legitimate transactions at an industry rate of ~95% false positives. Users who receive repeated false alerts lose trust in the notification system. A meaningful share disable fraud notifications entirely — removing the primary real-time channel for fraud communication.

When a flagged transaction is legitimate, the user currently has no structured way to tell the system it made a mistake. They dismiss the alert. The model does not learn. The same false positive fires again next month.

---

## Goal

Reduce the false positive rate of fraud alerts by creating a user-level feedback mechanism that teaches the fraud model what "normal" looks like for each individual user — without increasing the fraud miss rate.

---

## Success looks like

- False positive rate drops 15% relative within 90 days of launch
- Alert opt-out rate decreases measurably within 60 days
- Fraud miss rate remains flat (within 2% of pre-launch baseline)
- Feedback engagement rate above 20% for users who receive the prompt

---

## Users

**Primary:** Any authenticated user who has received a fraud alert on a flagged or declined transaction within the past 48 hours.

**Excluded from v1:** Users with any confirmed fraud event on their account in the past 6 months. These users are at elevated risk during the feedback window; their feedback signals carry higher noise. Expand to full population after v1 validation.

---

## Feature Description

### Entry points

**1. Push notification (primary)**
When a fraud alert push notification is sent, the notification payload includes two action buttons below the alert body:
- `[This Was Me]`
- `[This Was Not Me]`

Both buttons are actionable directly from the notification shade without requiring the user to open the app. Tapping either button:
1. Logs the feedback signal
2. Shows a single confirmation toast ("Got it — thanks for letting us know")
3. Does not open the app unless the user taps the notification body itself

**2. In-app transaction detail card (secondary)**
On the transaction detail view for any flagged transaction, a feedback prompt is shown for 48 hours after the alert was sent:
- Prompt text: "Was this transaction made by you?"
- Response options: "Yes, this was me" / "No, this wasn't me"
- After 48 hours: prompt disappears, replaced by standard transaction detail

### Feedback signal logged

For each feedback event, the following is written to the training data store:

```
user_id          (hashed)
transaction_id
merchant_id
merchant_category
transaction_amount
transaction_timestamp
device_id        (hashed)
alert_type
feedback_response   [THIS_WAS_ME | THIS_WAS_NOT_ME]
feedback_timestamp
feedback_source     [PUSH_NOTIFICATION | IN_APP]
```

---

## Guardrails

These ship before the feedback UI. No exceptions.

### 1. Feedback weight cap
User feedback contributes a maximum of **15% to the overall fraud risk score** for any individual transaction. It cannot override the model's primary signal.

Implementation: the fraud scoring function accepts a `user_feedback_adjustment` parameter bounded to [-0.15, +0.15] applied to the base fraud probability score. Changes to this cap require a separate product and engineering review.

### 2. High-confidence lock
For any transaction with a base fraud probability score **above 0.85**, user feedback is:
- Accepted as a data point for future model training
- **Not applied** to the current transaction's risk score
- Not used to reduce the transaction below the mandatory review threshold

This ensures that an attacker who completes a high-confidence fraud event and marks it "This Was Me" still receives manual review.

### 3. Tiered UX friction by transaction value
| Transaction value | Feedback UX |
|---|---|
| Below ₹5,000 | Single tap — confirmation toast |
| ₹5,000–₹25,000 | Single tap + one-sentence confirmation screen |
| Above ₹25,000 | Two-step confirmation — tap button + confirm on a separate screen |

Higher-value transactions carry higher risk if a user inadvertently misclassifies. Friction is proportional.

### 4. Abuse detection
A separate monitoring job runs daily and flags accounts exhibiting unusual feedback patterns:
- More than 3 "This Was Me" taps in a 24-hour window on transactions above ₹10,000
- Feedback patterns that match known fraud ring signatures
- Accounts where "This Was Me" feedback is followed by confirmed fraud within 30 days

Flagged accounts are queued for manual review. The feedback weight for flagged accounts is automatically reduced to 0% pending review outcome.

---

## Out of Scope (v1)

- User-visible explanation of how feedback affects their alerts
- Real-time fraud score updates visible to the user
- Automatic reversal or dispute flow triggered by "This Was Not Me" — this should route to the existing dispute process
- Changes to the fraud model architecture itself
- Feedback on transactions older than 48 hours
- Feedback on transactions in the control group during the A/B test

---

## Dependencies

| Dependency | Owner | Required before? |
|---|---|---|
| Feedback weight cap implementation in fraud scoring service | ML Platform | Yes — before UI ships |
| High-confidence lock logic | ML Platform | Yes — before UI ships |
| Feedback signal logging to training data store | Data Engineering | Yes — before UI ships |
| Abuse detection monitoring job | Risk Engineering | Yes — before UI ships |
| Push notification action button support | Mobile Engineering | Yes — before UI ships |
| In-app transaction detail card feedback prompt | Mobile Engineering | Same sprint as UI |
| Training pipeline integration for feedback signals | ML Platform | Can ship 1 sprint after UI |

---

## What This Is Not

This feature does not:
- Give users control over their fraud model
- Allow users to whitelist merchants
- Guarantee that "This Was Me" will stop future alerts at the same merchant (the model adjusts probabilistically; it does not create hard rules)
- Replace the existing dispute process

These limitations should be reflected in the UX copy if users ask follow-up questions about why alerts continue.

---

## Open Questions

1. **How many "This Was Me" confirmations at the same merchant before the model meaningfully suppresses future alerts?** Needs input from ML Platform on model training frequency and minimum signal threshold.

2. **Should "This Was Not Me" trigger any immediate action on the current transaction?** (e.g. temporary hold, accelerated review). This was excluded from v1 scope but is worth a follow-up discussion with Risk.

3. **What is the right feedback window?** 48 hours is assumed here. Users who check their banking app infrequently may miss the window. 72 hours is worth evaluating.

4. **How do we communicate the feature to users without explaining the model internals?** The onboarding copy needs to be specific enough to be useful ("Help us learn your spending patterns") without being misleading about how quickly the model will adapt.

---

*Part of the [SaumyaDigsIn](https://www.linkedin.com/in/saumya-singh-0604/) series.*
