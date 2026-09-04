import type { Match } from './model';
export const METRICS = [
  {
    key: 'dpm',
    label: '每分钟伤害',
    unit: '',
    formula: '有效场次总伤害 ÷ 总分钟数',
    digits: 0,
  },
  {
    key: 'gpm',
    label: '每分钟经济',
    unit: '',
    formula: '有效场次总金币 ÷ 总分钟数',
    digits: 0,
  },
  {
    key: 'participation',
    label: '参团率',
    unit: '%',
    formula: '数据源单场参团率的平均值',
    digits: 1,
  },
  {
    key: 'deaths10',
    label: '每 10 分钟死亡',
    unit: '次',
    formula: '有效场次总死亡 ÷ 总分钟数 × 10',
    digits: 1,
  },
  {
    key: 'winrate',
    label: '胜率',
    unit: '%',
    formula: '胜场 ÷ 已判定胜负的场次',
    digits: 0,
  },
  {
    key: 'score',
    label: '对局评分',
    unit: '分',
    formula: '数据源单场评分的平均值',
    digits: 1,
  },
] as const;
export type MetricKey = (typeof METRICS)[number]['key'];
export type Measure = { value: number | null; count: number };
const valid = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function performance(rows: Match[]): Record<MetricKey, Measure> {
  const rate = (key: 'damage' | 'gold' | 'deaths', scale: number): Measure => {
    const usable = rows.filter(
      (r) => valid(r[key]) && valid(r.duration) && r.duration > 0,
    );
    return {
      count: usable.length,
      value: usable.length
        ? (usable.reduce((n, r) => n + r[key]!, 0) /
            usable.reduce((n, r) => n + r.duration!, 0)) *
          scale
        : null,
    };
  };
  const avg = (key: 'score' | 'participation'): Measure => {
    const values = rows
      .map((r) => r[key])
      .filter(
        (v) => valid(v) && (key !== 'participation' || v <= 100),
      ) as number[];
    return {
      count: values.length,
      value: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
    };
  };
  const decided = rows.filter((r) => typeof r.win === 'boolean');
  return {
    dpm: rate('damage', 60),
    gpm: rate('gold', 60),
    deaths10: rate('deaths', 600),
    participation: avg('participation'),
    score: avg('score'),
    winrate: {
      count: decided.length,
      value: decided.length
        ? (decided.filter((r) => r.win).length / decided.length) * 100
        : null,
    },
  };
}
export function comparePerformance(rows: Match[]) {
  const latest = rows.slice(0, 5),
    previous = rows.slice(5, 10);
  const ten = rows.slice(0, 10);
  const sameMode =
    ten.length === 10 &&
    new Set(ten.map((r) => r.queue + '/' + r.mode)).size === 1;
  const pending = ten.some((r) => r.detailState === 'pending');
  const recent = performance(latest),
    prior = performance(previous);
  return {
    latest,
    previous,
    pending,
    sameMode,
    metrics: METRICS.map((m) => {
      const a = recent[m.key],
        b = prior[m.key];
      const comparable = sameMode && !pending && a.count === 5 && b.count === 5;
      return {
        ...m,
        recent: a,
        prior: b,
        delta: comparable ? a.value! - b.value! : null,
      };
    }),
  };
}
