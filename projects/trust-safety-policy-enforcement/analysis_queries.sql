-- =====================================================================
-- Trust & Safety — Policy Enforcement Analytics
-- SQL Analysis Pack (personal project)
--
-- Schema: a daily enforcement log keyed by region x policy category x
-- device x channel age x detection source. This mirrors the shape of a
-- real T&S enforcement data mart (illustrative / synthetic data).
--
-- Sections:
--   1. Schema
--   2. Top-line weekly metrics framework
--   3. Anomaly detection (week-over-week breach scan)
--   4. RCA drill-down (disentangling confounding variables)
--   5. Precision check (genuine violation vs. classifier false-positive)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SCHEMA
-- ---------------------------------------------------------------------
CREATE TABLE enforcement_log (
    date                        DATE        NOT NULL,
    region                      TEXT        NOT NULL,
    policy_category             TEXT        NOT NULL,
    device                      TEXT        NOT NULL,
    channel_age_bucket          TEXT        NOT NULL,
    detection_source            TEXT        NOT NULL,
    flagged_count               INTEGER     NOT NULL,
    removed_count                INTEGER     NOT NULL,
    appealed_count               INTEGER     NOT NULL,
    overturned_count              INTEGER     NOT NULL,
    avg_time_to_action_hours     REAL        NOT NULL
);


-- ---------------------------------------------------------------------
-- 2. TOP-LINE WEEKLY METRICS FRAMEWORK
--    Five tracked KPIs: enforcement volume, proactive detection rate,
--    appeal overturn rate (a precision proxy), and time-to-action.
-- ---------------------------------------------------------------------
WITH base AS (
    SELECT
        date,
        strftime('%Y-%W', date) AS iso_week,
        region, policy_category, device, channel_age_bucket, detection_source,
        flagged_count, removed_count, appealed_count, overturned_count,
        avg_time_to_action_hours
    FROM enforcement_log
)
SELECT
    iso_week,
    MIN(date) AS week_start,
    SUM(flagged_count)  AS flagged,
    SUM(removed_count)  AS removed,
    SUM(appealed_count) AS appealed,
    SUM(overturned_count) AS overturned,
    -- Proactive Detection Rate: share of removals NOT sourced from user reports
    ROUND(100.0 * SUM(CASE WHEN detection_source != 'User Report' THEN removed_count ELSE 0 END)
          / NULLIF(SUM(removed_count), 0), 2) AS proactive_detection_rate_pct,
    -- Appeal Overturn Rate: a precision proxy. Sustained increases can
    -- indicate the classifier or policy is over-enforcing (false positives).
    ROUND(100.0 * SUM(overturned_count) / NULLIF(SUM(appealed_count), 0), 2) AS overturn_rate_pct,
    ROUND(AVG(avg_time_to_action_hours), 2) AS median_tta_hours_proxy
FROM base
GROUP BY iso_week
ORDER BY week_start;


-- ---------------------------------------------------------------------
-- 3. ANOMALY DETECTION
--    Flags any region x policy_category cell whose weekly removed-volume
--    grew more than +75% week-over-week. A minimum volume threshold
--    (enforced via the +75% on real upstream counts) keeps small-region
--    noise from triggering false alarms.
-- ---------------------------------------------------------------------
WITH weekly AS (
    SELECT strftime('%Y-%W', date) AS iso_week, MIN(date) AS week_start,
           region, policy_category, SUM(removed_count) AS removed
    FROM enforcement_log
    GROUP BY iso_week, region, policy_category
),
ranked AS (
    SELECT *,
           LAG(removed) OVER (PARTITION BY region, policy_category ORDER BY week_start) AS prev_week_removed
    FROM weekly
)
SELECT week_start, region, policy_category, removed, prev_week_removed,
       ROUND(100.0 * (removed - prev_week_removed) / NULLIF(prev_week_removed, 0), 1) AS wow_pct_change
FROM ranked
WHERE prev_week_removed IS NOT NULL
  AND (removed - prev_week_removed) * 1.0 / NULLIF(prev_week_removed, 0) > 0.75
ORDER BY wow_pct_change DESC;


-- ---------------------------------------------------------------------
-- 4. RCA DRILL-DOWN
--    For the flagged cell (India / Misinformation / anomaly week),
--    disentangle device x channel age x detection source to find which
--    cohort is actually driving the spike.
-- ---------------------------------------------------------------------
SELECT device, channel_age_bucket, detection_source,
       SUM(removed_count) AS removed,
       ROUND(100.0 * SUM(removed_count) / SUM(SUM(removed_count)) OVER (), 1) AS pct_of_total
FROM enforcement_log
WHERE region = 'India' AND policy_category = 'Misinformation'
  AND date BETWEEN '2026-04-20' AND '2026-04-26'
GROUP BY device, channel_age_bucket, detection_source
ORDER BY removed DESC
LIMIT 8;


-- ---------------------------------------------------------------------
-- 5. PRECISION CHECK
--    Is the spike false positives (a classifier/policy precision bug)
--    or genuine violative content (a real coordinated attack)?
--    A LOW overturn rate during the spike vs. baseline indicates the
--    removals were correct — i.e. a real attack, not over-enforcement.
-- ---------------------------------------------------------------------
SELECT
  CASE WHEN date BETWEEN '2026-04-20' AND '2026-04-26' THEN 'Anomaly week'
       ELSE 'Baseline (all other weeks)' END AS period,
  SUM(removed_count) AS removed,
  SUM(appealed_count) AS appealed,
  SUM(overturned_count) AS overturned,
  ROUND(100.0 * SUM(overturned_count) / NULLIF(SUM(appealed_count), 0), 2) AS overturn_rate_pct
FROM enforcement_log
WHERE region = 'India' AND policy_category = 'Misinformation'
GROUP BY period;
