const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),modules=new Map();
function load(file){const p=path.join(root,'lib',file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(p,'utf8'));if(modules.has(p))return modules.get(p).exports;const m={exports:{}};modules.set(p,m);const code=ts.transpileModule(fs.readFileSync(p+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(n=>n.startsWith('.')?load(n.slice(2)):require(n),m,m.exports);return m.exports;}
const {normalizeMatch}=load('upstream'),{companions}=load('companions'),{championPortraitPath,loadChampionPortrait}=load('champion-image');
const fixture=require('../lib/mayhem-seed.json'),base=fixture.rows[0];
const roster=Array.from({length:10},(_,i)=>({openIdNow:'source-'+i,nickNameStr:'player-'+i+'#100',teamId:i<5?100:200,translateAreaId:1,detailChampionId:'24',scoreInfo:'1/2/3'}));
const detail={data:{gameMode:'KIWI',wgBattleDetailInfo:roster}};
const match={gameId:'game-a',championId:'24',title:'海斗- 用时10分00秒',isWin:1};
const normalized=normalizeMatch(match,detail,'source-0','player-0#100');
assert.equal(normalized.teammates.length,4);assert.ok(normalized.teammates.every(p=>!p.id.includes('source-')));
assert.deepEqual(normalized.teammates.map(p=>p.name),roster.slice(1,5).map(p=>p.nickNameStr));
assert.equal(normalizeMatch(match,{data:{...detail.data,wgBattleDetailInfo:roster.slice(0,9)}},'source-0','player-0#100').teammates,undefined);
assert.equal(normalizeMatch(match,{data:{...detail.data,wgBattleDetailInfo:roster.map((r,i)=>i===9?{...r,openIdNow:'source-1'}:r)}},'source-0','player-0#100').teammates,undefined);
assert.equal(normalizeMatch(match,detail,'no-match','unknown').teammates,undefined);
const peer=normalized.teammates[0],r1={...base,id:'one',win:true,teammates:[peer,peer]},r2={...base,id:'two',win:false,teammates:[peer]},r3={...base,id:'three',win:null,teammates:[peer]};
const result=companions([r1,r1,r2,r3,{...r1,id:'other-mode',mode:'ARAM',queue:'极地大乱斗'},{...base,id:'unread',teammates:undefined}]);
assert.equal(result.total,4);assert.equal(result.covered,3);assert.equal(result.people.length,1);assert.equal(result.people[0].matches.length,3);assert.equal(result.people[0].wins,1);assert.equal(result.people[0].losses,1);assert.equal(result.people[0].unknown,1);
assert.equal(companions([r1]).people.length,0);assert.deepEqual(companions([]),{covered:0,total:0,people:[]});
assert.equal(championPortraitPath('../secret'),null);assert.equal(championPortraitPath('999999'),null);
for(const id of Object.keys(require('../lib/champion-roles.json').champions)){const file=path.join(root,'public/champions',id+'.png');assert.ok(fs.statSync(file).size>0);}
async function main(){
 const OriginalImage=global.Image;let created=0,fail=false;
 global.Image=class {constructor(){created++;}set src(value){assert.match(value,/^\.\/champions\/\d+\.png$/);assert.equal(this.crossOrigin,'anonymous');queueMicrotask(()=>fail?this.onerror?.():this.onload?.());}};
 try{const first=loadChampionPortrait('420'),again=loadChampionPortrait('420');assert.equal(first,again);assert.ok(await first);assert.equal(created,1);fail=true;assert.equal(await loadChampionPortrait('24'),null);assert.equal(await loadChampionPortrait('24'),null);assert.equal(created,3);assert.equal(await loadChampionPortrait('../bad'),null);}finally{global.Image=OriginalImage;}
 console.log('PASS: self/enemy exclusion, complete roster requirement, stable private keys, duplicate game/player defense, shared outcomes, unknown results, minimum co-play, local portrait coverage and load/cache/fallback.');
 if(process.argv.includes('--enrich-sample')){
  const observedFile=path.resolve(root,'../roster-observed.json'),observed=JSON.parse(fs.readFileSync(observedFile,'utf8'));let added=0;
  for(const record of observed.records){const row=fixture.rows.find(r=>r.id===record.id);if(!row)continue;const data=normalizeMatch({gameId:row.id,championId:row.championId},record.detail,observed.openId,observed.player);if(data.teammates){row.teammates=data.teammates;row.teammatesFetchedAt=data.teammatesFetchedAt;added++;}}
  fs.writeFileSync(path.join(root,'lib/mayhem-seed.json'),JSON.stringify(fixture,null,2)+'\n');
  const report=companions(fixture.rows);console.log(JSON.stringify({added,covered:report.covered,repeatTeammates:report.people.length,sharedGames:report.people.map(p=>p.matches.length)}));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
