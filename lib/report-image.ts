import { formatNumber as fmt, type MayhemReport, type ReportStyle } from "./mayhem-report";
import type { Match, Snapshot } from "./model";
import { loadChampionPortrait } from "./champion-image";

export const CARD_WIDTH = 1080,
  CARD_HEIGHT = 1350;
export type CardOptions = {
  data: Snapshot;
  report: MayhemReport;
  style: ReportStyle;
  hideName: boolean;
  highlight: Match | null;
  highlightLabel: string;
  highlightMetric?: "damage" | "score" | "participation";
};
// Portraits are hosted with the app so the canvas remains safe to export.
export function drawReport(
  ctx: CanvasRenderingContext2D,
  options: CardOptions,
  portrait: CanvasImageSource | null = null,
  heroPortraits: Record<string, CanvasImageSource | null> = {},
) {
  const { data, report, style, hideName, highlight, highlightLabel } = options;
  const W = CARD_WIDTH,
    H = CARD_HEIGHT;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#28375b");
  bg.addColorStop(0.46, "#141d30");
  bg.addColorStop(1, "#0d252b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ecc273";
  ctx.fillRect(0, 0, W, 9);
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = "#f2f0e7",
    weight = 400,
    max = 936,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;
    ctx.textBaseline = "top";
    let output = value;
    while (ctx.measureText(output).width > max && output.length > 1)
      output = output.slice(0, -2) + "…";
    ctx.fillText(output, x, y);
  };
  const line = (y: number) => {
    ctx.fillStyle = "#43566d";
    ctx.fillRect(72, y, 936, 1);
  };
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "#203341";
    ctx.fillRect(x, y, w, h);
  };
  const name = hideName ? "神秘海斗玩家" : data.player.split("#")[0];
  text("对局透镜 / 海斗档案", 72, 49, 26, "#adc0d4", 500);
  text(
    data.isSample
      ? "示例 · " + data.fetchedAt.slice(0, 10)
      : "个人战报 · " + data.fetchedAt.slice(0, 10),
    665,
    49,
    29,
    "#adc0d4",
    400,
    345,
  );
  text(name, 72, 115, 40, "#fff", 600);
  text(data.area + " · " + report.dateRange, 72, 170, 25, "#a4b9ce");
  if (style === "highlight" && highlight) {
    text("MY MAYHEM HIGHLIGHT", 72, 238, 24, "#ecc273", 500);
    text(
      highlight.win === true ? "这一把，火力全开。" : "这一把，也值得留念。",
      72,
      279,
      61,
      "#ffdc96",
      700,
      724,
    );
    ctx.fillStyle = "#d5b477";
    ctx.fillRect(816, 266, 192, 192);
    if (portrait) ctx.drawImage(portrait, 824, 274, 176, 176);
    else {
      panel(824, 274, 176, 176);
      text(highlight.champion.slice(0, 1), 872, 303, 68, "#d6c596", 600, 100);
      text("头像暂缺", 852, 405, 24, "#a6b9c8", 400, 144);
    }
    text(highlight.champion, 72, 367, 45, "#e8ece6", 600, 720);
    text(highlightLabel, 72, 429, 27, "#adc2d3", 400, 720);
    text(
      highlight.date +
        " · " +
        (highlight.win === true ? "胜利" : highlight.win === false ? "失败" : "胜负未判定"),
      72,
      476,
      25,
      highlight.win === true ? "#70dcca" : "#e4adbf",
    );
    const metric = options.highlightMetric ?? "damage";
    const metricValue = highlight[metric];
    text(
      fmt(metricValue, metric === "damage" ? 0 : 1) +
        (metric === "participation" && metricValue !== null ? "%" : ""),
      64,
      532,
      119,
      "#fff",
      700,
      920,
    );
    text(
      { damage: "单场伤害", score: "本场对局评分", participation: "本场参团率" }[metric],
      76,
      670,
      29,
      "#a6c1d0",
    );
    line(721);
    const values = [
      {
        v: String(highlight.kills ?? "—"),
        label: "次击杀",
      },
      { v: String(highlight.assists ?? "—"), label: "次助攻" },
      { v: highlight.participation == null ? "—" : fmt(highlight.participation) + "%", label: "参团率" },
    ];
    values.forEach((m, i) => {
      const x = 72 + i * 312;
      text(m.v, x, 753, 51, "#f0e8d6", 600, 295);
      text(m.label, x, 818, 24, "#91adbf");
    });
    line(872);
    text(report.persona.label + " · " + report.persona.title, 72, 908, 40, "#e9ce93", 600);
    text(report.persona.quote, 72, 970, 29, "#adc2d3");
    panel(72, 1040, 936, 107);
    text("高光也可以来自一场失利。", 98, 1060, 29, "#dcc99f", 500);
    text("本人本次样本的单场纪录，非全服或历史最高。", 98, 1103, 24, "#9ab5c1");
  } else {
    const persona = report.persona;
    text(persona.title, 68, 229, 80, "#fff0cd", 700);
    text(persona.label, 72, 327, 36, persona.color, 600);
    const badges = persona.tags.slice(0, 3);
    badges.forEach((badge, i) => {
      const x = 72 + i * 318;
      panel(x, 389, 300, 53);
      text(badge.title, x + 18, 398, 32, "#f0d496", 600, 264);
    });
    if (!badges.length) text("这批对局，也有自己的故事。", 72, 400, 30, "#adc4cf");
    panel(72, 466, 936, 239);
    text("我的英雄口味", 96, 486, 29, "#f4e6c8", 600);
    persona.distribution.forEach((role, i) => {
      const x = 98 + (i % 2) * 460, y = 538 + Math.floor(i / 2) * 51;
      text(role.label, x, y, 30, role.color, 600, 90);
      ctx.fillStyle = "#3b4b5d";
      ctx.fillRect(x + 86, y + 11, 236, 12);
      ctx.fillStyle = role.color;
      ctx.fillRect(x + 86, y + 11, (236 * role.share) / 100, 12);
      text(persona.classified ? role.percent + "%" : "—", x + 343, y, 30, "#e9eef2", 500, 85);
    });
    text("常选的英雄", 72, 731, 31, "#d7e2e5", 600);
    text("本次出场最多", 780, 735, 26, "#97b4c8", 400, 228);
    persona.heroes.forEach((hero, i) => {
      const y = 783 + i * 114;
      panel(72, y, 936, 105);
      const avatar = heroPortraits[hero.id];
      if (avatar) ctx.drawImage(avatar, 83, y + 8, 89, 89);
      else {
        ctx.fillStyle = "#324e59";
        ctx.fillRect(83, y + 8, 89, 89);
        text(hero.name.slice(0, 1), 105, y + 28, 40, "#e4c78e", 600, 64);
      }
      text(hero.name, 196, y + 12, 37, "#f2e4c9", 600, 350);
      text("本次 " + hero.count + " 场", 196, y + 63, 28, "#a6bcca", 400, 340);
      [hero.tags.filter(t => t.kind === "role"), hero.tags.filter(t => t.kind === "personal")].forEach((tags, row) => {
        let offset = 588;
        tags.forEach(tag => {
          ctx.font = '500 27px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
          const width = ctx.measureText(tag.label).width + 20;
          ctx.fillStyle = row === 0 ? "#2d4552" : "#423d2d";
          ctx.fillRect(offset, y + 10 + row * 45, width, 36);
          text(tag.label, offset + 10, y + 13 + row * 45, 27, tag.color, 500, width - 16);
          offset += width + 10;
        });
      });
    });
    if (!persona.heroes.length) text("查一查战绩，收集你的英雄故事。", 72, 830, 31, "#adc4cf");
    text(report.rows.length + " 场海斗  ·  " + report.stats.wins + " 胜 " + report.stats.losses + " 负" + (report.stats.unknown ? " · " + report.stats.unknown + " 场未判定" : ""), 72, 1140, 30, "#c4dfd6", 500);
  }
  line(1181);
  text("RIFT LENS", 72, 1208, 31, "#bfdcd9", 600);
  text("近期画像 · 非段位 / 全服排名", 470, 1212, 27, "#91aeba", 400, 672);
  text("最近 " + (data.scanned ?? data.requested) + " 场中 · " + report.rows.length + " 场海斗", 72, 1260, 27, "#a2bbc5");
  if (style === "overview")
    text("随机选人也会影响画像 · 仅描述这批对局", 72, 1301, 24, "#849fae");
}

export async function makeReportPng(options: CardOptions): Promise<Blob> {
  if (!options.report.complete) throw new Error("请等待详情完整后再生成战报。");
  if (options.style === "highlight" && !options.highlight)
    throw new Error("这批对局暂无可生成的单场高光。");
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成图片，请使用截图。");
  const ids = options.style === "highlight" && options.highlight
    ? [options.highlight.championId] : options.report.persona.heroes.map((hero) => hero.id);
  const portraits = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await loadChampionPortrait(id)] as const)));
  drawReport(ctx, options, options.highlight ? portraits[options.highlight.championId] ?? null : null, portraits);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片生成失败，请重试。"))),
      "image/png",
    ),
  );
}
