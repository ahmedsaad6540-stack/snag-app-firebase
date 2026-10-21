'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateFirebaseTarget}=require('./config');
const {normalizeInspection,normalizeRestroom,normalizeEntity,ENTITY_TYPES,PERMIT_STATES}=require('./operationsDomain');
const {RESTROOM_BY_KEY,COMPONENTS}=require('./restroomCatalog');
const {PARK_STREET_STORES_CATALOG,DEMO_UNITS_CATALOG}=require('./storesCatalog');

const COLLECTIONS=Object.freeze({
  park:'park',
  restroom:'restroom',
  restroom_meta:'restroom_meta',
  unit:'unit',
  store:'store',
  permit:'permit',
  custom:'custom',
  notifications:'notifications'
});

function choose(type){
  if(!Object.hasOwn(COLLECTIONS,type))throw new Error('UNKNOWN_COLLECTION');
  return type;
}

function deterministic(team,type,key){
  return crypto.createHash('sha256').update(`${team}:${type}:${key}`).digest('hex').slice(0,40);
}

function build(type,values,actor){
  if(type==='park')return normalizeInspection(values,actor);
  if(type==='restroom')return normalizeRestroom(values,actor);
  return normalizeEntity(type,values,actor);
}

function createOperationsRepo(env=process.env){
  const {projectId}=validateFirebaseTarget(env);
  if(env.LOCAL_STAGING_STORE==='true'){
    return memoryOperationsRepo({persistPath:env.LOCAL_STAGING_OPS_FILE||path.join(process.cwd(),'.staging-data','operations.json')});
  }
  const admin=require('firebase-admin');
  if(!admin.apps.length)admin.initializeApp({projectId});
  const db=admin.firestore();
  const parent=(team,type)=>db.collection('slack_ops_staging_workspaces').doc(team).collection(`module_${choose(type)}`);

  return {
    async list(team,type,limit=60){
      const docs=await parent(team,type).orderBy('updatedAt','desc').limit(Math.min(120,Math.max(1,limit))).get();
      return docs.docs.map(d=>({id:d.id,...d.data()}));
    },
    async get(team,type,id){
      if(!id)return null;
      const snap=await parent(team,type).doc(String(id)).get();
      if(!snap.exists)return null;
      const data=snap.data();
      return data.teamId===team?{id:snap.id,...data}:null;
    },
    async upsert(team,user,type,data,requestId){
      const payload=build(type,data,user);
      const docId=type==='park'||type==='restroom'?payload.id:deterministic(team,type,requestId);
      const ref=parent(team,type).doc(docId);
      await db.runTransaction(async t=>{
        const current=await t.get(ref);
        if(current.exists){
          const before=current.data();
          if(before.source!=='slack-staging'||before.isDemo!==true||before.teamId!==team)throw new Error('INVALID_RECORD_OWNER');
          if(ENTITY_TYPES.has(type))return; // Idempotent submission.
          t.update(ref,{...payload,teamId:team,history:[...(before.history||[]).slice(-40),{action:'updated',actor:user,at:payload.updatedAt}]});
        }else{
          t.create(ref,{...payload,teamId:team,history:[{action:'created',actor:user,at:payload.updatedAt}]});
        }
      });
      return docId;
    },
    async updateEntity(team,user,type,id,data){
      const payload=build(type,data,user);
      const ref=parent(team,type).doc(String(id));
      await db.runTransaction(async t=>{
        const current=await t.get(ref);
        if(!current.exists)throw new Error('NOT_FOUND');
        const before=current.data();
        if(before.teamId!==team||before.isDemo!==true)throw new Error('INVALID_RECORD_OWNER');
        t.update(ref,{...payload,teamId:team,createdAt:before.createdAt||payload.createdAt,history:[...(before.history||[]).slice(-40),{action:'updated',actor:user,at:payload.updatedAt}]});
      });
      return id;
    },
    async remove(team,type,id){
      const ref=parent(team,type).doc(String(id));
      const snap=await ref.get();
      if(!snap.exists)return false;
      if(snap.data().teamId!==team)throw new Error('INVALID_RECORD_OWNER');
      await ref.delete();
      return true;
    },
    async toggleRestroomConfirmed(team,user,restroomKey){
      const room=RESTROOM_BY_KEY[restroomKey];
      if(!room)throw new Error('INVALID_RESTROOM_ITEM');
      const ref=parent(team,'restroom_meta').doc(restroomKey);
      const at=new Date().toISOString();
      let nextState=null;
      await db.runTransaction(async t=>{
        const snap=await t.get(ref);
        const prev=snap.exists?snap.data():{confirmed:false,roundsCount:0};
        const confirmed=!prev.confirmed;
        const roundsCount=(Number(prev.roundsCount)||0)+(confirmed?1:0);
        nextState={
          id:restroomKey,
          restroomKey,
          building:room.building,
          direction:room.direction,
          floor:room.floor,
          gender:room.gender,
          confirmed,
          roundsCount,
          lastRoundDate:at.slice(0,10),
          updatedAt:at,
          updatedBy:user,
          teamId:team,
          isDemo:true,
          source:'slack-staging'
        };
        t.set(ref,nextState,{merge:true});
      });
      return nextState;
    },
    async listRestroomMeta(team){
      const docs=await parent(team,'restroom_meta').limit(100).get();
      return docs.docs.map(d=>({id:d.id,...d.data()}));
    },
    async markAllRestroomOk(team,user,restroomKey,inspector=''){
      const room=RESTROOM_BY_KEY[restroomKey];
      if(!room)throw new Error('INVALID_RESTROOM_ITEM');
      const existing=await this.list(team,'restroom',100);
      const existingIds=new Set(existing.filter(r=>r.restroomKey===restroomKey).map(r=>r.component));
      let added=0;
      for(const comp of COMPONENTS){
        if(existingIds.has(comp.code))continue;
        const payload=comp.type==='عدد'
          ?{restroomKey,component:comp.code,totalCount:'1',workingCount:'1',defectiveCount:'0',missingCount:'0',note:'اعتماد تلقائي — سليم',inspector}
          :{restroomKey,component:comp.code,conditionStatus:'سليم',note:'اعتماد تلقائي — سليم',inspector};
        await this.upsert(team,user,'restroom',payload,`bulk-${restroomKey}-${comp.code}`);
        added+=1;
      }
      await this.toggleRestroomConfirmed(team,user,restroomKey);
      return added;
    },
    async updatePermitStage(team,user,id,nextStage,note=''){
      if(!PERMIT_STATES.includes(nextStage))throw new Error('INVALID_PERMIT_STAGE');
      const ref=parent(team,'permit').doc(String(id));
      const at=new Date().toISOString();
      await db.runTransaction(async t=>{
        const snap=await t.get(ref);
        if(!snap.exists)throw new Error('NOT_FOUND');
        const prev=snap.data();
        if(prev.teamId!==team)throw new Error('INVALID_RECORD_OWNER');
        t.update(ref,{
          approvalStage:nextStage,
          status:'requested',
          requiresOfficialApproval:true,
          updatedAt:at,
          updatedBy:user,
          history:[...(prev.history||[]).slice(-40),{action:`stage:${nextStage}`,note:String(note||'').slice(0,240),actor:user,at}]
        });
      });
      return id;
    },
    async seedCatalogStores(team,user){
      let count=0;
      for(let i=0;i<PARK_STREET_STORES_CATALOG.length;i+=1){
        const st=PARK_STREET_STORES_CATALOG[i];
        await this.upsert(team,user,'store',{
          title:`مخزن ${st.storeNo} — ${st.companyName}`,
          storeNo:st.storeNo,
          companyName:st.companyName,
          notes:st.notes,
          location:`مخزن رقم ${st.storeNo}`,
          description:st.notes||st.companyName
        },`seed-store-${i}-${st.storeNo}-${st.companyName}`);
        count+=1;
      }
      return count;
    },
    async seedDemoUnits(team,user){
      let count=0;
      for(let i=0;i<DEMO_UNITS_CATALOG.length;i+=1){
        const u=DEMO_UNITS_CATALOG[i];
        await this.upsert(team,user,'unit',{
          ...u,
          title:`${u.unitNo} — ${u.unitName}`,
          location:`${u.buildingNo} • ${u.floor} • ${u.unitNo}`,
          description:u.companyActivity
        },`seed-unit-${i}-${u.unitNo}`);
        count+=1;
      }
      return count;
    },
    async addNotification(team,event){
      const at=new Date().toISOString();
      const id=deterministic(team,'notifications',`${at}:${Math.random()}`);
      await parent(team,'notifications').doc(id).set({
        id,
        teamId:team,
        type:String(event?.type||'info').slice(0,40),
        title:String(event?.title||'تحديث تشغيلي').slice(0,160),
        detail:String(event?.detail||'').slice(0,400),
        actor:String(event?.actor||'system').slice(0,30),
        updatedAt:at,
        isDemo:true,
        source:'slack-staging'
      });
      return id;
    },
    async listNotifications(team,limit=25){
      const docs=await parent(team,'notifications').orderBy('updatedAt','desc').limit(limit).get();
      return docs.docs.map(d=>({id:d.id,...d.data()}));
    },
    async clearNotifications(team){
      const docs=await parent(team,'notifications').limit(100).get();
      for(const d of docs.docs)await d.ref.delete();
      return docs.docs.length;
    }
  };
}

function memoryOperationsRepo({persistPath=null}={}){
  const maps=new Map();
  if(persistPath&&fs.existsSync(persistPath)){
    try{
      const raw=JSON.parse(fs.readFileSync(persistPath,'utf8'));
      for(const [scopeKey,entries] of Object.entries(raw)){
        maps.set(scopeKey,new Map(Object.entries(entries)));
      }
    }catch{/* ignore corrupt local cache */}
  }
  const flush=()=>{
    if(!persistPath)return;
    try{
      fs.mkdirSync(path.dirname(persistPath),{recursive:true});
      const out={};
      for(const [k,m] of maps.entries())out[k]=Object.fromEntries(m);
      fs.writeFileSync(persistPath,JSON.stringify(out,null,2),'utf8');
    }catch{/* ignore write errors */}
  };
  const scope=(team,type)=>`${team}:${choose(type)}`;

  return {
    async list(team,type,limit=60){
      return [...(maps.get(scope(team,type))?.values()||[])]
        .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))
        .slice(0,limit);
    },
    async get(team,type,id){
      const m=maps.get(scope(team,type));
      const item=m?.get(String(id));
      return item&&item.teamId===team?item:null;
    },
    async upsert(team,user,type,data,requestId){
      const record=build(type,data,user);
      const key=scope(team,type);
      if(!maps.has(key))maps.set(key,new Map());
      const m=maps.get(key);
      const id=type==='park'||type==='restroom'?record.id:deterministic(team,type,requestId);
      const prev=m.get(id);
      if(prev?.teamId!==undefined&&prev.teamId!==team)throw new Error('INVALID_RECORD_OWNER');
      if(prev&&ENTITY_TYPES.has(type))return id;
      m.set(id,{
        ...record,
        id,
        teamId:team,
        history:[...(prev?.history||[]).slice(-40),{action:prev?'updated':'created',actor:user,at:record.updatedAt}]
      });
      flush();
      return id;
    },
    async updateEntity(team,user,type,id,data){
      const record=build(type,data,user);
      const key=scope(team,type);
      const m=maps.get(key);
      const prev=m?.get(String(id));
      if(!prev||prev.teamId!==team)throw new Error('NOT_FOUND');
      m.set(String(id),{
        ...record,
        id:String(id),
        teamId:team,
        createdAt:prev.createdAt||record.createdAt,
        history:[...(prev.history||[]).slice(-40),{action:'updated',actor:user,at:record.updatedAt}]
      });
      flush();
      return String(id);
    },
    async remove(team,type,id){
      const key=scope(team,type);
      const m=maps.get(key);
      const prev=m?.get(String(id));
      if(!prev||prev.teamId!==team)return false;
      m.delete(String(id));
      flush();
      return true;
    },
    async toggleRestroomConfirmed(team,user,restroomKey){
      const room=RESTROOM_BY_KEY[restroomKey];
      if(!room)throw new Error('INVALID_RESTROOM_ITEM');
      const key=scope(team,'restroom_meta');
      if(!maps.has(key))maps.set(key,new Map());
      const m=maps.get(key);
      const prev=m.get(restroomKey)||{confirmed:false,roundsCount:0};
      const confirmed=!prev.confirmed;
      const roundsCount=(Number(prev.roundsCount)||0)+(confirmed?1:0);
      const at=new Date().toISOString();
      const nextState={
        id:restroomKey,
        restroomKey,
        building:room.building,
        direction:room.direction,
        floor:room.floor,
        gender:room.gender,
        confirmed,
        roundsCount,
        lastRoundDate:at.slice(0,10),
        updatedAt:at,
        updatedBy:user,
        teamId:team,
        isDemo:true,
        source:'slack-staging'
      };
      m.set(restroomKey,nextState);
      flush();
      return nextState;
    },
    async listRestroomMeta(team){
      return [...(maps.get(scope(team,'restroom_meta'))?.values()||[])];
    },
    async markAllRestroomOk(team,user,restroomKey,inspector=''){
      const room=RESTROOM_BY_KEY[restroomKey];
      if(!room)throw new Error('INVALID_RESTROOM_ITEM');
      const existing=await this.list(team,'restroom',1500);
      const existingIds=new Set(existing.filter(r=>r.restroomKey===restroomKey).map(r=>r.component));
      let added=0;
      for(const comp of COMPONENTS){
        if(existingIds.has(comp.code))continue;
        const payload=comp.type==='عدد'
          ?{restroomKey,component:comp.code,totalCount:'1',workingCount:'1',defectiveCount:'0',missingCount:'0',note:'اعتماد تلقائي — سليم',inspector}
          :{restroomKey,component:comp.code,conditionStatus:'سليم',note:'اعتماد تلقائي — سليم',inspector};
        await this.upsert(team,user,'restroom',payload,`bulk-${restroomKey}-${comp.code}`);
        added+=1;
      }
      const metaMap=maps.get(scope(team,'restroom_meta'));
      const currentMeta=metaMap?.get(restroomKey);
      if(!currentMeta||!currentMeta.confirmed){
        await this.toggleRestroomConfirmed(team,user,restroomKey);
      }
      flush();
      return added;
    },
    async updatePermitStage(team,user,id,nextStage,note=''){
      if(!PERMIT_STATES.includes(nextStage))throw new Error('INVALID_PERMIT_STAGE');
      const m=maps.get(scope(team,'permit'));
      const prev=m?.get(String(id));
      if(!prev||prev.teamId!==team)throw new Error('NOT_FOUND');
      const at=new Date().toISOString();
      prev.approvalStage=nextStage;
      prev.status='requested';
      prev.requiresOfficialApproval=true;
      prev.updatedAt=at;
      prev.updatedBy=user;
      prev.history=[...(prev.history||[]).slice(-40),{action:`stage:${nextStage}`,note:String(note||'').slice(0,240),actor:user,at}];
      flush();
      return String(id);
    },
    async seedCatalogStores(team,user){
      let count=0;
      for(let i=0;i<PARK_STREET_STORES_CATALOG.length;i+=1){
        const st=PARK_STREET_STORES_CATALOG[i];
        await this.upsert(team,user,'store',{
          title:`مخزن ${st.storeNo} — ${st.companyName}`,
          storeNo:st.storeNo,
          companyName:st.companyName,
          notes:st.notes,
          location:`مخزن رقم ${st.storeNo}`,
          description:st.notes||st.companyName
        },`seed-store-${i}-${st.storeNo}-${st.companyName}`);
        count+=1;
      }
      return count;
    },
    async seedDemoUnits(team,user){
      let count=0;
      for(let i=0;i<DEMO_UNITS_CATALOG.length;i+=1){
        const u=DEMO_UNITS_CATALOG[i];
        await this.upsert(team,user,'unit',{
          ...u,
          title:`${u.unitNo} — ${u.unitName}`,
          location:`${u.buildingNo} • ${u.floor} • ${u.unitNo}`,
          description:u.companyActivity
        },`seed-unit-${i}-${u.unitNo}`);
        count+=1;
      }
      return count;
    },
    async addNotification(team,event){
      const key=scope(team,'notifications');
      if(!maps.has(key))maps.set(key,new Map());
      const m=maps.get(key);
      const at=new Date().toISOString();
      const id=deterministic(team,'notifications',`${at}:${m.size}:${Math.random()}`);
      m.set(id,{
        id,
        teamId:team,
        type:String(event?.type||'info').slice(0,40),
        title:String(event?.title||'تحديث تشغيلي').slice(0,160),
        detail:String(event?.detail||'').slice(0,400),
        actor:String(event?.actor||'system').slice(0,30),
        updatedAt:at,
        isDemo:true,
        source:'slack-staging'
      });
      flush();
      return id;
    },
    async listNotifications(team,limit=25){
      return [...(maps.get(scope(team,'notifications'))?.values()||[])]
        .sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))
        .slice(0,limit);
    },
    async clearNotifications(team){
      const key=scope(team,'notifications');
      const m=maps.get(key);
      const count=m?m.size:0;
      if(m)m.clear();
      flush();
      return count;
    }
  };
}

module.exports={COLLECTIONS,createOperationsRepo,memoryOperationsRepo,build,deterministic};
