import type { Match } from './model';
export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const numeric = (value: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export function analyze(rows: Match[]) {
  const wins = rows.filter((r) => r.win === true).length,
    losses = rows.filter((r) => r.win === false).length;
  const completeKda = rows.filter(
    (r) => numeric(r.kills) && numeric(r.deaths) && numeric(r.assists),
  );
  const sum = (key: 'kills' | 'deaths' | 'assists') =>
    completeKda.reduce((n, r) => n + (r[key] ?? 0), 0);
  const kills = sum('kills'),
    deaths = sum('deaths'),
    assists = sum('assists');
  const elos = rows.map((r) => r.teamElo).filter(numeric);
  const comparable = (rs: Match[]) =>
    rs.length > 0 &&
    rs.every((r) => numeric(r.teamElo)) &&
    new Set(rs.map((r) => r.queue + '/' + r.mode)).size === 1;
  const allComparable = comparable(rows);
  const windowMean = (n: number) =>
    rows.length >= n && comparable(rows.slice(0, n))
      ? mean(rows.slice(0, n).map((r) => r.teamElo as number))
      : null;
  const windows = Object.fromEntries(
    [5, 10, 20, 30].map((n) => [n, windowMean(n)]),
  );
  const latest10 = rows.slice(0, 10);
  const delta =
    latest10.length === 10 && comparable(latest10)
      ? mean(latest10.slice(0, 5).map((r) => r.teamElo as number))! -
        mean(latest10.slice(5).map((r) => r.teamElo as number))!
      : null;
  let ema: number | null = null;
  const series = [...rows].reverse().map((r, i) => {
    if (allComparable)
      ema =
        ema === null
          ? r.teamElo
          : (2 / 11) * (r.teamElo as number) + (9 / 11) * ema;
    return { ...r, index: i + 1, ema: allComparable ? ema : null };
  });
  const heroes = Object.values(
    rows.reduce(
      (
        acc: Record<
          string,
          {
            id: string;
            name: string;
            count: number;
            wins: number;
            losses: number;
            score: number[];
          }
        >,
        r,
      ) => {
        const h = (acc[r.championId] ??= {
          id: r.championId,
          name: r.champion,
          count: 0,
          wins: 0,
          losses: 0,
          score: [],
        });
        h.count++;
        if (r.win === true) h.wins++;
        if (r.win === false) h.losses++;
        if (numeric(r.score)) h.score.push(r.score);
        return acc;
      },
      {},
    ),
  )
    .sort(
      (a, b) =>
        b.count - a.count || (mean(b.score) ?? 0) - (mean(a.score) ?? 0),
    )
    .slice(0, 4);
  return {
    wins,
    losses,
    unknown: rows.length - wins - losses,
    winrate: wins + losses ? (wins / (wins + losses)) * 100 : null,
    kda: completeKda.length ? (kills + assists) / Math.max(deaths, 1) : null,
    kills: mean(completeKda.map((r) => r.kills!)),
    deaths: mean(completeKda.map((r) => r.deaths!)),
    assists: mean(completeKda.map((r) => r.assists!)),
    kdaCount: completeKda.length,
    score: mean(rows.map((r) => r.score).filter(numeric)),
    scoreCount: rows.filter((r) => numeric(r.score)).length,
    elo: allComparable ? mean(elos) : null,
    eloCount: elos.length,
    max: allComparable ? Math.max(...elos) : null,
    min: allComparable ? Math.min(...elos) : null,
    ema,
    allComparable,
    windows,
    delta,
    series,
    heroes,
  };
}
