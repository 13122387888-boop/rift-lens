const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const modules=new Map();
function load(file){
 const absolute=path.resolve(__dirname,'..',file);if(modules.has(absolute))return modules.get(absolute).exports;
 const m={exports:{}};modules.set(absolute,m);
 const compiled=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',compiled)(name=>name.endsWith('.json')?require(path.resolve(path.dirname(absolute),name)):name.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(absolute),name+'.ts'))):require(name),m,m.exports);return m.exports;
}
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('js-md5'),'utf8'),sandbox);
assert.equal(sandbox.window.md5('dld09o03u12d05o06dld'),require('node:crypto').createHash('md5').update('dld09o03u12d05o06dld').digest('hex'));
const {fetchQuery}=load('lib/query-client.ts');
const q={player:'static-test#123',area:'艾欧尼亚',mode:'mayhem',count:10};
const list={code:1,battleInfo:{nameInfoNew:q.player,areaId:1,openId:'target',level:100,mapOneInfoList:[]},data:[1,2].map(i=>({gameId:'test'+i,championId:'8',title:'海斗(独闯天涯)- 用时15分47秒',titleTime:'09-03 12:00:00',isWin:i}))};
const detail={code:1,data:{gameMode:'KIWI',teamDetails:[{teamId:100}],wgBattleDetailInfo:[{openIdNow:'target',teamId:100,scoreInfo:'4/8/32',scoreInfoNum:9.25,echartsMap:{goldEarned:15828,totalDamageDealt:60151,killAssisScore:73}}]}};
async function main(){
 const original=global.fetch;let requests=[],failMain=false,pendingDetails=false;
 global.fetch=async(url,options)=>{
  const u=new URL(url);requests.push(u);
  assert.equal(u.origin,'https://a.lzyumi.top');assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');assert.equal(options.headers.Cookie,undefined);assert.equal(options.method,undefined);
  if(u.pathname.endsWith('/getRankEloInfo'))return Response.json({code:1,data:{}});
  if(u.pathname.endsWith('/findOrderDetailInfoAll')){
   if(pendingDetails)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
   return Response.json(detail);
  }
  if(failMain)return Response.json({},{status:403});
  return Response.json(list);
 };
 try{
  const updates=[];const first=await fetchQuery(q,new AbortController().signal,r=>updates.push(r));
  assert.equal(updates[0].loading,true);assert.equal(updates[0].rows[0].detailState,'pending');assert.equal(updates.at(-1).loading,false);assert.equal(first.rows[0].participation,73);assert.equal(first.rows[0].teamElo,null);assert.equal(requests[0].searchParams.get('allCount'),'30');assert.equal(requests.length,4);
  const second=await fetchQuery(q,new AbortController().signal,()=>{});assert.equal(second.cache.queryHit,true);assert.equal(requests.length,4);
  await fetchQuery({...q,refresh:true},new AbortController().signal,()=>{});assert.equal(requests.length,8);
  failMain=true;await assert.rejects(()=>fetchQuery({...q,refresh:true},new AbortController().signal,()=>{}),/登录或验证/);assert.equal(requests.length,9);
  failMain=false;pendingDetails=true;const controller=new AbortController(),partial=[];const pending=fetchQuery({...q,refresh:true},controller.signal,r=>partial.push(r));await new Promise(setImmediate);controller.abort();await assert.rejects(()=>pending);assert.equal(partial.at(-1).loading,false);assert.equal(partial.at(-1).rows.every(r=>r.detailState==='unavailable'),true);
  global.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(()=>fetchQuery({...q,refresh:true},new AbortController().signal,()=>{}),/跨域策略/);
  console.log('PASS: browser-only MD5, public GET transport with omitted credentials, early list and progressive details, cache/refresh, authentication refusal without retries, abort recovery and CORS/network errors.');
 }finally{global.fetch=original;}
 if(process.argv.includes('--live')){
  const observed=[];
  global.fetch=async(url,options)=>{const response=await original(url,{...options,headers:{...options.headers,Origin:'https://13122387888-boop.github.io'}});const cors=response.headers.get('access-control-allow-origin');assert.ok(cors==='*'||cors==='https://13122387888-boop.github.io');observed.push({path:new URL(url).pathname,status:response.status,cors});return response;};
  try{
   const start=Date.now(),events=[];const data=await fetchQuery({player:'吃饱饱睡早早#13459',area:'艾欧尼亚',mode:'mayhem',count:10,refresh:true},AbortSignal.timeout(85000),s=>events.push({ms:Date.now()-start,loaded:s.loaded,loading:s.loading}));
   assert.equal(data.rows.length,10);assert.equal(data.rows.every(r=>r.detailState==='ready'),true);assert.equal(data.rows.every(r=>r.mode==='KIWI'),true);
   console.log(JSON.stringify({live:true,requests:observed.length,allCorsAllowed:true,rows:data.rows.length,detailReady:data.rows.filter(r=>r.detailState==='ready').length,firstMs:events[0].ms,totalMs:Date.now()-start},null,2));
  }finally{global.fetch=original;}
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
