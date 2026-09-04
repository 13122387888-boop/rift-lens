import { isMayhemMatch, type Match, type Teammate } from "./model";

export type Companion = Teammate & {
  matches: Match[];
  wins: number;
  losses: number;
  unknown: number;
};
export function companions(input: Match[]) {
  const rows = input.filter(isMayhemMatch);
  const seenGames = new Set<string>();
  const people = new Map<string, Companion>();
  let covered = 0;
  for (const row of rows) {
    if (seenGames.has(row.id)) continue;
    seenGames.add(row.id);
    if (!Array.isArray(row.teammates)) continue;
    covered++;
    const seenPeople = new Set<string>();
    for (const player of row.teammates) {
      if (!player.id || !player.name || seenPeople.has(player.id)) continue;
      seenPeople.add(player.id);
      let buddy = people.get(player.id);
      if (!buddy) {
        buddy = { ...player, matches: [], wins: 0, losses: 0, unknown: 0 };
        people.set(player.id, buddy);
      }
      buddy.matches.push(row);
      if (row.win === true) buddy.wins++;
      else if (row.win === false) buddy.losses++;
      else buddy.unknown++;
    }
  }
  return {
    covered,
    total: seenGames.size,
    people: [...people.values()]
      .filter((p) => p.matches.length >= 2)
      .sort((a, b) => b.matches.length - a.matches.length),
  };
}
