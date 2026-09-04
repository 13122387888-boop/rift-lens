/* oxlint-disable next/no-img-element -- Standalone static Vite app uses native images. */
'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Download,
  Copy,
  LoaderCircle,
  Sparkles,
  Swords,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChampionIcon, TrendChart } from './analytics';
import {
  mayhemReport,
  formatNumber as fmt,
  reportText,
  type ReportStyle,
  type MayhemReport,
} from '@/lib/mayhem-report';
import { makeReportPng, type CardOptions } from '@/lib/report-image';
import type { Match, Snapshot } from '@/lib/model';

function PosterPlaceholder({
  data,
  report,
  hideName,
}: {
  data: Snapshot;
  report: MayhemReport;
  hideName: boolean;
}) {
  return (
    <article
      className="share-poster poster-placeholder"
      aria-label="正在准备海斗战报"
    >
      <div className="poster-top">
        <span>对局透镜 / 海斗档案</span>
        <span>{data.isSample ? '真实样本' : '个人战报'}</span>
      </div>
      <p className="poster-player">
        {hideName ? '神秘海斗玩家' : data.player.split('#')[0]}
        <small>
          {data.area} · 最近 {report.rows.length} 场海斗
        </small>
      </p>
      <p className="poster-overline">MY MAYHEM IDENTITY</p>
      <h3>{report.title}</h3>
      <p className="poster-reason">{report.reason}</p>
      <div className="poster-score">
        <strong>
          {fmt(report.stats.winrate, 0)}
          <small>%</small>
        </strong>
        <div>
          <b>
            {report.stats.wins} 胜 / {report.stats.losses} 负
          </b>
          <span>近期胜率</span>
        </div>
      </div>
      <div className="poster-metrics">
        <div>
          <strong>{fmt(report.rates.dpm.value, 0)}</strong>
          <span>每分钟伤害</span>
        </div>
        <div>
          <strong>{fmt(report.rates.participation.value)}%</strong>
          <span>参团率</span>
        </div>
        <div>
          <strong>{fmt(report.stats.kda)}</strong>
          <span>整体 KDA</span>
        </div>
        <div>
          <strong>{fmt(report.stats.score)}</strong>
          <span>平均评分</span>
        </div>
      </div>
      <p className="poster-reason">
        {data.loading
          ? '详情补齐后生成高清战报…'
          : report.complete
            ? '正在生成高清预览…'
            : '详情未齐，可先更新数据再生成战报。'}
      </p>
      <div className="poster-footer">
        <b>RIFT LENS</b>
        <span>
          {report.coverage}
          <br />
          趣味称号 · 仅描述本人样本
        </span>
      </div>
    </article>
  );
}
export function MayhemReportPanel({
  data,
  onSelect,
}: {
  data: Snapshot;
  onSelect: (r: Match) => void;
}) {
  const report = useMemo(() => mayhemReport(data), [data]);
  const [hideName, setHideName] = useState(false),
    [style, setStyle] = useState<ReportStyle>('overview');
  const [highlightKey, setHighlightKey] = useState('damage'),
    [message, setMessage] = useState(''),
    [copying, setCopying] = useState(false);
  const selected =
    report.highlights.find((h) => h.key === highlightKey) ??
    report.highlights[0];
  const options = useMemo<CardOptions>(
    () => ({
      data,
      report,
      style,
      hideName,
      highlight: selected.row,
      highlightLabel: '本次样本 · ' + selected.label,
    }),
    [data, report, style, hideName, selected],
  );
  const [prepared, setPrepared] = useState<{
    options: CardOptions;
    blob: Blob;
    url: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false,
      url = '';
    if (report.complete)
      void makeReportPng(options)
        .then((blob) => {
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setPrepared({ options, blob, url });
          setMessage('');
        })
        .catch((e) => {
          if (!cancelled)
            setMessage(e instanceof Error ? e.message : '战报生成失败。');
        });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [options, report.complete]);
  const ready = prepared?.options === options && report.complete;
  function saveImage() {
    if (!ready || !prepared) return;
    const name = hideName
      ? '神秘玩家'
      : data.player
          .split('#')[0]
          .replace(/[^\p{L}\p{N}_-]/gu, '')
          .slice(0, 24) || '玩家';
    const a = document.createElement('a');
    a.href = prepared.url;
    a.download =
      '海斗' +
      (style === 'highlight' ? '高光' : '战报') +
      '-' +
      name +
      '-' +
      data.fetchedAt.slice(0, 10) +
      '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMessage('已生成 PNG。若浏览器没有开始下载，可长按或右键保存左侧图片。');
  }
  async function copyImage() {
    if (!ready || !prepared) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setMessage('当前浏览器不支持复制图片，请使用“保存战报”。');
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': prepared.blob }),
      ]);
      setMessage('图片已复制，可以粘贴到聊天窗口。');
    } catch {
      setMessage('图片复制未成功，请使用“保存战报”。');
    } finally {
      setCopying(false);
    }
  }
  const preview =
    ready && prepared ? (
      <img
        className="report-png"
        src={prepared.url}
        alt={reportText(data, report, style, hideName, selected.row)}
        width={1080}
        height={1350}
      />
    ) : (
      <PosterPlaceholder data={data} report={report} hideName={hideName} />
    );
  return (
    <section className="mayhem-studio" id="share-report">
      <div className="mayhem-intro">
        <div>
          <p className="eyebrow">ARAM MAYHEM / YOUR MOMENT</p>
          <h2>这 {report.rows.length} 场，有你的名场面。</h2>
          <p>近 {report.rows.length} 场海斗，一张战报留下高光。</p>
        </div>
        <span className="mayhem-edition">
          <Sparkles size={16} />
          海斗战报
        </span>
      </div>
      <Tabs
        value={style}
        onValueChange={(v) => setStyle(v as ReportStyle)}
        className="report-tabs"
      >
        <div className="report-toolbar">
          <TabsList aria-label="战报模板">
            <TabsTrigger value="overview">
              近 {report.rows.length} 场总览
            </TabsTrigger>
            <TabsTrigger value="highlight" disabled={!selected.row}>
              高光单局
            </TabsTrigger>
          </TabsList>
          <label className="report-privacy" htmlFor="report-hide-name">
            <Switch
              id="report-hide-name"
              size="sm"
              checked={hideName}
              onCheckedChange={setHideName}
              aria-label="隐藏玩家名称"
            />
            隐藏玩家名
          </label>
        </div>
        <div className="mayhem-studio-grid">
          <div className="report-preview">
            <TabsContent value="overview">{preview}</TabsContent>
            <TabsContent value="highlight">{preview}</TabsContent>
            <p>1080 × 1350 高清 PNG · 预览即保存内容</p>
          </div>
          <div className="mayhem-story">
            <p className="eyebrow">SAVE YOUR MOMENT</p>
            <h3>
              {style === 'overview'
                ? '给这段海斗，留张战报。'
                : '这一局，单独晒。'}
            </h3>
            <p>
              {style === 'overview'
                ? report.reason
                : '已选 ' +
                  (selected.row?.champion ?? '—') +
                  ' · ' +
                  selected.label +
                  '。战报保留实际胜负。'}
            </p>
            <div className="report-actions">
              <Button
                className="save-report"
                onClick={saveImage}
                disabled={!ready}
              >
                <Download size={18} />
                保存战报
              </Button>
              <Button
                variant="outline"
                onClick={() => void copyImage()}
                disabled={!ready || copying}
              >
                {copying ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Copy size={17} />
                )}
                复制图片
              </Button>
            </div>
            <output className="report-feedback" aria-live="polite">
              {message ||
                (data.loading
                  ? '正在逐场补齐详情…'
                  : !report.complete
                    ? '详情未齐，更新数据后即可生成。'
                    : '截图、保存或复制，分享方式由你决定。')}
            </output>
            <div className="moments-heading">
              <h4>选一场，生成单局高光</h4>
              <span>只比较本次样本</span>
            </div>
            <div className="mayhem-moments">
              {report.highlights.map((h) => (
                <Button
                  key={h.key}
                  variant="ghost"
                  disabled={!h.row || !report.complete}
                  onClick={() => {
                    setHighlightKey(h.key);
                    setStyle('highlight');
                  }}
                  aria-pressed={style === 'highlight' && highlightKey === h.key}
                  className="mayhem-moment"
                >
                  <span className="moment-icon">
                    {h.row ? (
                      <ChampionIcon id={h.row.championId} />
                    ) : (
                      <Swords />
                    )}
                  </span>
                  <span>
                    <small>{h.label}</small>
                    <b>{h.row?.champion ?? '等待详情'}</b>
                    <small>{h.row?.date}</small>
                  </span>
                  <strong>
                    {h.value}
                    <small>{h.unit}</small>
                  </strong>
                  <ArrowUpRight size={18} />
                </Button>
              ))}
            </div>
            {style === 'highlight' && selected.row && (
              <Button
                variant="ghost"
                onClick={() => selected.row && onSelect(selected.row)}
              >
                查看这场完整数据 <ArrowUpRight size={15} />
              </Button>
            )}
            <p className="mayhem-share-note">
              {report.coverage}
              。称号是本次数据触发的趣味标签，不代表全服排名或真实 MMR。
              <a href="#mayhem-rules">查看称号规则</a>
            </p>
          </div>
        </div>
      </Tabs>
    </section>
  );
}
export function MayhemTrend({ data }: { data: Snapshot }) {
  const report = mayhemReport(data);
  return (
    <section className="panel mayhem-trend">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR LAST MATCHES</p>
          <h3>最近海斗，状态怎么变？</h3>
        </div>
        <span className="subtle">数据源对局评分 · 较早 → 最近</span>
      </div>
      <div className="chart-wrap">
        <TrendChart data={report.stats.series} metric="score" ema={false} />
      </div>
      <p className="review-formula">
        评分按数据源原值展示。海斗暂未取得可验证的个人
        MMR，不用排位段位替代海斗表现。
      </p>
    </section>
  );
}
