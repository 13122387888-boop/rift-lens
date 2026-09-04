"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Swords,
  Shield,
  Crosshair,
  WandSparkles,
  Zap,
  HeartHandshake,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { ChampionIcon } from "./analytics";
import { ROLE_SOURCE, championTags, type ChampionTag, type PlayerPersona } from "@/lib/player-persona";

import type { Match } from "@/lib/model";

export function ChampionTags({ id, rows, tags }: { id?: string; rows?: Match[]; tags?: ChampionTag[] }) {
  const labels = tags ?? championTags(id ?? "", rows ?? []);
  return <span className="champion-tags">{labels.map((tag) => <span key={tag.label} className={"champion-tag " + tag.kind} title={tag.evidence} style={{ "--tag-color": tag.color } as CSSProperties}>{tag.label}</span>)}</span>;
}

const icons = {
  Fighter: Swords,
  Tank: Shield,
  Marksman: Crosshair,
  Mage: WandSparkles,
  Assassin: Zap,
  Support: HeartHandshake,
};
export function PersonaDetails({ persona }: { persona: PlayerPersona }) {
  return (
    <div className="persona-details">
      <div className="persona-role-heading">
        <span>你的英雄口味</span>
        <small>本次出场定位</small>
      </div>
      <div className="persona-roles">
        {persona.distribution.map((role) => {
          const Icon = icons[role.key];
          return (
            <div
              className="persona-role"
              key={role.key}
              style={{ "--role-color": role.color } as CSSProperties}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{role.label}</span>
              <div className="persona-meter" aria-hidden="true">
                <i style={{ width: role.percent + "%" }} />
              </div>
              <b>{persona.classified ? role.percent + "%" : "—"}</b>
            </div>
          );
        })}
      </div>
      <details className="persona-explainer">
        <summary>
          这个画像是怎么来的？ <ChevronDown size={14} />
        </summary>
        <p>{persona.evidence}</p>
        <p>
          英雄定位已识别 {persona.classified}/{persona.rows.length}{" "}
          场。双定位英雄各计一半，未知英雄不参与占比；这不是操作评分。海斗随机选人也会影响这批画像。
        </p>
        <p>
          至少识别 5 场、且覆盖八成对局后生成类型。第一定位占三成以上并领先第二定位至少 10
          个百分点时归为单一类型；否则前两类合计至少六成、第二类至少两成时为双修；其余为多面型。
        </p>
        <a href={ROLE_SOURCE.url} target="_blank" rel="noreferrer">
          英雄定位来源 · Riot Data Dragon {ROLE_SOURCE.version}
        </a>
      </details>
      {persona.heroes.length > 0 && (
        <>
          <div className="persona-role-heading">
            <span>常选的英雄</span>
            <small>本次出场最多</small>
          </div>
          <div className="persona-heroes">
            {persona.heroes.map((hero) => (
              <div key={hero.id}>
                <ChampionIcon id={hero.id} />
                <div className="persona-hero-name"><strong>{hero.name}</strong><small>本次出场 {hero.count} 场</small></div>
                <ChampionTags tags={hero.tags} />
              </div>
            ))}
          </div>
        </>
      )}
      {persona.tags.length > 0 && (
        <div className="persona-tags">
          {persona.tags.map((tag) => (
            <details key={tag.title}>
              <summary>
                <Sparkles size={13} aria-hidden="true" />
                {tag.title}
              </summary>
              <p>{tag.evidence}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function OptionalAnalysis({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <details className="optional-analysis" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>
          <b>想再多看一点？</b>
          <small>胜率、伤害、趋势和详细复盘都在这里</small>
        </span>
        <ChevronDown size={20} />
      </summary>
      {open && <div className="optional-analysis-content">{children}</div>}
    </details>
  );
}
