'use client';
import { Diamond, ExternalLink } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { ELO_TIERS, ELO_DIVISIONS, eloRank } from '@/lib/elo-rank';

export function RankLabel({ value }: { value: number | null | undefined }) {
  const rank = eloRank(value);
  return rank ? (
    <span
      className="elo-rank-label"
      title="按 lzyumi 原站对照表换算，仅作数值参考，不是个人实际段位"
    >
      参考 {rank}
    </span>
  ) : null;
}
export function EloReference() {
  return (
    <section className="panel rank-reference" id="elo-reference">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ELO REFERENCE</p>
          <h3>
            <Diamond size={18} />
            ELO 分数与段位参考
          </h3>
        </div>
        <a
          className="reference-source"
          href="https://a.lzyumi.top/"
          target="_blank"
          rel="noreferrer"
        >
          lzyumi 原站对照表
          <ExternalLink size={13} />
        </a>
      </div>
      <p className="reference-intro">
        原站把分数每 100 分划为一个小段位。这里沿用其参考尺度，不代表 Riot 官方
        MMR，也不改变玩家的实际段位。
      </p>
      <div className="reference-table">
        <Table>
          <TableCaption>
            表中数字为各档起点，包含起点、不包含下一档起点。原表对 2800
            及以上统一标为“大师及以上”，未区分宗师、王者，也不换算 LP。
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">段位</TableHead>
              {ELO_DIVISIONS.map((d) => (
                <TableHead scope="col" key={d}>
                  {d} 档起点
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ELO_TIERS.map((tier, i) => (
              <TableRow key={tier}>
                <TableHead scope="row">{tier}</TableHead>
                {ELO_DIVISIONS.map((d, j) => (
                  <TableCell key={d}>{i * 400 + j * 100}</TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableHead scope="row">大师及以上</TableHead>
              <TableCell colSpan={4}>≥ 2800</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
