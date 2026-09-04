import { md5 } from 'js-md5';
import champions from './champions.json';
import {
  AREAS,
  MODES,
  isMayhemMatch,
  type Query,
  type Match,
  type Snapshot,
} from './model';
import { TtlCache, queryKey } from './cache';
import type { QueryEvent } from './query-stream';
const queryCache = new TtlCache<Snapshot>(80, 60_000);
const detailCache = new TtlCache<Match>(500, 6 * 3600_000);
const BASE = 'https://a.lzyumi.top/lzyumi/lol/info';
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj) : []);
const plain = (v: unknown) =>
  typeof v === 'string'
    ? v.replace(/<[^>]*>/g, ' ').slice(0, 150)
    : typeof v === 'number'
      ? String(v)
      : '';
const num = (v: unknown): number | null =>
  (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) &&
  Number.isFinite(Number(v))
    ? Number(v)
    : null;
const elo = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};
const queueName = (m: Raw) =>
  plain(m.title)
    .split(/[（(-]/)[0]
    .trim() || '未知模式';
export function signature(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 3600_000),
    parts = [
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
    ].map(String);
  const [m, day, h, min, s] = parts.map((v) => v.padStart(2, '0'));
  return {
    lzyumiSign: md5('dld' + m + 'o' + day + 'u' + h + 'd' + min + 'o' + s + 'dld'),
    signStr: parts.join('') + parts.map((v) => v.length * 3).join(''),
  };
}
export function normalizeMatch(
  m: Raw,
  detail: Raw,
  openId: string,
  name: string,
): Match {
  const d = obj(detail.data),
    ps = arr(d.wgBattleDetailInfo);
  let found = ps.filter((p) => p.openIdNow === openId);
  if (!found.length) found = ps.filter((p) => p.nickNameStr === name);
  const p = found.length === 1 ? found[0] : {},
    ts = arr(d.teamDetails);
  const teams =
    p.teamId !== undefined
      ? ts.filter((t) => plain(t.teamId) === plain(p.teamId))
      : [];
  const other =
    p.teamId !== undefined
      ? ts.filter((t) => plain(t.teamId) !== plain(p.teamId))
      : [];
  const kda = /^(\d+)\/(\d+)\/(\d+)$/.exec(plain(p.scoreInfo));
  const duration = /用时(\d+)分(\d+)秒/.exec(plain(m.title));
  const date =
    /\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.exec(plain(m.titleTime))?.[0] ??
    '日期未提供';
  const id = plain(m.championId),
    e = obj(p.echartsMap);
  return {
    id: plain(m.gameId),
    date,
    win: m.isWin === 1 ? true : m.isWin === 2 ? false : null,
    mode: plain(d.gameMode) || '未知',
    queue: isMayhemMatch({ queue: queueName(m), mode: plain(d.gameMode) })
      ? '海克斯大乱斗'
      : queueName(m),
    championId: id,
    champion: (champions as Record<string, string>)[id] ?? '未知英雄',
    kills: kda ? +kda[1] : null,
    deaths: kda ? +kda[2] : null,
    assists: kda ? +kda[3] : null,
    score: num(p.scoreInfoNum),
    duration: duration ? +duration[1] * 60 + +duration[2] : null,
    teamElo: teams.length === 1 ? elo(teams[0].teamElo) : null,
    opponentElo: other.length === 1 ? elo(other[0].teamElo) : null,
    gold: num(e.goldEarned),
    damage: num(e.totalDamageDealt),
    participation:
      num(e.killAssisScore) !== null &&
      num(e.killAssisScore)! >= 0 &&
      num(e.killAssisScore)! <= 100
        ? num(e.killAssisScore)
        : null,
    position: plain(p.position),
    mvp:
      m.wasMvp === 1 ||
      m.wasMvp === '1' ||
      m.wasMvp === true ||
      p.wasMvp === '1',
    svp:
      m.wasSvp === 1 ||
      m.wasSvp === '1' ||
      m.wasSvp === true ||
      p.wasSvp === '1',
    ...(!kda ? { note: '未取得完整详情，缺失指标不参与统计。' } : {}),
  };
}
export async function queryUpstream(
  q: Query,
  signal: AbortSignal,
  emit?: (event: QueryEvent) => void,
): Promise<Snapshot> {
  signal.throwIfAborted();
  const key = queryKey(q);
  if (q.refresh) queryCache.delete(key);
  const cached = !q.refresh && queryCache.get(key);
  if (cached) {
    const result = {
      ...cached,
      loading: false,
      cache: { ...cached.cache!, queryHit: true },
    };
    emit?.({ type: 'complete', data: result });
    return result;
  }
  const areaId = AREAS[q.area],
    warnings: string[] = [];
  async function get(
    path: string,
    params: Record<string, string | number>,
  ): Promise<Raw> {
    const url = new URL(BASE + path);
    Object.entries({ ...params, ...signature() }).forEach(([k, v]) =>
      url.searchParams.set(k, String(v)),
    );
    const response = await fetch(url, {
      headers: { Accept: 'application/json, text/plain, */*' },
      redirect: 'manual',
      mode: 'cors',
      credentials: 'omit',
      signal: AbortSignal.any([signal, AbortSignal.timeout(18000)]),
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403)
      throw new Error('数据源要求登录或验证；请在原站正常完成后再查询。');
    if (!response.ok)
      throw new Error('数据源暂时不可用（HTTP ' + response.status + '）。');
    let json: Raw;
    try {
      json = obj(await response.json());
    } catch {
      throw new Error('数据源未返回有效战绩，请稍后重试。');
    }
    if (json.code !== 1)
      throw new Error('数据源未能完成查询，请检查 Riot ID、大区或稍后重试。');
    return json;
  }
  // No dedicated mayhem filter is exposed by the source. Search only the
  // latest 30 all-mode rows, then select the observed 海斗 queue before details.
  const sourceCount = q.mode === 'mayhem' ? 30 : q.count;
  const raw = await get('', {
    nickname: q.player.replace('#', '*~*~*'),
    allCount: sourceCount,
    areaId,
    areaName: q.area,
    seleMe: 1,
    filter: MODES[q.mode].id,
    openId: '',
  });
  const b = obj(raw.battleInfo);
  if (b.nameInfoNew !== q.player || plain(b.areaId) !== String(areaId))
    throw new Error('数据源未返回匹配的玩家，请检查 Riot ID 与大区。');
  if (
    !Array.isArray(raw.data) ||
    raw.data.some(
      (m: unknown) =>
        typeof obj(m).gameId !== 'string' || !plain(obj(m).gameId),
    )
  )
    throw new Error('数据源返回异常占位内容，当前模式暂时无法查询。');
  if (typeof b.openId !== 'string' || !b.openId)
    throw new Error('数据源缺少玩家标识，请稍后重试。');
  const openId = b.openId;
  const sourceMatches = arr(raw.data).slice(0, sourceCount);
  const matches = (
    q.mode === 'mayhem'
      ? sourceMatches.filter((m) => isMayhemMatch({ queue: queueName(m) }))
      : sourceMatches
  ).slice(0, q.count);
  if (q.mode === 'mayhem')
    warnings.push(
      '查询范围为最近 ' +
        sourceMatches.length +
        ' 场全部对局，其中展示 ' +
        matches.length +
        ' 场海克斯大乱斗；不包含更早的对局。',
    );
  else if (matches.length < q.count)
    warnings.push(
      '请求 ' + q.count + ' 场，数据源实际返回 ' + matches.length + ' 场。',
    );
  const elos: Record<string, number> = {};
  const rows: Match[] = matches.map((m) => ({
    ...normalizeMatch(m, {}, openId, q.player),
    detailState: 'pending',
    note: '正在加载此场详情…',
  }));
  const rankRow = arr(b.mapOneInfoList).find((r) =>
    plain(r.type).includes(q.mode === 'flex' ? '灵活' : '单双'),
  );
  const initial: Snapshot = {
    player: q.player,
    area: q.area,
    areaId,
    mode: q.mode,
    requested: q.count,
    scanned: sourceMatches.length,
    fetchedAt: new Date().toISOString(),
    isSample: false,
    level: num(b.level),
    rank: plain(rankRow?.tier) || '未定级',
    lp: num(rankRow?.winPoint),
    elos: {},
    rows: rows.slice(),
    warnings: warnings.slice(),
    loading: true,
    loaded: 0,
    cache: { queryHit: false, detailHits: 0 },
  };
  emit?.({ type: 'snapshot', data: initial });
  let next = 0,
    failed = 0,
    loaded = 0,
    detailHits = 0,
    summaryFailed = false;
  async function loadSummary() {
    try {
      const summary = obj(
        (
          await get('/getRankEloInfo', {
            openId,
            areaId,
            filter: MODES[q.mode].id,
          })
        ).data,
      );
      for (const field of [
        'dataRankEloNum',
        'dataRankEloInfoA',
        'dataRankEloInfoB',
        'dataRankEloInfoPp',
      ]) {
        const match = /([^：:<>]+)[：:]\s*(\d+(?:\.\d+)?)/.exec(
          plain(summary[field]),
        );
        if (match) elos[plain(match[1]).trim()] = Number(match[2]);
      }
      emit?.({ type: 'summary', elos: { ...elos } });
    } catch (error) {
      if (signal.aborted) throw error;
      summaryFailed = true;
      warnings.push('ELO 摘要暂不可用。');
    }
  }
  async function worker() {
    while (next < matches.length) {
      signal.throwIfAborted();
      const i = next++,
        m = matches[i],
        gameId = plain(m.gameId);
      const detailKey = JSON.stringify([areaId, openId, gameId]);
      if (q.refresh) detailCache.delete(detailKey);
      const cachedDetail = !q.refresh && detailCache.get(detailKey);
      if (cachedDetail) {
        rows[i] = cachedDetail;
        detailHits++;
      } else if (gameId.includes('0123456789')) {
        rows[i] = {
          ...rows[i],
          detailState: 'unavailable',
          note: '此场详情需要数据源的正常登录态，暂未取得。',
        };
        failed++;
      } else {
        try {
          const row = normalizeMatch(
            m,
            await get('/findOrderDetailInfoAll', { openId, gameId, areaId }),
            openId,
            q.player,
          );
          rows[i] = {
            ...row,
            detailState: row.note ? 'unavailable' : 'ready',
            detailsFetchedAt: new Date().toISOString(),
          };
          if (row.note) failed++;
          else detailCache.set(detailKey, rows[i]);
        } catch (error) {
          if (signal.aborted) throw error;
          rows[i] = {
            ...rows[i],
            detailState: 'unavailable',
            note: '此场详情暂未取得，请稍后更新数据。',
          };
          failed++;
        }
      }
      loaded++;
      emit?.({ type: 'match', index: i, row: rows[i], loaded, detailHits });
    }
  }
  await Promise.all([loadSummary(), worker(), worker()]);
  if (failed) warnings.push(failed + ' 场详情暂不可用，缺失指标显示为 —。');
  if (
    q.mode === 'mayhem' &&
    rows.length &&
    rows.every((r) => r.teamElo === null)
  )
    warnings.push(
      '这些海克斯对局未提供 Team ELO，仍可分析胜率、KDA、评分和每分钟表现。普通大乱斗 ELO 不作为海克斯 ELO。',
    );
  const result: Snapshot = {
    ...initial,
    rows,
    elos,
    warnings,
    loading: false,
    loaded,
    cache: { queryHit: false, detailHits, reusable: !failed && !summaryFailed },
  };
  if (!failed && !summaryFailed)
    queryCache.set(
      key,
      result,
      Math.max(0, 60_000 - (Date.now() - Date.parse(result.fetchedAt))),
    );
  emit?.({ type: 'complete', data: result });
  return result;
}
