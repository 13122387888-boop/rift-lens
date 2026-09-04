"use client";
import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import { companions } from "@/lib/companions";
import type { Match, Snapshot } from "@/lib/model";
import { ChampionIcon } from "./analytics";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

export function CompanionsPanel({
  data,
  onSelect,
}: {
  data: Snapshot;
  onSelect: (row: Match) => void;
}) {
  const report = useMemo(() => companions(data.rows), [data.rows]);
  const [hideNames, setHideNames] = useState(false),
    [showAll, setShowAll] = useState(false);
  const visible = showAll ? report.people : report.people.slice(0, 6);
  return (
    <section className="companions-panel" id="companions">
      <div className="companions-heading">
        <div>
          <p className="eyebrow">GOOD COMPANY / GOOD GAMES</p>
          <h2>
            <Users size={23} />
            开黑小伙伴
          </h2>
          <p>一起出现过的熟面孔，值得有个位置。</p>
        </div>
        <label className="companions-privacy">
          <Switch checked={hideNames} onCheckedChange={setHideNames} aria-label="隐藏小伙伴昵称" />
          隐藏昵称
        </label>
      </div>
      {report.people.length > 0 ? (
        <>
          <div className="companion-grid">
            {visible.map((person, index) => {
              const name = hideNames ? "神秘搭子 " + (index + 1) : person.name.split("#")[0];
              return (
                <details className="companion-card" key={person.id}>
                  <summary>
                    <span className="companion-avatar">
                      <ChampionIcon id={person.championId} />
                    </span>
                    <span className="companion-name">
                      <strong>{name}</strong>
                      <small>
                        {index === 0 ? "本次最常同队" : "同队熟面孔"}
                        {!hideNames && person.name.includes("#")
                          ? " · #" + person.name.split("#")[1]
                          : ""}
                      </small>
                    </span>
                    <ChevronDown size={16} aria-hidden="true" />
                    <span className="companion-record">
                      <b>并肩 {person.matches.length} 场</b>
                      <span>
                        一起拿下 {person.wins} 胜 · {person.losses} 负
                        {person.unknown ? " · " + person.unknown + " 场未判定" : ""}
                      </span>
                    </span>
                    <span className="companion-open-hint">看看一起打过的对局</span>
                  </summary>
                  <div className="companion-games">
                    {person.matches.map((row) => (
                      <button type="button" key={row.id} onClick={() => onSelect(row)}>
                        <span>
                          {row.date}
                          <small>你使用 {row.champion}</small>
                        </span>
                        <b className={row.win === true ? "mint" : ""}>
                          {row.win === true ? "胜利" : row.win === false ? "失败" : "未判定"}
                        </b>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
          {report.people.length > 6 && (
            <Button variant="ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? "收起小伙伴" : "查看全部 " + report.people.length + " 位小伙伴"}
            </Button>
          )}
        </>
      ) : (
        <div className="companions-empty">
          <Users size={28} />
          <strong>
            {data.loading
              ? "正在找找你的同队熟面孔…"
              : report.covered === 0
                ? "查一查战绩，看看最近和谁并肩。"
                : "这批对局里，还没遇到重复同队的小伙伴。"}
          </strong>
          <p>
            {report.covered === 0
              ? "取得同队名单后，这里会自动整理至少两次同队的玩家。"
              : "可以试试最近 20 场或 30 场，看看有没有熟悉的名字。"}
          </p>
        </div>
      )}
      <p className="companions-note">
        已取得 {report.covered}/{report.total} 场同队名单 · 至少两次同队才会出现。
        <br />
        这是同队记录，不等于已确认的组队关系。
      </p>
    </section>
  );
}
