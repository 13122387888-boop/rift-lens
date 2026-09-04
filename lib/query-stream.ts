import type { Match, Snapshot } from './model';
export type QueryEvent =
  | { type: 'snapshot' | 'complete'; data: Snapshot }
  | { type: 'summary'; elos: Record<string, number> }
  | {
      type: 'match';
      index: number;
      row: Match;
      loaded: number;
      detailHits: number;
    }
  | { type: 'error'; error: string };
export function applyEvent(
  current: Snapshot | null,
  event: QueryEvent,
): Snapshot {
  if (event.type === 'error') throw new Error(event.error);
  if (event.type === 'snapshot' || event.type === 'complete') return event.data;
  if (!current) throw new Error('未取得战绩列表，请重试。');
  if (event.type === 'summary') return { ...current, elos: event.elos };
  if (event.type === 'match') {
    if (current.rows[event.index]?.id !== event.row.id)
      throw new Error('详情与战绩不匹配。');
    const rows = current.rows.slice();
    rows[event.index] = event.row;
    return {
      ...current,
      rows,
      loaded: event.loaded,
      cache: { queryHit: false, detailHits: event.detailHits },
    };
  }
  throw new Error('未知查询消息。');
}
export async function readEvents(
  response: Response,
  onEvent: (event: QueryEvent) => void,
) {
  if (!response.body) throw new Error('查询结果为空，请重试。');
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = '',
    complete = false;
  const line = (value: string) => {
    if (!value.trim()) return;
    const event = JSON.parse(value) as QueryEvent;
    if (event.type === 'error') throw new Error(event.error);
    if (complete) throw new Error('查询完成后收到多余数据。');
    onEvent(event);
    if (event.type === 'complete') complete = true;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 2_000_000) throw new Error('查询响应过大。');
      let index: number;
      while ((index = buffer.indexOf('\n')) !== -1) {
        line(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    }
    buffer += decoder.decode();
    line(buffer);
    if (!complete) throw new Error('详情加载中断，已保留取得的战绩。');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
