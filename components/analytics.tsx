/* oxlint-disable next/no-img-element -- Standalone static Vite app uses native images. */
'use client';
import { useState } from 'react';
import {
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Crosshair } from 'lucide-react';
import type { Match } from '@/lib/model';
import { RankLabel } from '@/components/elo-reference';
export function ChampionIcon({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  return failed || !/^\d+$/.test(id) ? (
    <span className="champion-placeholder">
      <Crosshair size={23} />
    </span>
  ) : (
    <img
      width={43}
      height={43}
      src={
        'https://wegame.gtimg.com/g.26-r.c2d3c/helper/lol/assis/images/resources/champions/' +
        id +
        '.png'
      }
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
export function TrendChart({
  data,
  metric,
  ema,
}: {
  data: (Match & { index: number; ema: number | null })[];
  metric: 'teamElo' | 'score';
  ema: boolean;
}) {
  const color = metric === 'teamElo' ? '#38dec9' : '#a5a8ff';
  if (!data.some((r) => r[metric] !== null))
    return (
      <div className="chart-empty">
        <Crosshair size={30} />
        <strong>
          这些对局暂未提供{metric === 'teamElo' ? ' Team ELO' : '评分'}
        </strong>
        <p>仍可查看胜负和逐场战绩，缺失值不参与计算。</p>
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 14, bottom: 0, left: -12 }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.23} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#263241"
          strokeDasharray="3 5"
        />
        <XAxis
          dataKey="index"
          tick={{ fill: '#96a6b8', fontSize: 12 }}
          minTickGap={22}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => '第' + v + '场'}
        />
        <YAxis
          domain={
            metric === 'teamElo'
              ? ['dataMin - 150', 'dataMax + 150']
              : [0, 'auto']
          }
          tick={{ fill: '#96a6b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            const r = payload?.[0]?.payload as
              | (Match & { ema: number | null; index: number })
              | undefined;
            return active && r ? (
              <div className="chart-tooltip">
                <strong>
                  第 {r.index} 场 · {r.champion}
                </strong>
                <p>
                  {r.date} ·{' '}
                  {r.win === true
                    ? '胜利'
                    : r.win === false
                      ? '失败'
                      : '未判定'}
                </p>
                <span>
                  {metric === 'teamElo' ? 'Team ELO' : '评分'}
                  <b>
                    {r[metric]?.toLocaleString('zh-CN', {
                      maximumFractionDigits: 1,
                    }) ?? '—'}
                  </b>
                </span>
                {metric === 'teamElo' && <RankLabel value={r.teamElo} />}
                {metric === 'teamElo' && r.ema !== null && (
                  <span>
                    EMA 10<b>{r.ema.toFixed(1)}</b>
                  </span>
                )}
              </div>
            ) : null;
          }}
        />
        <Area
          name={metric === 'teamElo' ? 'Team ELO' : '对局评分'}
          type="linear"
          dataKey={metric}
          stroke={color}
          strokeWidth={2.5}
          fill="url(#trend-fill)"
          connectNulls={false}
          dot={{ r: 3, fill: color, stroke: '#121b26', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
        {metric === 'teamElo' && ema && (
          <Line
            name="EMA 10"
            dataKey="ema"
            stroke="#8d93ff"
            strokeWidth={1.8}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
