export const AREAS: Record<string, number> = {
  艾欧尼亚: 1,
  比尔吉沃特: 2,
  祖安: 3,
  诺克萨斯: 4,
  班德尔城: 5,
  德玛西亚: 6,
  皮尔特沃夫: 7,
  战争学院: 8,
  弗雷尔卓德: 9,
  巨神峰: 10,
  雷瑟守备: 11,
  无畏先锋: 12,
  裁决之地: 13,
  黑色玫瑰: 14,
  暗影岛: 15,
  恕瑞玛: 16,
  钢铁烈阳: 17,
  水晶之痕: 18,
  均衡教派: 19,
  扭曲丛林: 20,
  教育网专区: 21,
  影流: 22,
  守望之海: 23,
  征服之海: 24,
  卡拉曼达: 25,
  巨龙之巢: 26,
  皮城警备: 27,
  男爵领域: 30,
  峡谷之巅: 31,
};
export const MODES = {
  mayhem: { id: 1, label: "海克斯大乱斗" },
  ranked: { id: 2, label: "单双排位" },
  flex: { id: 3, label: "灵活排位" },
  normal: { id: 4, label: "匹配对局" },
  aram: { id: 5, label: "极地大乱斗" },
  all: { id: 1, label: "全部模式" },
};
export type Mode = keyof typeof MODES;
export type Query = {
  player: string;
  area: string;
  mode: Mode;
  count: number;
  refresh?: boolean;
};
export type Teammate = {
  id: string;
  name: string;
  championId: string;
};
export type Match = {
  id: string;
  date: string;
  win: boolean | null;
  mode: string;
  queue: string;
  championId: string;
  champion: string;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  score: number | null;
  duration: number | null;
  teamElo: number | null;
  opponentElo: number | null;
  gold: number | null;
  damage: number | null;
  participation?: number | null;
  detailState?: "pending" | "ready" | "unavailable";
  detailsFetchedAt?: string;
  teammates?: Teammate[];
  teammatesFetchedAt?: string;
  position: string;
  mvp: boolean;
  svp: boolean;
  note?: string;
};
export type Snapshot = {
  player: string;
  area: string;
  areaId: number;
  level: number | null;
  rank: string;
  lp: number | null;
  mode: Mode;
  requested: number;
  scanned?: number;
  fetchedAt: string;
  isSample: boolean;
  elos: Record<string, number>;
  rows: Match[];
  warnings: string[];
  loading?: boolean;
  loaded?: number;
  cache?: { queryHit: boolean; detailHits: number; reusable?: boolean };
};
// The source calls this queue 海斗; KIWI is the observed detail gameMode.
export function isMayhemMatch(match: { queue: string; mode?: string }) {
  return match.mode === "KIWI" || ["海斗", "海克斯大乱斗"].includes(match.queue);
}
export function validateQuery(input: unknown): Query {
  if (!input || typeof input !== "object") throw new Error("请填写查询条件。");
  const q = input as Record<string, unknown>;
  if (
    typeof q.player !== "string" ||
    q.player.trim().length > 70 ||
    !/^\S[^#\r\n]{0,49}#[^#\s]{1,16}$/.test(q.player.trim())
  )
    throw new Error("请输入完整 Riot ID，例如：吃饱饱睡早早#13459。");
  if (typeof q.area !== "string" || !Object.hasOwn(AREAS, q.area))
    throw new Error("请选择有效大区。");
  if (typeof q.mode !== "string" || !Object.hasOwn(MODES, q.mode))
    throw new Error("请选择有效对局模式。");
  if (typeof q.count !== "number" || ![10, 20, 30].includes(q.count))
    throw new Error("场次必须为 10、20 或 30。");
  if (q.refresh !== undefined && typeof q.refresh !== "boolean") throw new Error("更新参数无效。");
  return {
    player: q.player.trim(),
    area: q.area,
    mode: q.mode as Mode,
    count: q.count,
    ...(q.refresh === true ? { refresh: true } : {}),
  };
}
