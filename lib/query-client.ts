import { validateQuery, type Query, type Snapshot } from './model';
import { queryUpstream } from './upstream';
import { applyEvent } from './query-stream';
import { abortScope } from './request';
// GitHub Pages serves only static files. All requests use the source's
// existing public CORS API, without proxying or attaching cookies.
export async function fetchQuery(input:Query,signal:AbortSignal,onSnapshot:(data:Snapshot)=>void):Promise<Snapshot>{
  const q=validateQuery(input);let current:Snapshot|null=null;
  const scope=abortScope(signal,92000);
  try {
    return await queryUpstream(q,scope.signal,event=>{
      const data=applyEvent(current,event);
      if(!Array.isArray(data.rows)||data.player!==q.player||data.area!==q.area||data.mode!==q.mode||data.requested!==q.count)throw new Error('查询结果与条件不匹配。');
      current=data;onSnapshot(data);
    });
  }catch(error){
    const partial=current as Snapshot|null;
    if(partial?.loading)onSnapshot({...partial,loading:false,rows:partial.rows.map(r=>r.detailState==='pending'?{...r,detailState:'unavailable',note:'加载中断，尚未取得此场详情。'}:r),warnings:[...partial.warnings,'本次详情加载中断，仅统计已取得的数据，可点击更新数据重试。']});
    if(scope.signal.aborted && !signal.aborted) throw new Error('查询时间较长，已停止等待；已取得的战绩会保留，请稍后更新。');
    if(error instanceof TypeError)throw new Error('暂时无法连接数据源，请检查网络后重试；服务暂时异常时也会出现此提示。');
    throw error;
  } finally { scope.dispose(); }
}
