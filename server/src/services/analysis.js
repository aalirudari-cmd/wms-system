// Pure functions that turn a trade's raw data into scores and an AI-style
// review. Kept dependency-free and deterministic so the same trade always
// yields the same analysis and it can be unit-tested in isolation.

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n) => (n == null ? null : Math.round(n * 10) / 10);

// Weighted percentage of checklist items that were ticked.
export function checklistPercent(items) {
  const totalWeight = items.reduce((s, i) => s + (Number(i.weight) || 1), 0);
  if (totalWeight === 0) return 0;
  const got = items.reduce((s, i) => s + (i.checked ? Number(i.weight) || 1 : 0), 0);
  return round((got / totalWeight) * 100);
}

// Planned reward-to-risk from entry/stop/target. Direction-aware.
export function plannedRR(t) {
  const { entry_price: e, stop_loss: sl, take_profit: tp } = t;
  if (e == null || sl == null || tp == null) return null;
  const risk = Math.abs(Number(e) - Number(sl));
  const reward = Math.abs(Number(tp) - Number(e));
  if (risk === 0) return null;
  return round(reward / risk);
}

// Discipline reflects how well the trader followed their own checklist and
// whether the trade read as planned vs impulsive (from the journal text).
function disciplineScore(checklistPct, t) {
  let score = checklistPct;
  const text = `${t.emotions_before || ''} ${t.emotions_during || ''}`.toLowerCase();
  const impulsiveWords = ['fomo', 'revenge', 'impulse', 'impulsive', 'bored', 'overtrad', 'forced'];
  if (impulsiveWords.some((w) => text.includes(w))) score -= 20;
  return round(clamp(score));
}

// Execution rewards a healthy planned RR and penalises missing stops/targets.
function executionScore(t, rr) {
  let score = 60;
  if (rr == null) {
    if (t.stop_loss == null) score -= 25;
    if (t.take_profit == null) score -= 15;
  } else {
    if (rr >= 3) score += 35;
    else if (rr >= 2) score += 25;
    else if (rr >= 1.5) score += 12;
    else if (rr < 1) score -= 20;
  }
  if (t.stop_loss == null) score -= 20; // no stop is the cardinal sin
  return round(clamp(score));
}

// Risk management centres on position risk staying within a sane band.
function riskScore(t) {
  const r = Number(t.risk_pct);
  if (!Number.isFinite(r) || r <= 0) {
    return t.stop_loss == null ? 20 : 50;
  }
  let score = 100;
  if (r > 1 && r <= 2) score = 85;
  else if (r > 2 && r <= 3) score = 60;
  else if (r > 3 && r <= 5) score = 35;
  else if (r > 5) score = 10;
  if (t.stop_loss == null) score = Math.min(score, 25);
  return round(score);
}

export function scoreTrade({ checklistPct, trade }) {
  const rr = plannedRR(trade);
  const discipline = disciplineScore(checklistPct, trade);
  const execution = executionScore(trade, rr);
  const risk = riskScore(trade);
  const overall = round((discipline * 0.4 + execution * 0.3 + risk * 0.3));
  return {
    planned_rr: rr,
    discipline_score: discipline,
    execution_score: execution,
    risk_score: risk,
    overall_score: overall,
  };
}

// A rule-based "AI" review. Deterministic, explainable feedback synthesised
// from the checklist, scores and journal. (Swap in an LLM call here later by
// feeding the same `trade`/`items` payload to the model.)
export function buildReview({ trade, items, scores }) {
  const good = [];
  const mistakes = [];
  const suggestions = [];

  const missedRequired = items.filter((i) => i.required && !i.checked);
  if (missedRequired.length) {
    mistakes.push(
      `Opened with ${missedRequired.length} required checkpoint(s) unmet: ` +
        missedRequired.map((i) => `"${i.text}"`).join(', ') + '.'
    );
  } else if (items.length) {
    good.push('All required checkpoints were satisfied before entry.');
  }

  if (trade.checklist_pct >= 80) good.push(`Strong checklist adherence (${trade.checklist_pct}%).`);
  else if (trade.checklist_pct < 50)
    mistakes.push(`Low checklist adherence (${trade.checklist_pct}%) suggests a rushed entry.`);

  if (scores.planned_rr != null) {
    if (scores.planned_rr >= 2) good.push(`Healthy planned reward-to-risk of ${scores.planned_rr}:1.`);
    else mistakes.push(`Planned reward-to-risk of ${scores.planned_rr}:1 is thin — aim for 2:1 or better.`);
  } else if (trade.take_profit == null) {
    suggestions.push('Define a take-profit target so reward-to-risk can be evaluated up front.');
  }

  if (trade.stop_loss == null) mistakes.push('No stop loss was recorded — uncapped risk.');
  const r = Number(trade.risk_pct);
  if (Number.isFinite(r) && r > 3) mistakes.push(`Position risk of ${r}% per trade is aggressive; keep it ≤ 2%.`);

  const emo = `${trade.emotions_before || ''} ${trade.emotions_during || ''}`.toLowerCase();
  const impulsive = ['fomo', 'revenge', 'impulse', 'impulsive', 'bored', 'forced'].some((w) => emo.includes(w));
  const planAligned = !impulsive && missedRequired.length === 0 && trade.checklist_pct >= 70;

  if (trade.what_went_wrong) suggestions.push(`Address the noted weakness: ${trade.what_went_wrong}`);
  if (trade.improvements) suggestions.push(`Carry forward your own plan: ${trade.improvements}`);
  if (!suggestions.length) suggestions.push('Keep documenting emotions and screenshots for every trade to sharpen the dataset.');

  let verdict;
  if (planAligned) verdict = 'This trade looks planned and rule-based — repeat this process.';
  else if (impulsive) verdict = 'Signs of an impulsive trade. Slow down and re-run your checklist next time.';
  else verdict = 'Partly aligned with the plan. Tighten checklist discipline before the next entry.';

  return {
    planned: planAligned,
    verdict,
    good,
    mistakes,
    suggestions,
    generated_at: new Date().toISOString(),
  };
}
