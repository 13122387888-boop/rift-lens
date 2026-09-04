import { analyze } from "./analysis";
import { performance } from "./performance";
import { isMayhemMatch, type Match, type Snapshot } from "./model";
import { playerPersona } from "./player-persona";

export const formatNumber = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : n.toLocaleString("zh-CN", { maximumFractionDigits: digits });
const usable = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
export function mayhemReport(snapshot: Snapshot) {
  const rows = snapshot.rows.filter(isMayhemMatch);
  const stats = analyze(rows),
    rates = performance(rows);
  const complete =
    !snapshot.loading &&
    rows.length > 0 &&
    rows.every((r) => r.detailState !== "pending" && r.detailState !== "unavailable");
  const full = rows.length >= 10 && complete;
  let title = "海斗实战派",
    reason = "每一场都有自己的故事";
  if (full && rates.participation.count === rows.length && rates.participation.value! >= 70) {
    title = "团战常驻选手";
    reason = `平均参团 ${formatNumber(rates.participation.value)}%，打团总有你的身影`;
  } else if (full && stats.kdaCount === rows.length && stats.assists! >= 20) {
    title = "助攻发动机";
    reason = `场均 ${formatNumber(stats.assists)} 次助攻，一起把团战打满`;
  } else if (full && rates.dpm.count === rows.length && rates.dpm.value! >= 2500) {
    title = "火力担当";
    reason = `每分钟 ${formatNumber(rates.dpm.value, 0)} 伤害，火力写在数据里`;
  } else if (full && stats.unknown === 0 && stats.winrate! >= 70) {
    title = "胜场收集家";
    reason = `${rows.length} 场拿下 ${stats.wins} 胜，这份战绩值得留念`;
  } else if (rows.length < 10) {
    reason = `当前 ${rows.length} 场，满 10 场后解锁数据称号`;
  }
  const best = (key: "damage" | "score" | "participation") =>
    rows
      .filter((r) => usable(r[key]))
      .reduce<Match | null>((winner, r) => (!winner || r[key]! > winner[key]! ? r : winner), null);
  const damageMatch = best("damage"),
    scoreMatch = best("score"),
    teamMatch = best("participation");
  const highlights = [
    {
      key: "damage",
      label: "火力最高的一场",
      row: damageMatch,
      value: formatNumber(damageMatch?.damage, 0),
      unit: "伤害",
    },
    {
      key: "score",
      label: "评分最高的一场",
      row: scoreMatch,
      value: formatNumber(scoreMatch?.score),
      unit: "分",
    },
    {
      key: "participation",
      label: "参团最高的一场",
      row: teamMatch,
      value: formatNumber(teamMatch?.participation),
      unit: "%",
    },
  ] as const;
  const dateRange = rows.length
    ? `${rows.at(-1)!.date.slice(0, 5)} — ${rows[0].date.slice(0, 5)}`
    : "暂无对局";
  const coverage = `${rows.length} 场海斗 / 最近 ${snapshot.scanned ?? snapshot.requested} 场全部对局`;
  return {
    persona: playerPersona(rows),
    rows,
    stats,
    rates,
    complete,
    title,
    reason,
    highlights,
    damageMatch,
    dateRange,
    coverage,
  };
}
export type MayhemReport = ReturnType<typeof mayhemReport>;
export type ReportStyle = "overview" | "highlight";
export function reportText(
  snapshot: Snapshot,
  report: MayhemReport,
  style: ReportStyle,
  hideName: boolean,
  highlight: Match | null,
) {
  const name = (snapshot.isSample ? "示例 · " : "") + (hideName ? "神秘海斗玩家" : snapshot.player);
  if (style === "highlight" && highlight)
    return `${name} · 海斗高光\n${highlight.champion} · ${highlight.win === true ? "胜利" : highlight.win === false ? "失败" : "胜负未知"}\n${formatNumber(highlight.damage, 0)} 伤害 · ${formatNumber(highlight.score)} 分\n${highlight.kills ?? "—"} / ${highlight.deaths ?? "—"} / ${highlight.assists ?? "—"}\n本人本次样本，非全服排名。`;
  return `${name} · ${report.persona.title}\n${report.persona.label} · ${report.persona.quote}\n${report.persona.distribution.map((r) => r.label + " " + (report.persona.classified ? r.percent + "%" : "—")).join(" / ")}\n近 ${report.rows.length} 场海斗：${report.stats.wins} 胜 ${report.stats.losses} 负${report.stats.unknown ? " · " + report.stats.unknown + " 场未判定" : ""}\n常选的英雄：${report.persona.heroes.map((h) => h.name + "（" + h.tags.map((t) => t.label).join("、") + "）").join("；")}\n${report.persona.tags.map((t) => t.title).join(" · ")}\n按本次出场英雄生成的趣味画像，不代表操作水平。`;
}
