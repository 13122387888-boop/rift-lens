import { validateQuery, type Query, type Snapshot } from './model';
import { queryUpstream } from './upstream';
import { applyEvent } from './query-stream';
// GitHub Pages serves only static files. All requests use the source's
// existing public CORS API, without proxying or attaching cookies.
export async function fetchQuery(input:Query,signal:AbortSignal,onSnapshot:(data:Snapshot)=>void):Promise<Snapshot>{
  const q=validateQuery(input);let current:Snapshot|null=null;
  try {
    return await queryUpstream(q,signal,event=>{
      const data=applyEvent(current,event);
      if(!Array.isArray(data.rows)||data.player!==q.player||data.area!==q.area||data.mode!==q.mode||data.requested!==q.count)throw new Error('查询结果与条件不匹配。');
      current=data;onSnapshot(data);
    });
  }catch(error){
    const partial=current as Snapshot|null;
    if(partial?.loading)onSnapshot({...partial,loading:false,rows:partial.rows.map(r=>r.detailState==='pending'?{...r,detailState:'unavailable',note:'加载中断，尚未取得此场详情。'}:r),warnings:[...partial.warnings,'本次详情加载中断，仅统计已取得的数据，可点击更新数据重试。']});
    if(error instanceof TypeError)throw new Error('暂时无法连接数据源，请检查网络后重试；数据源跨域策略变化也可能影响查询。');
    throw error;
  }
}
