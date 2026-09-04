// Source: a.lzyumi.top inline ELO reference table, captured 2026-09-03,
// index.html lines 5242–5250. Thresholds below follow the table, not the
// chart formatter's inconsistent boundary comparisons. This is not Riot MMR.
export const ELO_TIERS = [
  '黑铁',
  '青铜',
  '白银',
  '黄金',
  '铂金',
  '翡翠',
  '钻石',
];
export const ELO_DIVISIONS = ['Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'];
export function eloRank(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return null;
  if (value >= 2800) return '大师及以上';
  const tier = Math.floor(value / 400);
  const division = Math.floor((value % 400) / 100);
  return ELO_TIERS[tier] + ELO_DIVISIONS[division];
}
