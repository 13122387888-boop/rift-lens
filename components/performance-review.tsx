'use client';
import { Activity, ArrowUpRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChampionIcon } from './analytics';
import { METRICS, performance, comparePerformance } from '@/lib/performance';
import type { Match } from '@/lib/model';
const number = (value: number | null, digits = 1) =>
  value === null
    ? '—'
    : value.toLocaleString('zh-CN', { maximumFractionDigits: digits });
export function PerformanceReview({
  rows,
  mayhem,
  onSelect,
}: {
  rows: Match[];
  mayhem: boolean;
  onSelect: (match: Match) => void;
}) {
  const overall = performance(rows),
    comparison = comparePerformance(rows);
  const mixed = new Set(rows.map((r) => r.queue + '/' + r.mode)).size > 1;
  const pending = rows.some((r) => r.detailState === 'pending');
  const changes = comparison.metrics.filter((m) => m.delta !== null);
  const insight = changes
    .filter((m) => ['dpm', 'deaths10'].includes(m.key))
    .map(
      (m) =>
        `${m.label}${m.delta === 0 ? '持平' : (m.delta! > 0 ? '增加 ' : '减少 ') + number(Math.abs(m.delta!), m.digits) + m.unit}`,
    )
    .join('；');
  return (
    <section className="panel performance-panel" id="performance">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {mayhem ? 'ARAM MAYHEM' : 'MATCH PERFORMANCE'} / REVIEW
          </p>
          <h3>{mayhem ? '海斗表现复盘' : '对局表现复盘'}</h3>
        </div>
        <span className="review-scope">
          <Activity size={15} />
          {rows.length} 场样本{pending ? ' · 详情补齐中' : ''}
        </span>
      </div>
      <div className="performance-cards">
        {METRICS.slice(0, 4).map((m) => (
          <article key={m.key} title={m.formula}>
            <span>{m.label}</span>
            <strong>
              {number(overall[m.key].value, m.digits)}
              <small>{m.unit}</small>
            </strong>
            <p>
              {overall[m.key].count}/{rows.length} 场有值
            </p>
          </article>
        ))}
      </div>
      {mixed && !pending && (
        <p className="review-note">
          <Info size={14} />
          当前汇总包含不同模式，请切换单一模式解读表现。
        </p>
      )}
      <div className="comparison-heading">
        <div>
          <h4>最近 5 场 vs 此前 5 场</h4>
          <p>仅对比连续 10 场同模式、两组各 5 场数据完整的指标。</p>
        </div>
        <div className="comparison-legend">
          <span className="prior-key">此前 5 场</span>
          <span className="recent-key">最近 5 场</span>
        </div>
      </div>
      {rows.length < 10 || pending || !comparison.sameMode ? (
        <p className="review-empty">
          <Info size={17} />
          {pending
            ? '正在补齐单场详情，完成后生成前后对比。'
            : rows.length < 10
              ? `当前有 ${rows.length} 场，还需要 ${10 - rows.length} 场才能进行前后对比。`
              : '最近 10 场包含不同模式，暂不比较。请选择单一模式查询。'}
        </p>
      ) : (
        <>
          <div className="comparison-grid">
            {comparison.metrics.map((m) => {
              const max = Math.max(m.recent.value ?? 0, m.prior.value ?? 0, 1);
              return (
                <article className="comparison-metric" key={m.key}>
                  <div>
                    <h5>{m.label}</h5>
                    <span
                      className={
                        m.delta === null ? 'subtle' : 'comparison-change'
                      }
                    >
                      {m.delta === null
                        ? `有效 ${m.prior.count}/5 · ${m.recent.count}/5`
                        : (m.delta > 0 ? '+' : '') +
                          number(m.delta, m.digits) +
                          (['participation', 'winrate'].includes(m.key)
                            ? ' 个百分点'
                            : m.unit)}
                    </span>
                  </div>
                  {m.delta === null ? (
                    <p className="comparison-missing">数据不完整，暂不比较</p>
                  ) : (
                    <div className="comparison-bars">
                      {[
                        { name: '此前', metric: m.prior, cls: 'prior' },
                        { name: '最近', metric: m.recent, cls: 'recent' },
                      ].map((v) => (
                        <div key={v.cls}>
                          <span>{v.name}</span>
                          <div className="bar-track" aria-hidden="true">
                            <i
                              className={v.cls}
                              style={{
                                width: `${(v.metric.value! / max) * 100}%`,
                              }}
                            />
                          </div>
                          <strong>
                            {number(v.metric.value, m.digits)}
                            {m.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className="review-insight">
            <ArrowUpRight size={17} />
            <span>
              {insight
                ? `最近 5 场较此前 5 场：${insight}。`
                : '完整指标已列在上方。'}{' '}
              英雄、阵容与对局时长不同，变化不等同于实力升降。
            </span>
          </p>
        </>
      )}
      {comparison.sameMode && !pending && (
        <div className="comparison-evidence">
          {[
            { label: '最近 5 场', rows: comparison.latest },
            { label: '此前 5 场', rows: comparison.previous },
          ].map((group) => (
            <div key={group.label}>
              <span>
                {group.label}
                <small>点击查看依据</small>
              </span>
              <div>
                {group.rows.map((r) => (
                  <Button
                    key={r.id}
                    variant="ghost"
                    className="evidence-match"
                    onClick={() => onSelect(r)}
                    aria-label={`${group.label} ${r.date} ${r.champion} 单场详情`}
                  >
                    <ChampionIcon id={r.championId} />
                    <span>
                      {r.champion}
                      <small>
                        {r.date.slice(0, 5)} ·{' '}
                        {r.win === null ? '未知' : r.win ? '胜' : '负'}
                      </small>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="review-formula">
        伤害 / 经济按有效场次总量 ÷ 总分钟数计算；死亡频率按每 10
        分钟计算。参团率取数据源单场百分比均值，缺失值不计为 0。
      </p>
    </section>
  );
}
