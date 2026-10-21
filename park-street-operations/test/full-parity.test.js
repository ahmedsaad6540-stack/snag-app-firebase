'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PARK_ITEMS,PARK_SECTORS,PARK_BY_KEY}=require('../src/catalog');
const {RESTROOMS,COMPONENTS,RESTROOM_BY_KEY,COMPONENT_BY_CODE}=require('../src/restroomCatalog');
const {normalizeInspection,normalizeRestroom,normalizeEntity,validateFileIds}=require('../src/operationsDomain');
const {memoryOperationsRepo,deterministic}=require('../src/operationsRepo');
const {NAV,moduleHome,moduleModal,directoryView,parseModuleForm}=require('../src/operationsViews');
const {registerOperations}=require('../src/operationsHandlers');
const {appConfig}=require('../src/config');
const user='UABC123456',team='TABC123456';
const env={SLACK_BOT_TOKEN:'xoxb-fake',SLACK_SIGNING_SECRET:'placeholder',SLACK_ALLOWED_TEAM_ID:team,SLACK_ALLOWED_USER_IDS:user,FIREBASE_PROJECT_ID:'snag-ops-staging',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'};
test('source inspection structure has exactly 4 sectors and 51 stable unique keys',()=>{
 assert.deepEqual(PARK_SECTORS.map(s=>s.zones.reduce((a,z)=>a+z.items.length,0)),[13,13,12,13]);assert.equal(PARK_ITEMS.length,51);
 assert.equal(new Set(PARK_ITEMS.map(x=>x.key)).size,51);
 assert.ok(PARK_BY_KEY['security__sec-cctv__nvr-recording']);assert.ok(PARK_BY_KEY['landscape__land-irrigation__irrigation-pipes']);
 assert.ok(PARK_BY_KEY['traffic-parking__car-epoxy-mep__jet-fans']);
});
test('source restroom catalog has 50 locations, 29 components, exact 1450 inspection slots',()=>{
 assert.equal(RESTROOMS.length,50);assert.equal(COMPONENTS.length,29);assert.equal(RESTROOMS.length*COMPONENTS.length,1450);
 assert.equal(new Set(RESTROOMS.map(r=>r.key)).size,50);assert.equal(new Set(COMPONENTS.map(r=>r.code)).size,29);
 assert.ok(RESTROOM_BY_KEY.plaza_p1_a);assert.ok(COMPONENT_BY_CODE.fix_large_bins);assert.ok(COMPONENT_BY_CODE.civil_riser);
 assert.ok(COMPONENT_BY_CODE.civil_ceiling);assert.equal(COMPONENT_BY_CODE.fix_small_bins.name,'سلال المهملات الصغيرة');
});
test('park inspection rejects unknown keys, na and statuses outside source enum',()=>{
 const key=PARK_ITEMS[0].key;
 assert.throws(()=>normalizeInspection({key:'wrong',status:'snag'},user),/INVALID/);
 assert.throws(()=>normalizeInspection({key,status:'na'},user),/INVALID/);
 const r=normalizeInspection({key,status:'snag',note:'وصف تجريبي'},user);
 assert.equal(r.id,key);assert.equal(r.isDemo,true);assert.equal(r.source,'slack-staging');
 assert.equal(r.sector,'security');
});
test('count-based restroom components enforce totals and nonnegative integers',()=>{
 const base={restroomKey:'plaza_p1_m',component:'elec_spots',totalCount:'5',workingCount:'3',defectiveCount:'1',missingCount:'1'};
 const r=normalizeRestroom(base,user);assert.equal(r.totalCount,5);assert.equal(r.id,'plaza_p1_m__elec_spots');
 assert.throws(()=>normalizeRestroom({...base,defectiveCount:'3'},user),/INVALID_COUNT_SUM/);
 assert.throws(()=>normalizeRestroom({...base,defectiveCount:'-1'},user),/INVALID_COUNT/);
 assert.throws(()=>normalizeRestroom({...base,totalCount:'1.5'},user),/INVALID_COUNT/);
});
test('condition-based components require allowed statuses but not numeric counts',()=>{
 const r=normalizeRestroom({restroomKey:'plaza_p1_f',component:'civil_ceiling',conditionStatus:'سليم'},user);
 assert.equal(r.conditionStatus,'سليم');assert.equal(r.totalCount,null);
 assert.throws(()=>normalizeRestroom({restroomKey:'plaza_p1_f',component:'civil_ceiling',conditionStatus:'no'},user),/INVALID_CONDITION/);
});
test('photo references are strict, 4 max and never store base64',()=>{
 assert.deepEqual(validateFileIds(['F12345678']),['F12345678']);
 assert.throws(()=>validateFileIds(['data:image/png;base64,abcdef']),/INVALID_FILE_IDS/);
 assert.throws(()=>validateFileIds(Array(5).fill('F12345678')),/INVALID_FILE_IDS/);
});
test('all structured forms use modal and original catalog lengths',()=>{
 const park=moduleModal('park'),rr=moduleModal('restroom');assert.equal(park.blocks.find(b=>b.block_id==='key').element.options.length,51);
 assert.equal(rr.blocks.find(b=>b.block_id==='restroomKey').element.options.length,50);
 assert.equal(rr.blocks.find(b=>b.block_id==='component').element.options.length,29);
 for(const type of ['unit','store','permit','custom'])assert.equal(moduleModal(type).type,'modal');
});
test('directory and 10 views comply with Slack 100-block home limit',()=>{
 const directory=directoryView();assert.equal(directory.type,'home');assert.ok(directory.blocks.length<100);
 for(const type of Object.keys(NAV))if(!['orders','overview'].includes(type)){const h=moduleHome(type,[]);assert.equal(h.type,'home');assert.ok(h.blocks.length<100);}
});
test('parsed fields are explicitly allowlisted',()=>{
 const values={key:{value:{selected_option:{value:PARK_ITEMS[0].key}}},status:{value:{selected_option:{value:'ok'}}},evil:{value:{value:'SECRET'}},note:{value:{value:'Test'}}};
 assert.deepEqual(parseModuleForm('park',values),{key:PARK_ITEMS[0].key,status:'ok',note:'Test',photoIds:[]});
});
test('entities do not become official permits or users',()=>{
 const permit=normalizeEntity('permit',{title:'تصريح اختبار',location:'التجربة',description:'لا يسمح بتنفيذ أعمال حقيقية'},user);
 assert.equal(permit.status,'requested');assert.equal(permit.requiresOfficialApproval,true);
 assert.throws(()=>normalizeEntity('users',{title:'admin'},user),/INVALID_ENTITY_TYPE/);
});
test('memory repo isolates tenant data and keeps source keys',async()=>{
 const repo=memoryOperationsRepo();const key=PARK_ITEMS[0].key;
 const id=await repo.upsert(team,user,'park',{key,status:'snag',note:'أول مرة'},'a');assert.equal(id,key);
 await repo.upsert(team,user,'park',{key,status:'ok',note:'ثاني مرة'},'b');
 const l=await repo.list(team,'park');assert.equal(l.length,1);assert.equal(l[0].history.length,2);assert.equal(l[0].status,'ok');
 assert.equal((await repo.list('TDIFFERENT','park')).length,0);
});
test('entity submission retries are idempotent',async()=>{
 const repo=memoryOperationsRepo();const a=await repo.upsert(team,user,'unit',{title:'وحدة تدريب'},'view-a');const b=await repo.upsert(team,user,'unit',{title:'وحدة تدريب'},'view-a');assert.equal(a,b);
 assert.equal((await repo.list(team,'unit')).length,1);
 assert.notEqual(deterministic(team,'unit','view-a'),deterministic('TANOTHER','unit','view-a'));
});
test('home escapes injected text and keeps private demo message',()=>{
 const r=moduleHome('unit',[{title:'<@U123> & <http://bad.example>',location:'A',updatedAt:'2026-10-21T00:00:00Z'}]);
 const raw=JSON.stringify(r);assert.ok(raw.includes('&lt;@U123&gt;'));assert.ok(!raw.includes('<http://bad.example>'));
 assert.ok(raw.includes('Firebase الإنتاجية'));
});
test('operations action registry denies users not in allowlist',async()=>{
 const handlers=new Map();const views=new Map();const app={action:(k,v)=>handlers.set(k,v),view:(k,v)=>views.set(k,v)};
 const originalRepo={list:async()=>[]};const repo=memoryOperationsRepo();const cfg=appConfig(env);
 registerOperations(app,{repo,originalRepo,config:cfg,logger:{error:()=>{}}});
 assert.ok(handlers.has('parkops_go'));assert.ok(handlers.has('parkops_add_module'));assert.ok(views.has('parkops_module_submit'));
 let acked=false,published=false;
 await handlers.get('parkops_go')({ack:async()=>{acked=true},body:{team_id:team,user:{id:'UFORBIDDEN'}},action:{value:'park'},client:{views:{publish:async()=>{published=true}}}});
 assert.equal(acked,true);assert.equal(published,false);
});
test('registry authorized navigation produces a private module homepage',async()=>{
 const handlers=new Map();const app={action:(k,v)=>handlers.set(k,v),view:()=>{}};const repo=memoryOperationsRepo();const cfg=appConfig(env);
 registerOperations(app,{repo,originalRepo:{list:async()=>[]},config:cfg});let payload;
 await handlers.get('parkops_go')({ack:async()=>{},body:{team_id:team,user:{id:user}},action:{value:'restroom'},client:{views:{publish:async x=>{payload=x}}}});
 assert.equal(payload.user_id,user);assert.equal(payload.view.type,'home');assert.ok(JSON.stringify(payload.view).includes('1450'));
});
