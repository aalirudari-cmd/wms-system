// Shared formatting + trading math helpers used across pages.

export const fmtMoney = (n) =>
  n == null ? '—' : `${n < 0 ? '-' : ''}$${Math.abs(Number(n)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(1)}%`);
export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');

export const scoreColor = (n) => {
  if (n == null) return 'var(--text-faint)';
  if (n >= 75) return 'var(--green)';
  if (n >= 50) return 'var(--amber)';
  return 'var(--red)';
};

// Position sizing: how much capital is at risk and (roughly) the lot size for a
// given stop distance. unitsPerLot defaults to a 100k FX lot.
export function riskCalc({ balance, riskPct, entry, stop, pipValue = 10, unitsPerLot = 100000 }) {
  const riskAmount = (Number(balance) * Number(riskPct)) / 100;
  const stopDistance = Math.abs(Number(entry) - Number(stop));
  const out = { riskAmount: round(riskAmount), stopDistance: round(stopDistance, 5) };
  if (stopDistance > 0 && pipValue > 0) {
    // Generic: lots = riskAmount / (stopDistance * valuePerUnitMove)
    out.suggestedLots = round(riskAmount / (stopDistance * pipValue * unitsPerLot / unitsPerLot), 2);
  }
  return out;
}

// Reward-to-risk from entry/stop/target.
export function rrCalc({ entry, stop, target }) {
  const risk = Math.abs(Number(entry) - Number(stop));
  const reward = Math.abs(Number(target) - Number(entry));
  if (!risk) return { rr: null, risk: round(risk, 5), reward: round(reward, 5) };
  return { rr: round(reward / risk, 2), risk: round(risk, 5), reward: round(reward, 5) };
}

function round(n, d = 2) {
  if (!Number.isFinite(Number(n))) return null;
  const f = 10 ** d;
  return Math.round(Number(n) * f) / f;
}
