import {
  formatNumber as fmt,
  type MayhemReport,
  type ReportStyle,
} from './mayhem-report';
import { performance } from './performance';
import type { Match, Snapshot } from './model';

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
export function drawReport(
  ctx: CanvasRenderingContext2D,
  options: CardOptions,
) {
  const { data, report, style, hideName, highlight, highlightLabel } = options;
  const W = CARD_WIDTH,
    H = CARD_HEIGHT;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#28375b');
  bg.addColorStop(0.46, '#141d30');
  bg.addColorStop(1, '#0d252b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ecc273';
  ctx.fillRect(0, 0, W, 9);
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = '#f2f0e7',
    weight = 400,
    max = 936,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;
    ctx.textBaseline = 'top';
    let output = value;
    while (ctx.measureText(output).width > max && output.length > 1)
      output = output.slice(0, -2) + '…';
    ctx.fillText(output, x, y);
  };
  const line = (y: number) => {
    ctx.fillStyle = '#43566d';
    ctx.fillRect(72, y, 936, 1);
  };
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#203341';
    ctx.fillRect(x, y, w, h);
  };
  const name = hideName ? '神秘海斗玩家' : data.player.split('#')[0];
  text('对局透镜 / 海斗档案', 72, 49, 26, '#adc0d4', 500);
  text(
    data.isSample
      ? '真实样本 · ' + data.fetchedAt.slice(0, 10)
      : '个人战报 · ' + data.fetchedAt.slice(0, 10),
    665,
    49,
    23,
    '#adc0d4',
    400,
    345,
  );
  text(name, 72, 115, 40, '#fff', 600);
  text(data.area + ' · ' + report.dateRange, 72, 170, 25, '#a4b9ce');
  if (style === 'highlight' && highlight) {
    const rates = performance([highlight]);
    text('MY MAYHEM HIGHLIGHT', 72, 238, 24, '#ecc273', 500);
    text(
      highlight.win === true ? '这一把，火力全开。' : '这一把，也值得留念。',
      72,
      279,
      69,
      '#ffdc96',
      700,
    );
    text(
      highlightLabel + ' · ' + highlight.champion,
      72,
      377,
      35,
      '#c7d7e3',
      500,
    );
    text(
      highlight.date +
        ' · ' +
        (highlight.win === true
          ? '胜利'
          : highlight.win === false
            ? '失败'
            : '胜负未判定'),
      72,
      430,
      26,
      highlight.win === true ? '#70dcca' : '#e4adbf',
    );
    text(fmt(highlight.damage, 0), 64, 493, 138, '#fff', 700, 850);
    text('单场伤害', 76, 653, 30, '#a6c1d0');
    line(721);
    const values = [
      {
        v: `${highlight.kills ?? '—'} / ${highlight.deaths ?? '—'} / ${highlight.assists ?? '—'}`,
        label: '击杀 / 死亡 / 助攻',
      },
      { v: fmt(highlight.score), label: '数据源评分' },
      { v: fmt(highlight.participation) + '%', label: '参团率' },
    ];
    values.forEach((m, i) => {
      const x = 72 + i * 312;
      text(m.v, x, 753, i === 0 ? 40 : 51, '#f0e8d6', 600, 295);
      text(m.label, x, 818, 24, '#91adbf');
    });
    line(872);
    [
      { v: fmt(rates.dpm.value, 0), label: '每分钟伤害' },
      { v: fmt(rates.gpm.value, 0), label: '每分钟经济' },
      { v: fmt(rates.deaths10.value), label: '每 10 分钟死亡' },
    ].forEach((m, i) => {
      const x = 72 + i * 312;
      text(m.v, x, 912, 48, '#c9e9e2', 500, 290);
      text(m.label, x, 974, 24, '#91adbf');
    });
    panel(72, 1040, 936, 107);
    text('高光也可以来自一场失利。', 98, 1060, 29, '#dcc99f', 500);
    text('本人本次样本的单场纪录，非全服或历史最高。', 98, 1103, 24, '#9ab5c1');
  } else {
    text('MY MAYHEM IDENTITY', 72, 231, 24, '#ecc273', 500);
    text(report.title, 68, 272, 85, '#ffdc96', 700);
    text(report.reason, 72, 382, 29, '#bdcddd');
    text(fmt(report.stats.winrate, 0), 62, 458, 177, '#fff', 700, 380);
    text('%', 400, 558, 49, '#dbc69d', 500);
    text(
      `${report.stats.wins} 胜 / ${report.stats.losses} 负`,
      538,
      499,
      55,
      '#d4eee8',
      600,
      470,
    );
    text(
      '近 ' + report.rows.length + ' 场海斗 · 胜率',
      540,
      578,
      27,
      '#9eb7cb',
    );
    if (report.stats.unknown)
      text(report.stats.unknown + ' 场胜负未判定', 540, 620, 24, '#e3b29d');
    line(684);
    [
      { v: fmt(report.rates.dpm.value, 0), label: '每分钟伤害' },
      { v: fmt(report.rates.participation.value) + '%', label: '参团率' },
      { v: fmt(report.stats.kda), label: '整体 KDA' },
      { v: fmt(report.stats.score), label: '平均评分' },
    ].forEach((m, i) => {
      const x = 72 + i * 234;
      text(m.v, x, 716, 49, '#f3eddf', 600, 219);
      text(m.label, x, 779, 24, '#93aec3');
    });
    line(830);
    text('这一段征途 · 最近最多 10 场', 72, 860, 25, '#b5c9d8');
    text('较早 → 最近', 807, 860, 24, '#8faabf', 400, 206);
    const recent = report.rows.slice(0, 10).reverse();
    recent.forEach((r, i) => {
      const x = 72 + i * 94.3;
      ctx.fillStyle =
        r.win === true ? '#42c9b1' : r.win === false ? '#50394f' : '#3e5164';
      ctx.fillRect(x, 909, 83, 63);
      text(
        r.win === true ? '胜' : r.win === false ? '负' : '?',
        x + 26,
        925,
        27,
        r.win === true ? '#092b25' : '#edc1d0',
        500,
        45,
      );
    });
    panel(72, 1010, 936, 129);
    text('本次样本 · 单场伤害最高', 96, 1030, 24, '#b7bcae');
    const best = report.damageMatch;
    text(
      best
        ? best.champion + ' · ' + fmt(best.damage, 0) + ' 伤害'
        : '暂无完整伤害数据',
      96,
      1072,
      37,
      '#eed6a4',
      600,
      875,
    );
  }
  line(1181);
  text('RIFT LENS', 72, 1208, 31, '#bfdcd9', 600);
  text(
    '趣味战报 · 仅描述本人样本，非段位 / 全服排名',
    340,
    1212,
    23,
    '#91aeba',
    400,
    672,
  );
  text(report.coverage, 72, 1260, 23, '#849fae');
  text('来源 a.lzyumi.top · 缺失值为 —', 630, 1260, 23, '#849fae', 400, 380);
  if (style === 'overview')
    text(
      '有效场次：伤害 ' +
        report.rates.dpm.count +
        '/' +
        report.rows.length +
        ' · 参团 ' +
        report.rates.participation.count +
        '/' +
        report.rows.length +
        ' · KDA ' +
        report.stats.kdaCount +
        '/' +
        report.rows.length +
        ' · 评分 ' +
        report.stats.scoreCount +
        '/' +
        report.rows.length,
      72,
      1301,
      21,
      '#849fae',
    );
}

export async function makeReportPng(options: CardOptions): Promise<Blob> {
  if (!options.report.complete) throw new Error('请等待详情完整后再生成战报。');
  if (options.style === 'highlight' && !options.highlight)
    throw new Error('这批对局暂无可生成的单场高光。');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法生成图片，请使用截图。');
  drawReport(ctx, options);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('图片生成失败，请重试。')),
      'image/png',
    ),
  );
}
