import catalog from "./champion-roles.json";
import { isMayhemMatch, type Match } from "./model";
import { analyze } from "./analysis";
import { performance } from "./performance";

export const ROLE_INFO = {
  Fighter: {
    label: "战士",
    title: "贴脸快乐派",
    quote: "近身碰一碰，才有海斗的味道。",
    color: "#f6b97d",
  },
  Tank: {
    label: "坦克",
    title: "前排好搭子",
    quote: "喜欢的安全感，是前排有个位置。",
    color: "#85c7eb",
  },
  Marksman: {
    label: "射手",
    title: "走 A 快乐派",
    quote: "喜欢的浪漫，是一下一下点出来的。",
    color: "#e9cd7a",
  },
  Mage: {
    label: "法师",
    title: "技能烟花师",
    quote: "技能亮起来，峡谷就有了气氛。",
    color: "#b5a2f5",
  },
  Assassin: {
    label: "刺客",
    title: "机会收藏家",
    quote: "等一个机会，把这一局写成名场面。",
    color: "#e99fbd",
  },
  Support: {
    label: "辅助",
    title: "团战好搭子",
    quote: "海斗的快乐，也有和队友一起的那份。",
    color: "#78d6bb",
  },
} as const;
export type Role = keyof typeof ROLE_INFO;
const roles = Object.keys(ROLE_INFO) as Role[];
const champions = catalog.champions as Record<string, { name: string; roles: string[] }>;
export function championRoles(id: string): Role[] {
  return [...new Set(champions[id]?.roles ?? [])].filter((r): r is Role =>
    Object.hasOwn(ROLE_INFO, r),
  );
}
export const ROLE_SOURCE = { version: catalog.version, url: catalog.source };

export type ChampionTag = { label: string; evidence: string; kind: "role" | "personal"; color: string };
export function championTags(id: string, input: Match[]): ChampionTag[] {
  const tags: ChampionTag[] = championRoles(id).map((role) => ({
    label: ROLE_INFO[role].label, evidence: "官方英雄定位", kind: "role", color: ROLE_INFO[role].color,
  }));
  const rows = input.filter((r) => r.championId === id && isMayhemMatch(r));
  if (!rows.length) return tags;
  const personal: ChampionTag[] = [];
  const add = (label: string, evidence: string) => personal.push({ label, evidence, kind: "personal", color: "#efd18b" });
  const scope = "本次使用该英雄 " + rows.length + " 场，";
  if (rows.length >= 3) add("常驻嘉宾", "该英雄在本次海斗出场 " + rows.length + " 次。");
  const ready = rows.every((r) => r.detailState !== "pending" && r.detailState !== "unavailable");
  const meanValue = (key: "damage" | "assists" | "participation") => {
    const values = rows.map((r) => r[key]);
    return ready && values.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && (key !== "participation" || v <= 100))
      ? (values as number[]).reduce((a, b) => a + b, 0) / rows.length : null;
  };
  const damage = meanValue("damage"), assists = meanValue("assists"), participation = meanValue("participation");
  if (damage !== null && damage >= 50000) add("火力全开", scope + "场均英雄伤害 " + Math.round(damage).toLocaleString("zh-CN") + "。");
  if (assists !== null && assists >= 20) add("助攻搭子", scope + "场均助攻 " + assists.toFixed(1) + " 次。");
  if (participation !== null && participation >= 70) add("团战常客", scope + "平均参团率 " + participation.toFixed(1) + "% 。");
  if (!personal.length) add(rows.length === 1 ? "一局有缘" : "再度登场", "仅描述本次样本：该英雄出场 " + rows.length + " 次。");
  return [...tags, ...personal.slice(0, 2)];
}

// One match contributes a total weight of one, divided equally between its
// official champion tags. Never treat the order of those tags as a main role.
export function playerPersona(input: Match[]) {
  const rows = input.filter(isMayhemMatch);
  const weighted = Object.fromEntries(roles.map((r) => [r, 0])) as Record<Role, number>;
  const appearances = Object.fromEntries(roles.map((r) => [r, 0])) as Record<Role, number>;
  let classified = 0;
  for (const row of rows) {
    const tags = championRoles(row.championId);
    if (!tags.length) continue;
    classified++;
    for (const tag of tags) {
      weighted[tag] += 1 / tags.length;
      appearances[tag]++;
    }
  }
  const distribution = roles.map((key) => ({
    key,
    ...ROLE_INFO[key],
    appearances: appearances[key],
    share: classified ? (weighted[key] / classified) * 100 : 0,
    percent: classified ? Math.floor((weighted[key] / classified) * 100 + 1e-9) : 0,
  }));
  // Largest remainders keep the six displayed percentages adding up to 100.
  if (classified) {
    const remainder = 100 - distribution.reduce((n, r) => n + r.percent, 0);
    const rounding = [...distribution].sort((a, b) => b.share - b.percent - (a.share - a.percent));
    for (let i = 0; i < remainder; i++) rounding[i].percent++;
  }
  const ranked = [...distribution].sort((a, b) => b.share - a.share);
  const [first, second] = ranked;
  const enough = classified >= 5 && classified / rows.length >= 0.8;
  let kind: "single" | "hybrid" | "mixed" | "insufficient" = "insufficient";
  let title = "海斗探索家",
    label = "画像收集中";
  let quote = "每一场，都是认识自己玩法的新线索。";
  let evidence =
    classified < 5
      ? "已识别 " + classified + " 场英雄定位，至少 5 场再生成玩家类型。"
      : "部分英雄定位尚未收录，暂不生成玩家类型。";
  if (enough) {
    if (first.share >= 30 && first.share - second.share >= 10 - 1e-9) {
      kind = "single";
      title = first.title;
      label = first.label + "型玩家";
      quote = first.quote;
      evidence =
        "这 " +
        rows.length +
        " 场里，" +
        first.appearances +
        " 场使用了带有" +
        first.label +
        "定位的英雄。";
    } else if (first.share + second.share >= 60 - 1e-9 && second.share >= 20 - 1e-9) {
      kind = "hybrid";
      title = "双修快乐派";
      label = first.label + " × " + second.label + "型玩家";
      quote = "两种英雄口味，一份加倍的海斗快乐。";
      evidence = first.label + "与" + second.label + "是本次最突出的两种英雄定位。";
    } else {
      kind = "mixed";
      title = "百变海斗搭子";
      label = "多面型玩家";
      quote = "英雄可以随机，快乐不必只有一种。";
      evidence = "本次出场英雄的定位比较分散，没有明显偏向单一类型。";
    }
  }
  const heroMap = new Map<string, { id: string; name: string; count: number; roleLabel: string }>();
  for (const row of rows) {
    if (!row.championId || !row.champion || row.champion === "未知英雄") continue;
    const hero = heroMap.get(row.championId);
    if (hero) hero.count++;
    else
      heroMap.set(row.championId, {
        id: row.championId,
        name: row.champion,
        count: 1,
        roleLabel:
          championRoles(row.championId)
            .map((r) => ROLE_INFO[r].label)
            .join(" / ") || "定位待收录",
      });
  }
  const heroes = [...heroMap.values()].sort((a, b) => b.count - a.count).slice(0, 3)
    .map((hero) => ({ ...hero, tags: championTags(hero.id, rows) }));
  const stats = analyze(rows),
    rates = performance(rows);
  const tags: { title: string; evidence: string }[] = [];
  if (rows.length >= 5 && heroMap.size === rows.length)
    tags.push({
      title: "英雄不重样",
      evidence: rows.length + " 场用了 " + heroMap.size + " 个不同英雄。",
    });
  else if (rows.length >= 5 && heroes[0]?.count >= 3)
    tags.push({
      title: "熟面孔搭子",
      evidence: heroes[0].name + "在这批对局出场 " + heroes[0].count + " 次。",
    });
  else if (heroMap.size >= 7)
    tags.push({ title: "英雄体验家", evidence: "这批对局体验了 " + heroMap.size + " 个英雄。" });
  const ready =
    rows.length >= 5 &&
    rows.every((r) => r.detailState !== "pending" && r.detailState !== "unavailable");
  if (ready && rates.participation.count === rows.length && rates.participation.value! >= 70)
    tags.push({
      title: "团战打卡人",
      evidence: "本次平均参团率 " + rates.participation.value!.toFixed(1) + "%。",
    });
  if (ready && stats.kdaCount === rows.length && stats.assists! >= 20)
    tags.push({
      title: "助攻发射机",
      evidence: "本次平均每场 " + stats.assists!.toFixed(1) + " 次助攻。",
    });
  let streak = 0;
  for (const row of rows) {
    if (row.win !== true) break;
    streak++;
  }
  if (streak >= 3)
    tags.push({ title: "连胜好心情", evidence: "这批海斗中，最近连续 " + streak + " 场获胜。" });
  return {
    rows,
    kind,
    title,
    label,
    quote,
    evidence,
    classified,
    unknown: rows.length - classified,
    distribution,
    ranked,
    heroes,
    uniqueHeroes: heroMap.size,
    tags: tags.slice(0, 3),
    color: enough && kind !== "mixed" ? first.color : "#a4d8cc",
  };
}
export type PlayerPersona = ReturnType<typeof playerPersona>;
