const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const compiled={},modules={};
function load(file){
  if(modules[file])return modules[file].exports;
  const source=fs.readFileSync(path.join(__dirname,'..','lib',file.endsWith('.json')?file:file+'.ts'),'utf8');
  compiled[file]=file.endsWith('.json')?'module.exports = '+JSON.stringify(JSON.parse(source))+';':ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const module={exports:{}};modules[file]=module;
  new Function('require','module','exports',compiled[file])(name=>load(name.replace('./','')),module,module.exports);
  return module.exports;
}
const {mayhemReport,reportText}=load('mayhem-report'),{drawReport,CARD_WIDTH,CARD_HEIGHT}=load('report-image');
const fixture=require('../lib/mayhem-seed.json');
const report=mayhemReport(fixture);
const {playerPersona}=load('player-persona');
const catalog=require('../lib/champion-roles.json').champions;
const rowsFor=ids=>ids.map((championId,i)=>({...fixture.rows[i%fixture.rows.length],id:'role-'+i,championId,champion:catalog[championId]?.name??'未知英雄'}));
const fighter=playerPersona(rowsFor(Array(10).fill('24')));
assert.equal(fighter.kind,'single');assert.equal(fighter.label,'战士型玩家');
assert.equal(fighter.distribution.find(r=>r.key==='Fighter').percent,100);
const dual=playerPersona(rowsFor(Array(10).fill('420')));
assert.equal(dual.kind,'hybrid');assert.equal(dual.title,'双修快乐派');
assert.equal(dual.distribution.find(r=>r.key==='Fighter').percent,50);
assert.equal(dual.distribution.find(r=>r.key==='Tank').percent,50);
const mixed=playerPersona(rowsFor(['24','33','15','13','35','40']));
assert.equal(mixed.kind,'mixed');assert.equal(mixed.distribution.reduce((n,r)=>n+r.percent,0),100);
assert.equal(playerPersona(rowsFor(['24','24','24','24'])).kind,'insufficient');
assert.equal(playerPersona(rowsFor([...Array(7).fill('24'),...Array(3).fill('unknown')])).kind,'insufficient');
assert.equal(playerPersona(rowsFor([...Array(8).fill('24'),...Array(2).fill('unknown')])).label,'战士型玩家');
const unknown=playerPersona(rowsFor(Array(10).fill('unknown')));
assert.equal(unknown.classified,0);assert.equal(unknown.kind,'insufficient');assert.equal(unknown.heroes.length,0);
assert.equal(playerPersona([]).kind,'insufficient');
assert.equal(playerPersona([...rowsFor(Array(5).fill('24')),...rowsFor(Array(10).fill('13')).map(r=>({...r,mode:'ARAM',queue:'极地大乱斗'}))]).label,'战士型玩家');
const partial=playerPersona(rowsFor(Array(10).fill('24')).map(r=>({...r,detailState:'pending',participation:100,assists:99})));
assert.ok(partial.tags.every(t=>!['团战打卡人','助攻发射机'].includes(t.title)));
const emptyStats=playerPersona(rowsFor(Array(10).fill('24')).map(r=>({...r,participation:null,assists:null,win:null})));
assert.ok(emptyStats.tags.every(t=>!['团战打卡人','助攻发射机','连胜好心情'].includes(t.title)));
const streakRows=rowsFor(Array(5).fill('24')).map((r,i)=>({...r,win:i<3?true:null,participation:null,assists:null}));
assert.ok(playerPersona(streakRows).tags.some(t=>t.title==='连胜好心情'));
assert.ok(!playerPersona(streakRows.map((r,i)=>i===1?{...r,win:null}:r)).tags.some(t=>t.title==='连胜好心情'));
assert.equal(playerPersona(rowsFor(['24','13','33','15','35'])).tags[0].title,'英雄不重样');
assert.equal(report.rows.length,10);assert.equal(report.title,'团战常驻选手');
assert.equal(report.damageMatch.damage,97688);assert.equal(report.complete,true);
assert.equal(mayhemReport({...fixture,loading:true}).complete,false);
assert.equal(mayhemReport({...fixture,rows:fixture.rows.map(r=>({...r,detailState:'unavailable'}))}).complete,false);
assert.equal(mayhemReport({...fixture,rows:fixture.rows.slice(0,9)}).title,'海斗实战派');
const blank={...fixture.rows[0],participation:null,damage:null,kills:null,deaths:null,assists:null,score:null,win:null};
const missing=mayhemReport({...fixture,rows:Array.from({length:10},()=>blank)});
assert.equal(missing.title,'海斗实战派');assert.equal(missing.damageMatch,null);assert.equal(missing.stats.winrate,null);
assert.equal(mayhemReport({...fixture,rows:[...fixture.rows,{...fixture.rows[0],mode:'ARAM',queue:'极地大乱斗'}]}).rows.length,10);
const same=fixture.rows.map((r,i)=>({...r,participation:70,damage:10000,id:String(i)}));
assert.equal(mayhemReport({...fixture,rows:same}).damageMatch.id,'0');
const text=reportText(fixture,report,'overview',true,report.damageMatch);
assert.equal(text.includes(fixture.player),false);assert.equal(text.includes(fixture.player.split('#')[0]),false);assert.ok(text.includes('神秘海斗玩家'));
function context(){
  const calls=[];
  return {calls,createLinearGradient:()=>({addColorStop(){}}),fillRect(){},measureText(value){return {width:value.length*20};},fillText(value,x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<CARD_WIDTH&&y<CARD_HEIGHT);calls.push(value);}};
}
for(const style of ['overview','highlight']){
  const ctx=context();drawReport(ctx,{data:fixture,report,style,hideName:true,highlight:report.damageMatch,highlightLabel:'本次样本 · 单场伤害最高'});
  const drawn=ctx.calls.join('\n');assert.ok(drawn.includes('神秘海斗玩家'));assert.equal(drawn.includes(fixture.player.split('#')[0]),false);assert.ok(drawn.includes('非段位 / 全服排名'));assert.ok(drawn.includes('真实样本'));
  if(style==='overview'){for(const tag of report.persona.tags)assert.ok(drawn.includes(tag.title));assert.ok(drawn.includes(report.persona.title));assert.ok(drawn.includes(report.persona.label));assert.equal(drawn.includes('每分钟伤害'),false);assert.equal(drawn.includes('整体 KDA'),false);}
}
console.log('PASS: official champion tags, dual-role splitting, percentages sum to 100, mixed/insufficient/unknown coverage, mode isolation, missing-detail badge gates, streak boundaries and persona PNG text.');
console.log('PASS: observed mayhem sample, evidence-bound titles, insufficient/partial/mixed data, highlight selection and tie order, private-name text/image exports, both drawing paths.');
// Optional development-only bundle, used to render the actual export code with
// a native Canvas implementation outside the browser. No extra site dependency.
if(process.argv[2]){
  const bundle=`const sources=${JSON.stringify(compiled)};const modules={};function load(name){if(modules[name])return modules[name].exports;const m={exports:{}};modules[name]=m;new Function('require','module','exports',sources[name])(p=>load(p.replace('./','')),m,m.exports);return m.exports;}return {report:load('mayhem-report'),image:load('report-image')};`;
  fs.writeFileSync(path.resolve(process.argv[2]),bundle);
}
