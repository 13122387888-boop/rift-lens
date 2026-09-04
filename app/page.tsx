"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import {
  Crosshair,
  Search,
  ArrowUpRight,
  Activity,
  ChevronRight,
  Swords,
  Diamond,
  Info,
  TrendingUp,
  LoaderCircle,
  AlertCircle,
  Clock3,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChampionIcon, TrendChart } from "@/components/analytics";
import { analyze, mean } from "@/lib/analysis";
import { RankLabel, EloReference } from "@/components/elo-reference";
import { AREAS, MODES, validateQuery, type Snapshot, type Match, type Mode } from "@/lib/model";
import sample from "@/lib/mayhem-seed.json";
import { MayhemReportPanel, MayhemTrend } from "@/components/mayhem-report";
import { PerformanceReview } from "@/components/performance-review";
import { OptionalAnalysis, ChampionTags } from "@/components/player-persona";
import { CompanionsPanel } from "@/components/companions";
import { championRoles, playerPersona, ROLE_INFO } from "@/lib/player-persona";
import { performance } from "@/lib/performance";
import { QueryError } from "@/lib/request";
import { fetchQuery } from "@/lib/query-client";
import { Progress } from "@/components/ui/progress";
const initialSample = {
  ...sample,
  requested: 10,
  rows: sample.rows.slice(0, 10),
  warnings: [],
} as Snapshot;
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
const duration = (n: number | null) =>
  n === null ? "时长未提供" : Math.floor(n / 60) + " 分 " + (n % 60) + " 秒";
const positions: Record<string, string> = {
  TOP: "上路",
  JUNGLE: "打野",
  MIDDLE: "中路",
  BOTTOM: "下路",
  UTILITY: "辅助",
};
type AgentTool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
export default function Home() {
  const [data, setData] = useState<Snapshot>(initialSample);
  const [player, setPlayer] = useState(sample.player),
    [area, setArea] = useState(sample.area),
    [mode, setMode] = useState<Mode>("mayhem"),
    [count, setCount] = useState("10");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [slow, setSlow] = useState(false);
  const [retryable, setRetryable] = useState(true);
  const [lastQuery, setLastQuery] = useState<ReturnType<typeof validateQuery> | null>(null);
  const [receivedCurrent, setReceivedCurrent] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [busy]);
  const [metric, setMetric] = useState<"teamElo" | "score">("score");
  const [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Match | null>(null);
  const lock = useRef(false),
    abort = useRef<AbortController | null>(null);
  const stats = useMemo(() => analyze(data.rows), [data]);
  const shown = data.rows.filter(
    (r) => filter === "all" || (filter === "win" ? r.win === true : r.win === false),
  );
  async function query(input: unknown) {
    if (lock.current) throw new Error("已有查询正在进行。");
    let q;
    try {
      q = validateQuery(input);
    } catch (e) {
      const message = e instanceof Error ? e.message : "查询参数无效";
      setError(message);
      throw new Error(message);
    }
    setLastQuery(q);
    setReceivedCurrent(false);
    setRetryable(true);
    lock.current = true;
    setBusy(true);
    setError("");
    setStatus("正在获取战绩列表…");
    const controller = new AbortController();
    abort.current = controller;
    try {
      let receivedList = false;
      const result = await fetchQuery(
        q,
        controller.signal,
        (snapshot) => {
          setReceivedCurrent(true);
          setData(snapshot);
          setSelected((previous) =>
            previous ? (snapshot.rows.find((r) => r.id === previous.id) ?? null) : null,
          );
          if (!receivedList) {
            receivedList = true;
            setFilter("all");
            setSelected(null);
            setPlayer(q.player);
            setArea(q.area);
            setMode(q.mode);
            setCount(String(q.count));
            setMetric(q.mode === "mayhem" ? "score" : "teamElo");
          }
          setStatus(
            snapshot.loading
              ? "已取得 " +
                  snapshot.rows.length +
                  " 场战绩，详情 " +
                  (snapshot.loaded ?? 0) +
                  "/" +
                  snapshot.rows.length +
                  " 已处理" +
                  (snapshot.cache?.detailHits
                    ? " · 复用 " + snapshot.cache.detailHits + " 场详情"
                    : "")
              : "正在完成统计…",
          );
        },
      );
      flushSync(() => {
        setData(result);
        setMetric(result.rows.some((r) => r.teamElo !== null) ? "teamElo" : "score");
        setPlayer(q.player);
        setArea(q.area);
        setMode(q.mode);
        setCount(String(q.count));
        const incomplete = result.rows.filter((row) => row.detailState === "unavailable").length;
        setStatus(!result.rows.length
          ? "查询完成，当前范围内没有该模式的战绩。"
          : incomplete
            ? "已取得 " + result.rows.length + " 场，其中 " + incomplete + " 场详情暂缺。可更新重试。"
            : (result.cache?.queryHit ? "已读取近期查询结果，" : "查询完成，") + result.rows.length + " 场战绩已就绪。"

        );
      });
      if (result.mode === "mayhem" && result.rows.length && result.rows.every((r) => r.detailState === "ready")) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        requestAnimationFrame(() => document.getElementById("share-report")?.scrollIntoView({ behavior: "auto", block: "start" }));
      }
      return {
        player: result.player,
        area: result.area,
        mode: result.mode,
        matches: result.rows.length,
        fetchedAt: result.fetchedAt,
      };
    } catch (e) {
      setRetryable(!(e instanceof QueryError && (e.kind === "auth" || e.kind === "rate")));
      const message = controller.signal.aborted
        ? "查询已取消，保留当前结果。"
        : e instanceof Error
          ? e.message
          : "查询失败，请稍后重试。";
      setError(message);
      setStatus("");
      throw new Error(message);
    } finally {
      lock.current = false;
      setBusy(false);
      abort.current = null;
    }
  }
  const actions = useRef({ query, data, stats });
  useEffect(() => {
    actions.current = { query, data, stats };
  });
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: AgentTool, options: { signal: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: AgentTool[] = [
      {
        name: "query_lol_matches",
        description: "查询指定 Riot ID 的公开战绩并更新当前可视化看板；会调用数据源。",
        inputSchema: {
          type: "object",
          properties: {
            player: { type: "string" },
            area: { type: "string", enum: Object.keys(AREAS) },
            mode: { type: "string", enum: Object.keys(MODES) },
            count: { type: "number", enum: [10, 20, 30], default: 10 },
            refresh: { type: "boolean", description: "跳过缓存重新取得数据" },
          },
          required: ["player", "area", "mode", "count"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => actions.current.query(input),
      },
      {
        name: "read_match_analysis",
        description: "读取看板当前展示的玩家、样本数量、胜率、Team ELO 均值与趋势。",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => {
          const { data, stats } = actions.current;
          return {
            player: data.player,
            area: data.area,
            mode: data.mode,
            isSample: data.isSample,
            fetchedAt: data.fetchedAt,
            matches: data.rows.length,
            winrate: stats.winrate,
            teamEloMean: stats.elo,
            ema10: stats.ema,
            recentMeans: stats.windows,
            sourceEloSummary: data.elos,
            loading: data.loading ?? false,
            performance: performance(data.rows),
            playerPersona: data.mode === "mayhem" ? playerPersona(data.rows) : null,
          };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(
          () => {},
        );
      } catch {
        /* Optional browser feature. */
      }
    }
    return () => lifecycle.abort();
  }, []);
  useEffect(() => () => abort.current?.abort(), []);
  const shownSummaryLabel =
    data.mode === "mayhem"
      ? "海克斯大乱斗"
      : data.mode === "flex"
        ? "灵活"
        : data.mode === "aram"
          ? "大乱斗"
          : "单双";
  const stamp = new Date(data.fetchedAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const delta = stats.delta;
  return (
    <div className="app-shell" data-query-state={busy ? "loading" : error ? "error" : data.isSample ? "sample" : "ready"}>
      <header className="topbar">
        <a className="brand" href="#overview">
          <span className="brand-icon">
            <Crosshair size={24} />
          </span>
          <span>
            对局透镜<small>RIFT LENS</small>
          </span>
        </a>
        <nav>
          <a className="nav-active" href="#overview">
            {data.mode === "mayhem" ? "玩家画像" : "战绩分析"}
          </a>
          <a href="#data-notes">数据说明</a>
        </nav>
        <span className="space-label">
          <i />
          个人分析空间
        </span>
      </header>
      <main className="workspace" id="overview">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ARAM MAYHEM / MATCH INSIGHTS</p>
            <h1>{data.mode === "mayhem" ? "你的海斗玩家卡" : "战绩分析 · 看清对局表现"}</h1>
          </div>
          <span className="live-tag">
            <Activity size={15} />
            {data.mode === "mayhem" ? "看看你是哪一派" : "战绩分析看板"}
          </span>
        </div>
        <form
          className="querybar"
          onSubmit={(e) => {
            e.preventDefault();
            void query({ player, area, mode, count: Number(count) }).catch(() => {});
          }}
          aria-busy={busy}
        >
          <label htmlFor="riot-id" className="player-field">
            RIOT ID
            <div className="input-icon">
              <Search size={17} />
              <Input
                id="riot-id"
                value={player}
                disabled={busy}
                onChange={(e) => setPlayer(e.target.value)}
                aria-label="Riot ID"
                placeholder="召唤师名称#编号"
                maxLength={70}
              />
            </div>
          </label>
          <label htmlFor="region">
            大区
            <Select disabled={busy} value={area} onValueChange={(v) => v && setArea(v)}>
              <SelectTrigger id="region" aria-label="大区">
                <SelectValue>{area}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(AREAS).map((a) => (
                  <SelectItem value={a} key={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label htmlFor="mode">
            对局模式
            <Select disabled={busy} value={mode} onValueChange={(v) => v && setMode(v as Mode)}>
              <SelectTrigger id="mode" aria-label="对局模式">
                <SelectValue>{MODES[mode].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODES).map(([k, v]) => (
                  <SelectItem value={k} key={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label htmlFor="count">
            查询场次
            <Select disabled={busy} value={count} onValueChange={(v) => v && setCount(v)}>
              <SelectTrigger id="count" aria-label="查询场次">
                <SelectValue>最近 {count} 场</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["10", "20", "30"].map((v) => (
                  <SelectItem value={v} key={v}>
                    最近 {v} 场
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button type="submit" className="query-button" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}{" "}
            {busy ? "查询中…" : "查询战绩"}
          </Button>
        </form>
        {mode === "mayhem" && (
          <p className="mode-hint">
            <Info size={15} />
            海克斯大乱斗会从最近 30 场全部对局中筛选，最多展示所选场数。
          </p>
        )}
        <div aria-live="polite" aria-atomic="true">
          {busy ? (
            <div className="query-status">
              <LoaderCircle size={16} className="animate-spin" />
              <span>{status}{slow && <small className="slow-query">服务响应较慢，可以继续等待或取消；已取得的数据会保留。</small>}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => abort.current?.abort()}
              >
                取消
              </Button>
            </div>
          ) : error ? (
            <div className="query-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}{!receivedCurrent && <small>下方保留的是之前的{data.isSample ? "示例" : "结果"}，未作为本次查询更新。</small>}</span>
              {retryable && lastQuery && <Button type="button" size="sm" variant="outline" onClick={() => void query({ ...lastQuery, refresh: true }).catch(() => {})}>重试</Button>}
            </div>
          ) : status ? (
            <div className="query-status">
              <Activity size={16} />
              {status}
            </div>
          ) : null}
        </div>
        {busy && data.loading && (
          <div className="query-progress">
            <Progress
              value={data.rows.length ? ((data.loaded ?? 0) / data.rows.length) * 100 : 0}
              aria-label="单场详情加载进度"
            />
          </div>
        )}
        {data.isSample && <p className="sample-notice"><Info size={17} /><span><strong>示例预览</strong> 下方是历史样本。查询成功后才会替换成你的战绩。</span></p>}
        {busy && !receivedCurrent && !data.isSample && <p className="sample-notice">正在查询 {lastQuery?.player}；下方暂保留上次结果。</p>}
        <section className="profile">
          <div className="avatar">
            {data.player.slice(0, 1)}
            <span>LV. {fmt(data.level)}</span>
          </div>
          <div className="profile-main">
            <h2>
              {data.player.split("#")[0]}
              <small>#{data.player.split("#")[1]}</small>
            </h2>
            <p>
              {data.area}
              <span>·</span>
              {MODES[data.mode].label}
              {data.mode !== "mayhem" && (
                <span
                  className="rank-badge"
                  title={data.mode === "flex" ? "数据源最新灵活排位段位" : "数据源最新单双排位段位"}
                >
                  <Diamond size={14} />
                  {data.mode !== "ranked" && data.mode !== "flex" ? "单双段位 · " : ""}
                  {data.rank}
                  {data.lp !== null ? " · " + data.lp + " LP" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="snapshot">
            <span className="tiny-dot" />
            {data.isSample ? "示例采集于 " : data.loading ? "本次加载中 · " : "查询于 "}
            {stamp}
            <small>
              {data.mode === "mayhem"
                ? "最近 " + (data.scanned ?? 30) + " 场中 · 海克斯 " + data.rows.length + " 场"
                : "请求 " + data.requested + " 场 · 实际取得 " + data.rows.length + " 场"}
            </small>
          </div>
        </section>
        {!data.isSample && (
          <div className="cache-status">
            <span>
              {data.cache?.queryHit ? "查询缓存 · 1 分钟内" : "战绩列表已查询"} ·{" "}
              {data.cache?.detailHits
                ? data.cache.detailHits + " 场详情来自 6 小时内缓存"
                : data.loading
                  ? "单场详情逐步加载"
                  : "详情处理完成"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                void query({
                  player: data.player,
                  area: data.area,
                  mode: data.mode,
                  count: data.requested,
                  refresh: true,
                }).catch(() => {})
              }
            >
              更新数据
            </Button>
          </div>
        )}
        {data.mode === "mayhem" && <MayhemReportPanel data={data} onSelect={setSelected} blocked={busy || Boolean(error)} />}
        {data.mode === "mayhem" && <CompanionsPanel data={data} onSelect={setSelected} />}
        <OptionalAnalysis collapsed={data.mode === "mayhem"}>
          <section className="stats-grid">
            <article className="stat">
              <p>
                近期胜率
                <Swords size={17} />
              </p>
              <div className="stat-value mint">
                {fmt(stats.winrate)}
                <span>%</span>
              </div>
              <div className="win-segments">
                {[...data.rows].reverse().map((r) => (
                  <i
                    key={r.id}
                    title={r.win === null ? "未判定" : r.win ? "胜" : "负"}
                    className={r.win === null ? "unknown" : r.win ? "win" : "loss"}
                  />
                ))}
              </div>
              <small>
                {stats.wins} 胜 {stats.losses} 负
                {stats.unknown
                  ? " · " + stats.unknown + " 场未判定"
                  : " · 最近 " + data.rows.length + " 场"}
              </small>
            </article>
            <article className="stat">
              <p>
                整体 KDA
                <Crosshair size={17} />
              </p>
              <div className="stat-value">
                {fmt(stats.kda)}
                <span>: 1</span>
              </div>
              <div className="stat-foot">
                <b>{fmt(stats.kills)}</b> / {fmt(stats.deaths)} / <b>{fmt(stats.assists)}</b>
              </div>
              <small>场均击杀 / 死亡 / 助攻 · {stats.kdaCount} 场</small>
            </article>
            <article className="stat">
              <p>
                平均对局评分
                <Activity size={17} />
              </p>
              <div className="stat-value">
                {fmt(stats.score)}
                <span>分</span>
              </div>
              <div className="stat-foot">
                {data.rows.filter((r) => r.mvp).length} 次 MVP
                <span className="subtle">·</span>
                {data.rows.filter((r) => r.svp).length} 次 SVP
              </div>
              <small>数据源对局评分 · {stats.scoreCount} 场有值</small>
            </article>
            {data.mode === "mayhem" ? (
              <article className="stat">
                <p>
                  平均参团率
                  <Swords size={17} />
                </p>
                <div className="stat-value">
                  {fmt(performance(data.rows).participation.value)}
                  <span>%</span>
                </div>
                <div className="stat-foot">团战参与，不只看击杀</div>
                <small>
                  {performance(data.rows).participation.count}/{data.rows.length} 场有值 ·
                  数据源百分比
                </small>
              </article>
            ) : (
              <article className="stat">
                <p>
                  平均 Team ELO
                  <TrendingUp size={17} />
                </p>
                <div className="stat-value">{fmt(stats.elo)}</div>
                <div className="stat-foot">
                  <RankLabel value={stats.elo} />
                  {stats.elo === null && (
                    <span>
                      {stats.eloCount === 0
                        ? data.loading
                          ? "详情加载中…"
                          : "数据源未提供"
                        : "样本不满足同模式完整条件"}
                    </span>
                  )}
                </div>
                <small>
                  本人所在队伍 · {stats.eloCount}/{data.rows.length} 场有值
                </small>
              </article>
            )}
          </section>
          <PerformanceReview
            rows={data.rows}
            mayhem={data.mode === "mayhem"}
            onSelect={setSelected}
          />
          {data.mode === "mayhem" ? (
            <MayhemTrend data={data} />
          ) : (
            <section className="analysis-grid">
              <article className="panel trend-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">PERFORMANCE TREND</p>
                    <h3>{metric === "teamElo" ? "Team ELO 趋势" : "对局评分趋势"}</h3>
                  </div>
                  <div className="segmented" aria-label="趋势指标">
                    {(["teamElo", "score"] as const).map((key) => (
                      <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-pressed={metric === key}
                        onClick={() => setMetric(key)}
                      >
                        {key === "teamElo" ? "Team ELO" : "评分"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="chart-legends">
                  <span className="legend">
                    <i />
                    {metric === "teamElo" ? "本人所在队伍" : "单场评分"}
                  </span>
                  {metric === "teamElo" && stats.allComparable && (
                    <span className="legend ema-legend">
                      <i />
                      EMA 10
                    </span>
                  )}
                  <span>较早 → 最近</span>
                </div>
                <div className="chart-wrap">
                  <TrendChart data={stats.series} metric={metric} ema={stats.allComparable} />
                </div>
                <div className="trend-caption">
                  <span>
                    {delta !== null ? <ArrowUpRight size={16} /> : <Info size={16} />}{" "}
                    {delta === null
                      ? "暂不判断 ELO 趋势"
                      : delta > 0
                        ? "近期队伍 ELO 上行"
                        : delta < 0
                          ? "近期队伍 ELO 下行"
                          : "近期队伍 ELO 持平"}
                  </span>
                  <small>
                    {delta === null
                      ? "需连续 10 场同模式、且 ELO 完整的对局"
                      : "近 5 场较前 5 场平均值 " + (delta >= 0 ? "+" : "") + fmt(delta)}
                  </small>
                </div>
                <div className="rolling-stats">
                  {[5, 10, 20, 30].map((n) => (
                    <div key={n}>
                      <span>最近 {n} 场均值</span>
                      <strong>{fmt(stats.windows[n])}</strong>
                    </div>
                  ))}
                </div>
              </article>
              <aside className="panel elo-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">SOURCE SNAPSHOT</p>
                    <h3>数据源 ELO 摘要</h3>
                  </div>
                  <Info size={17} className="subtle" />
                </div>
                <p className="elo-label">
                  {shownSummaryLabel === "单双" ? "单双排位" : shownSummaryLabel}
                </p>
                <div className="elo-value">
                  {fmt(data.elos[shownSummaryLabel])}
                  <span>ELO</span>
                </div>
                <div className="summary-rank">
                  <RankLabel value={data.elos[shownSummaryLabel]} />
                  <a href="#elo-reference">
                    段位对照 <ChevronRight size={13} />
                  </a>
                </div>
                <div className="elo-other">
                  {["单双", "大乱斗", "灵活"]
                    .filter((k) => k !== shownSummaryLabel)
                    .map((k) => (
                      <span key={k}>
                        {k}
                        <b>{fmt(data.elos[k])}</b>
                        <RankLabel value={data.elos[k]} />
                      </span>
                    ))}
                </div>
                <p className="data-caution">
                  参考段位按原站分数对照表换算。摘要与单场 Team ELO 不同，都不能视为已验证的个人
                  MMR。
                </p>
                <div className="elo-range">
                  <span>
                    样本最高<b>{fmt(stats.max)}</b>
                  </span>
                  <span>
                    样本最低<b>{fmt(stats.min)}</b>
                  </span>
                  <span>
                    EMA 10<b>{fmt(stats.ema)}</b>
                  </span>
                </div>
              </aside>
            </section>
          )}
          <section className="panel hero-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CHAMPION POOL</p>
                <h3>英雄表现</h3>
              </div>
              <span className="subtle">按使用场次排序 · 本次样本</span>
            </div>
            <div className="hero-grid">
              {stats.heroes.map((h) => (
                <article className="hero-item" key={h.id}>
                  <div className="champion">
                    <ChampionIcon id={h.id} />
                    <div>
                      <strong>{h.name}</strong>
                      <small>
                        {h.count} 场 · 平均评分 {fmt(mean(h.score))}
                      </small>
                    </div>
                  </div>
                  <ChampionTags id={h.id} rows={data.rows} />
                  <div className="hero-win">
                    <span>
                      {h.wins} 胜 {h.losses} 负
                    </span>
                    <strong>
                      {h.wins + h.losses ? fmt((h.wins / (h.wins + h.losses)) * 100) + "%" : "—"}
                    </strong>
                  </div>
                  <div className="hero-bar" aria-hidden="true">
                    <i
                      style={{
                        width: (h.wins + h.losses ? (h.wins / (h.wins + h.losses)) * 100 : 0) + "%",
                      }}
                    />
                  </div>
                </article>
              ))}
              {!stats.heroes.length && <p className="empty-note">暂无英雄数据</p>}
            </div>
          </section>
        </OptionalAnalysis>
        <section
          className={"panel match-panel" + (data.mode === "mayhem" ? " casual-matches" : "")}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RECENT MATCHES</p>
              <h3>
                最近战绩<span className="count-badge">{data.rows.length}</span>
              </h3>
            </div>
            <div className="segmented" aria-label="战绩胜负筛选">
              {[
                ["all", "全部"],
                ["win", "胜利"],
                ["loss", "失败"],
              ].map(([value, label]) => (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <p className="list-hint">
            最新对局在前 · 点击查看详情<span>筛选仅作用于战绩列表</span>
          </p>
          <div className="match-list">
            {shown.map((r) => (
              <button
                type="button"
                onClick={() => setSelected(r)}
                aria-label={
                  r.champion +
                  " " +
                  r.date +
                  " " +
                  (r.win === null ? "未判定" : r.win ? "胜利" : "失败") +
                  " 详情"
                }
                className={
                  "match-row " + (r.win === null ? "is-unknown" : r.win ? "is-win" : "is-loss")
                }
                key={r.id}
              >
                <div className="champion">
                  <ChampionIcon id={r.championId} />
                  <div>
                    <strong>
                      {r.champion}
                      {r.mvp && <b className="award">MVP</b>}
                      {r.svp && <b className="award svp">SVP</b>}
                    </strong>
                    <small>
                      {r.queue} · {r.date.slice(0, 11)}
                    </small>
                  </div>
                </div>
                <div className="match-kda">
                  <strong>
                    {fmt(r.kills)} <span>/ {fmt(r.deaths)} /</span> {fmt(r.assists)}
                  </strong>
                  <small>
                    {r.detailState === "pending" ? "详情加载中…" : duration(r.duration)}
                  </small>
                </div>
                <div className="match-score">
                  <strong>
                    {data.mode === "mayhem"
                      ? championRoles(r.championId)
                          .map((role) => ROLE_INFO[role].label)
                          .join(" / ") || "待收录"
                      : fmt(r.score)}
                  </strong>
                  <small>{data.mode === "mayhem" ? "英雄定位" : "对局评分"}</small>
                </div>
                {data.mode !== "mayhem" && (
                  <div className="match-elo">
                    <strong>{fmt(r.teamElo)}</strong>
                    <small>Team ELO</small>
                    <RankLabel value={r.teamElo} />
                  </div>
                )}
                <span className={"result " + (r.win === null ? "unknown" : r.win ? "win" : "loss")}>
                  {r.win === null ? "未判定" : r.win ? "胜利" : "失败"}
                </span>
                <ChevronRight size={16} className="subtle" />
              </button>
            ))}
            {!shown.length && (
              <div className="empty-note">
                <Swords size={27} />
                <strong>
                  {data.rows.length ? "没有符合筛选的战绩" : "该模式暂无可展示的战绩"}
                </strong>
                <p>
                  {data.rows.length ? "切换到“全部”查看其他对局。" : "可更换模式或大区后重新查询。"}
                </p>
              </div>
            )}
          </div>
        </section>
        {data.mode !== "mayhem" && <EloReference />}
        <details className="source-disclosure" id="data-notes">
          <summary>
            画像与数据说明 <ChevronRight size={16} />
          </summary>
          <section className="source-notes">
            <Info size={18} />
            <div>
              <h3>读懂这些数字</h3>
              <p>
                Team ELO 是本人所在队伍的单场指标。均值和 EMA
                仅在样本属于同一模式且字段完整时计算；EMA 采用跨度
                10、最早样本初始化。“—”表示数据缺失、模式混合或场数不足。KDA =（总击杀 + 总助攻）÷
                max（总死亡，1）。
              </p>
              <p>
                战绩由第三方公开数据源提供，日期沿用来源，未补全年份。统计只覆盖当前返回的对局，不代表完整历史。
                {data.isSample
                  ? "当前展示采集于 " +
                    data.fetchedAt.slice(0, 10) +
                    " 的真实示例，点击查询可获取新结果。"
                  : ""}
              </p>
              <p>
                本页直接查询公开数据源，Riot ID 和大区会发送给该数据源。重复查询可复用 1
                分钟内的结果，成功取得的单场详情最多缓存 6
                小时。缓存可能提前失效；点击“更新数据”可跳过缓存。显示的查询时间保留原采集时间，单场详情标注各自采集时间。
              </p>
              <p id="mayhem-rules">
                玩家画像按本次海斗出场英雄的官方定位生成，双定位平分权重，至少识别 5
                场且覆盖八成样本才生成类型。海斗随机选人会影响画像，不代表操作水平。 趣味标签：至少
                5 场且英雄全不重复为“英雄不重样”；否则某英雄至少出场 3 次为“熟面孔搭子”；否则至少 7
                个英雄为“英雄体验家”。本批海斗最近连续获胜至少 3 场为“连胜好心情”，优先展示。
                表现标签至少需要 5 场且详情与指标完整：平均参团率 ≥ 70% 或平均助攻 ≥ 20，
                并且至少六成对局达到对应门槛。两项都满足时只保留相对门槛更突出的一项，
                连同英雄使用标签最多展示 3 个。这不是全服稀有度或实力评级。
                英雄卡始终展示官方定位；同一英雄少于 3 场时，只用“火力一刻”等词描述已取得的单场亮点。
                至少 3 场后才按场均伤害 5 万、助攻 20、参团率 70% 的门槛生成表现标签，
                同时要求六成对局达标，且详情完整。多个表现只选更突出的一项，出场至少 3 次可同时显示“常驻嘉宾”。

              </p>
              {data.warnings.map((w) => (
                <p key={w} className="source-warning">
                  {w}
                </p>
              ))}
            </div>
          </section>
        </details>
        <footer>
          <span className="brand-mini">
            <Crosshair size={16} />
            对局透镜
          </span>
          <p>每种玩法，都有自己的快乐。</p>
          <span>LOL MATCH ANALYTICS</span>
        </footer>
      </main>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="match-sheet">
          <SheetHeader>
            <p className="eyebrow">MATCH DETAILS</p>
            <SheetTitle>单场表现</SheetTitle>
            <SheetDescription>你的对局数据与双方 Team ELO</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="detail-body">
              <div className="detail-hero">
                <ChampionIcon id={selected.championId} />
                <div>
                  <h3>{selected.champion}</h3>
                  <p>
                    {positions[selected.position] ??
                      (selected.position && selected.position !== "Invalid"
                        ? selected.position
                        : "位置未提供")}
                  </p>
                </div>
                <span className={"result " + (selected.win ? "win" : "loss")}>
                  {selected.win === null ? "未判定" : selected.win ? "胜利" : "失败"}
                </span>
              </div>
              <div className="detail-meta">
                <span>
                  <Clock3 size={14} />
                  {selected.date}
                </span>
                <span>
                  {selected.queue} · {duration(selected.duration)}
                </span>
              </div>
              <div className="detail-kda">
                <span>K / D / A</span>
                <strong>
                  {fmt(selected.kills)} <i>/ {fmt(selected.deaths)} /</i> {fmt(selected.assists)}
                </strong>
              </div>
              <div className="detail-grid">
                <div>
                  <span>对局评分</span>
                  <strong>{fmt(selected.score)}</strong>
                </div>
                <div>
                  <span>获得金币</span>
                  <strong>{fmt(selected.gold)}</strong>
                </div>
                <div>
                  <span>造成伤害</span>
                  <strong>{fmt(selected.damage)}</strong>
                </div>
                <div>
                  <span>对局模式</span>
                  <strong className="detail-mode">{selected.mode}</strong>
                </div>
              </div>
              <div className="detail-grid detail-rates">
                {[
                  ["dpm", "每分钟伤害"],
                  ["gpm", "每分钟经济"],
                  ["participation", "参团率 (%)"],
                  ["deaths10", "每 10 分钟死亡"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>
                      {fmt(
                        performance([selected])[key as "dpm" | "gpm" | "participation" | "deaths10"]
                          .value,
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="team-compare">
                <h4>
                  <Target size={16} />
                  双方 Team ELO
                </h4>
                <div>
                  <span>
                    本人所在队伍
                    <strong className="mint">{fmt(selected.teamElo)}</strong>
                    <RankLabel value={selected.teamElo} />
                  </span>
                  <small>VS</small>
                  <span>
                    对方队伍<strong>{fmt(selected.opponentElo)}</strong>
                    <RankLabel value={selected.opponentElo} />
                  </span>
                </div>
              </div>
              <p className="detail-note">
                {selected.note ?? "队伍 ELO 来自该场详情，不等同于个人 MMR。"}{" "}
                {selected.detailsFetchedAt
                  ? "详情采集于 " +
                    new Date(selected.detailsFetchedAt).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                    }) +
                    "。"
                  : ""}{" "}
                日期按来源展示，未提供年份。
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
