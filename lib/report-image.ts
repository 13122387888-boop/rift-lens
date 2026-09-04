import { formatNumber as fmt, type MayhemReport, type ReportStyle } from "./mayhem-report";
import type { Match, Snapshot } from "./model";

export const CARD_WIDTH = 1080,
  CARD_HEIGHT = 1350;
export type CardOptions = {
  data: Snapshot;
  report: MayhemReport;
  style: ReportStyle;
  hideName: boolean;
  highlight: Match | null;
  highlightLabel: string;
};
// Data graphics only: no remote images, fonts or HTML capture, so exports do not
// depend on cross-origin assets or include the controls around the preview.
export function drawReport(ctx: CanvasRenderingContext2D, options: CardOptions) {
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
      ? "真实样本 · " + data.fetchedAt.slice(0, 10)
      : "个人战报 · " + data.fetchedAt.slice(0, 10),
    665,
    49,
    23,
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
      69,
      "#ffdc96",
      700,
    );
    text(highlightLabel + " · " + highlight.champion, 72, 377, 35, "#c7d7e3", 500);
    text(
      highlight.date +
        " · " +
        (highlight.win === true ? "胜利" : highlight.win === false ? "失败" : "胜负未判定"),
      72,
      430,
      26,
      highlight.win === true ? "#70dcca" : "#e4adbf",
    );
    text(fmt(highlight.damage, 0), 64, 493, 138, "#fff", 700, 850);
    text("单场伤害", 76, 653, 30, "#a6c1d0");
    line(721);
    const values = [
      {
        v: String(highlight.kills ?? "—"),
        label: "次击杀",
      },
      { v: String(highlight.assists ?? "—"), label: "次助攻" },
      { v: fmt(highlight.participation) + "%", label: "参团率" },
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
    text("MY MAYHEM PLAYER CARD", 72, 230, 24, persona.color, 600);
    text(persona.title, 68, 270, 86, "#fff0cd", 700);
    text(persona.label, 72, 377, 36, persona.color, 600);
    text(persona.quote, 72, 429, 29, "#bed0dc");
    panel(72, 491, 936, 287);
    text("我的英雄口味", 98, 510, 28, "#f4e6c8", 600);
    text(
      "定位已识别 " + persona.classified + "/" + persona.rows.length + " 场",
      684,
      517,
      23,
      "#97b4c8",
      400,
      298,
    );
    persona.distribution.forEach((role, i) => {
      const x = 98 + (i % 2) * 460,
        y = 566 + Math.floor(i / 2) * 67;
      text(role.label, x, y, 29, role.color, 600, 90);
      ctx.fillStyle = "#3b4b5d";
      ctx.fillRect(x + 86, y + 11, 236, 11);
      ctx.fillStyle = role.color;
      ctx.fillRect(x + 86, y + 11, (236 * role.share) / 100, 11);
      text(persona.classified ? role.percent + "%" : "—", x + 343, y, 28, "#e9eef2", 500, 85);
    });
    text("陪我上过场的英雄", 72, 810, 27, "#a7c0d0", 500);
    persona.heroes.forEach((hero, i) => {
      const x = 72 + i * 318;
      panel(x, 857, 300, 107);
      text(hero.name, x + 20, 875, 31, "#f2e4c9", 600, 264);
      text(hero.count + " 场 · " + hero.roleLabel, x + 20, 925, 23, "#a6bcca", 400, 268);
    });
    if (!persona.heroes.length) text("查一查战绩，收集你的英雄故事。", 72, 877, 30, "#adc4cf");
    const badges = persona.tags.slice(0, 2);
    if (badges.length) {
      badges.forEach((badge, i) => {
        const x = 72 + i * 478;
        text(badge.title, x, 1006, 33, "#e9ce93", 600, 456);
        text(badge.evidence, x, 1055, 22, "#a2b7c7", 400, 448);
      });
    } else {
      text(persona.evidence, 72, 1008, 28, "#b8c9d4");
      text("快乐不需要达标，每场都有自己的故事。", 72, 1055, 26, "#e9ce93");
    }
    const wins =
      report.stats.wins +
      " 胜 · " +
      report.stats.losses +
      " 负" +
      (report.stats.unknown ? " · " + report.stats.unknown + " 场未判定" : "");
    text("这 " + report.rows.length + " 场的回忆  /  " + wins, 72, 1121, 29, "#c4dfd6", 500);
  }
  line(1181);
  text("RIFT LENS", 72, 1208, 31, "#bfdcd9", 600);
  text("趣味战报 · 仅描述本人样本，非段位 / 全服排名", 340, 1212, 23, "#91aeba", 400, 672);
  text(report.coverage, 72, 1260, 23, "#849fae");
  text("来源 a.lzyumi.top · 缺失值为 —", 630, 1260, 23, "#849fae", 400, 380);
  if (style === "overview")
    text("按本次出场英雄生成 · 随机选人影响画像 · 不代表操作水平", 72, 1301, 21, "#849fae");
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
  drawReport(ctx, options);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片生成失败，请重试。"))),
      "image/png",
    ),
  );
}
