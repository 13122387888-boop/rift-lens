export class QueryError extends Error {
  constructor(message: string, public readonly kind: "auth" | "rate" | "service" | "data") {
    super(message);
    this.name = "QueryError";
  }
}
export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason ?? new DOMException("已取消", "AbortError");
}
// Avoid requiring newer AbortSignal.any/timeout APIs in embedded mobile browsers.
export function abortScope(parent: AbortSignal, timeoutMs?: number) {
  const controller = new AbortController();
  const forward = () => controller.abort(parent.reason ?? new DOMException("已取消", "AbortError"));
  if (parent.aborted) forward();
  else parent.addEventListener("abort", forward, { once: true });
  const timer = timeoutMs === undefined ? undefined : setTimeout(
    () => controller.abort(new DOMException("查询超时，请稍后重试。", "TimeoutError")), timeoutMs,
  );
  return {
    signal: controller.signal,
    abort: (reason?: unknown) => controller.abort(reason),
    dispose: () => { clearTimeout(timer); parent.removeEventListener("abort", forward); },
  };
}
