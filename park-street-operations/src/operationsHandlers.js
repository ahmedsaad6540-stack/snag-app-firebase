'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {authorized}=require('./config');
const {
  directoryView,
  moduleHome,
  moduleModal,
  restroomRoundModal,
  permitStageModal,
  ncriTestModal,
  parseModuleForm
}=require('./operationsViews');
const {
  normalizeInspection,
  normalizeRestroom,
  normalizeEntity,
  buildPromotedSnagFromParkItem,
  buildPromotedSnagFromRestroomRow
}=require('./operationsDomain');
const {isRestroomRowDefective}=require('./restroomCatalog');
const {classifyNCRI}=require('./ai/ncri');
const {buildMasterOperationsWorkbook,buildOperationsSummaryCsv}=require('./reportExporter');

const SAFE_DEMO_CHANNEL_ID='C0CAS6S7RR8';

// Attaches the additional feature flows to the original, fully isolated Bolt app.
function registerOperations(app,{repo,originalRepo,config,logger=console}){
  const permitted=(body)=>authorized(config,body);
  const userState=new Map(); // stores per-user filter/context state in memory

  const getContext=async(userId,type,extra={})=>{
    const prev=userState.get(userId)||{};
    const merged={...prev,...extra,config};
    userState.set(userId,merged);

    if(type==='ai'||type==='reports'){
      const tickets=originalRepo?.list?await originalRepo.list(config.team):[];
      const parkRecords=repo?.list?await repo.list(config.team,'park',60):[];
      const restroomRecords=repo?.list?await repo.list(config.team,'restroom',200):[];
      const restroomMeta=repo?.listRestroomMeta?await repo.listRestroomMeta(config.team):[];
      const units=repo?.list?await repo.list(config.team,'unit',100):[];
      const stores=repo?.list?await repo.list(config.team,'store',100):[];
      const permits=repo?.list?await repo.list(config.team,'permit',60):[];
      const customItems=repo?.list?await repo.list(config.team,'custom',60):[];
      return {...merged,tickets,parkRecords,restroomRecords,restroomMeta,units,stores,permits,customItems};
    }
    if(type==='restroom'){
      const restroomMeta=repo?.listRestroomMeta?await repo.listRestroomMeta(config.team):[];
      return {...merged,restroomMeta};
    }
    return merged;
  };

  const publish=async(client,userId,type,extra={})=>{
    if(type==='overview'||type==='orders'){
      const {homeView}=require('./views');
      return client.views.publish({user_id:userId,view:homeView(await originalRepo.list(config.team),userId)});
    }
    const ctx=await getContext(userId,type,extra);
    let rows=[];
    if(type==='notifications'){
      rows=repo?.listNotifications?await repo.listNotifications(config.team,30):[];
    } else if(!['reports','team','ai'].includes(type)){
      rows=await repo.list(config.team,type,100);
    }
    return client.views.publish({user_id:userId,view:moduleHome(type,rows,ctx)});
  };

  const logNotification=async(title,detail,actor)=>{
    if(repo?.addNotification){
      try{await repo.addNotification(config.team,{type:'ops',title,detail,actor});}catch{/* ignore */}
    }
  };

  const refresh=async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{await publish(client,body.user.id,action.value);}catch(e){logger.error(e.message);}
  };

  app.action('parkops_modules',async({ack,body,client})=>{
    await ack();
    if(permitted(body))await client.views.publish({user_id:body.user.id,view:directoryView()});
  });

  app.action('parkops_dashboard',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    const {homeView}=require('./views');
    const tickets=await originalRepo.list(config.team);
    await client.views.publish({user_id:body.user.id,view:homeView(tickets,body.user.id)});
  });

  app.action('parkops_go',refresh);
  app.action('parkops_refresh_module',refresh);

  app.action('parkops_add_module',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      await client.views.open({trigger_id:body.trigger_id,view:moduleModal(action.value,{enableFiles:config.enableFiles})});
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_park_filter',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{await publish(client,body.user.id,'park',{sectorFilter:action.value});}catch(e){logger.error(e.message);}
  });

  app.action('parkops_restroom_filter',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{await publish(client,body.user.id,'restroom',{zoneFilter:action.value});}catch(e){logger.error(e.message);}
  });

  app.action('parkops_promote_park',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const list=await repo.list(config.team,'park',60);
      const item=list.find(r=>r.id===action.value||r.key===action.value);
      if(!item)return;
      const snagPayload=buildPromotedSnagFromParkItem(item);
      if(originalRepo?.create){
        await originalRepo.create(config.team,body.user.id,snagPayload,`promote-park-${item.id}`);
        await logNotification('ترحيل بند Park Street إلى SNAG',snagPayload.title,body.user.id);
      }
      await publish(client,body.user.id,'orders');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_promote_restroom',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const list=await repo.list(config.team,'restroom',200);
      const row=list.find(r=>r.id===action.value);
      if(!row)return;
      const snagPayload=buildPromotedSnagFromRestroomRow(row);
      if(originalRepo?.create){
        await originalRepo.create(config.team,body.user.id,snagPayload,`promote-rr-${row.id}`);
        await logNotification('ترحيل عطل حمام إلى SNAG',snagPayload.title,body.user.id);
      }
      await publish(client,body.user.id,'orders');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_promote_all_restrooms',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const list=await repo.list(config.team,'restroom',300);
      const defectiveRows=list.filter(isRestroomRowDefective);
      let count=0;
      for(const row of defectiveRows){
        const snagPayload=buildPromotedSnagFromRestroomRow(row);
        if(originalRepo?.create){
          await originalRepo.create(config.team,body.user.id,snagPayload,`promote-rr-${row.id}`);
          count+=1;
        }
      }
      await logNotification('ترحيل مجمع لأعطال الحمامات',`تم ترحيل ${count} عطل إلى أوامر العمل`,body.user.id);
      await publish(client,body.user.id,'orders');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_restroom_round_modal',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{await client.views.open({trigger_id:body.trigger_id,view:restroomRoundModal()});}catch(e){logger.error(e.message);}
  });

  app.view('parkops_restroom_round_submit',async({ack,body,view,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const vals=view.state?.values||{};
      const restroomKey=vals.restroomKey?.value?.selected_option?.value;
      const mode=vals.mode?.value?.selected_option?.value||'confirm_only';
      const inspector=vals.inspector?.value?.value||'';
      if(mode==='mark_all_ok'&&repo?.markAllRestroomOk){
        const added=await repo.markAllRestroomOk(config.team,body.user.id,restroomKey,inspector);
        await logNotification('اعتماد جولة حمام كاملة',`تم اعتماد ${added} مكون سليم في ${restroomKey}`,body.user.id);
      } else if(repo?.toggleRestroomConfirmed){
        await repo.toggleRestroomConfirmed(config.team,body.user.id,restroomKey);
        await logNotification('تأكيد جولة حمام',`تم تحديث تأكيد الفحص للحمام ${restroomKey}`,body.user.id);
      }
      await publish(client,body.user.id,'restroom');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_seed_stores',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      if(repo?.seedCatalogStores){
        const count=await repo.seedCatalogStores(config.team,body.user.id);
        await logNotification('تحميل بيانات المخازن القياسية',`تم تحميل ${count} مخزن في بيئة Staging`,body.user.id);
      }
      await publish(client,body.user.id,'store');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_seed_units',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      if(repo?.seedDemoUnits){
        const count=await repo.seedDemoUnits(config.team,body.user.id);
        await logNotification('تحميل وحدات تجريبية',`تم تحميل ${count} وحدات تجريبية`,body.user.id);
      }
      await publish(client,body.user.id,'unit');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_permit_stage_modal',async({ack,body,action,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const list=await repo.list(config.team,'permit',60);
      const permit=list.find(p=>p.id===action.value);
      if(!permit)return;
      await client.views.open({trigger_id:body.trigger_id,view:permitStageModal(permit)});
    }catch(e){logger.error(e.message);}
  });

  app.view('parkops_permit_stage_submit',async({ack,body,view,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const meta=JSON.parse(view.private_metadata||'{}');
      const stage=view.state?.values?.stage?.value?.selected_option?.value||'requested';
      const note=view.state?.values?.note?.value?.value||'';
      if(repo?.updatePermitStage){
        await repo.updatePermitStage(config.team,body.user.id,meta.id,stage,note);
        await logNotification('تحديث مرحلة تصريح عمل',`المرحلة الجديدة: ${stage}`,body.user.id);
      }
      await publish(client,body.user.id,'permit');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_ncri_modal',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{await client.views.open({trigger_id:body.trigger_id,view:ncriTestModal()});}catch(e){logger.error(e.message);}
  });

  app.view('parkops_ncri_submit',async({ack,body,view})=>{
    if(!permitted(body)){await ack();return;}
    const sampleText=view.state?.values?.sampleText?.value?.value||'';
    const result=classifyNCRI(sampleText);
    await ack({response_action:'update',view:ncriTestModal(result)});
  });

  app.action('parkops_send_demo_digest',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const ctx=await getContext(body.user.id,'reports');
      const digestText=`🧪 *[Park Street Operations — ملخص تجريبي معزول]*\n` +
        `• أوامر العمل (SNAGs): ${ctx.tickets.length}\n` +
        `• فحص Park Street (51): ${ctx.parkRecords.length}/51\n` +
        `• فحص الحمامات (1450): ${ctx.restroomRecords.length}/1450\n` +
        `• الوحدات: ${ctx.units.length} | المخازن: ${ctx.stores.length}\n` +
        `_تنبيه أمان: رسالة اختبارية مقتصرة على القناة التجريبية الخاصة (${SAFE_DEMO_CHANNEL_ID}) ولا تحتوي على بيانات حقيقية._`;
      await logNotification('إرسال ملخص تجريبي لقناة الاختبار',`تم تجهيز ملخص لقناة #snag-ops-demo (${SAFE_DEMO_CHANNEL_ID})`,body.user.id);
      if(client?.chat?.postMessage && process.env.ENABLE_DEMO_CHANNEL_POST==='true'){
        await client.chat.postMessage({channel:SAFE_DEMO_CHANNEL_ID,text:digestText});
      }
      await publish(client,body.user.id,'notifications');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_clear_notifications',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      if(repo?.clearNotifications)await repo.clearNotifications(config.team);
      await publish(client,body.user.id,'notifications');
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_export_xlsx',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const ctx=await getContext(body.user.id,'reports');
      const buffer=await buildMasterOperationsWorkbook(ctx);
      const exportDir=path.join(process.cwd(),'exports');
      fs.mkdirSync(exportDir,{recursive:true});
      const fileName=`Park_Street_Operations_Staging_${new Date().toISOString().slice(0,10)}.xlsx`;
      const outPath=path.join(exportDir,fileName);
      fs.writeFileSync(outPath,buffer);
      await logNotification('تصدير تقرير Excel الشامل',`تم توليد ${fileName} (${Math.round(buffer.length/1024)} KB)`,body.user.id);
      await publish(client,body.user.id,'reports',{lastExportMessage:`تم توليد ملف Excel الشامل بنجاح: exports/${fileName} (${Math.round(buffer.length/1024)} KB)`});
    }catch(e){logger.error(e.message);}
  });

  app.action('parkops_export_csv',async({ack,body,client})=>{
    await ack();
    if(!permitted(body))return;
    try{
      const ctx=await getContext(body.user.id,'reports');
      const csv=buildOperationsSummaryCsv(ctx);
      const exportDir=path.join(process.cwd(),'exports');
      fs.mkdirSync(exportDir,{recursive:true});
      const fileName=`Park_Street_Operations_Summary_${new Date().toISOString().slice(0,10)}.csv`;
      const outPath=path.join(exportDir,fileName);
      fs.writeFileSync(outPath,csv,'utf8');
      await logNotification('تصدير ملخص CSV',`تم توليد ${fileName}`,body.user.id);
      await publish(client,body.user.id,'reports',{lastExportMessage:`تم توليد ملف CSV بنجاح: exports/${fileName}`});
    }catch(e){logger.error(e.message);}
  });

  app.view('parkops_module_submit',async({ack,body,view,client})=>{
    if(!permitted(body)){await ack();return;}
    let type;try{type=JSON.parse(view.private_metadata||'{}').type;}catch{type='';}
    const values=parseModuleForm(type,view.state.values);
    try{
      if(type==='park')normalizeInspection(values,body.user.id);
      else if(type==='restroom')normalizeRestroom(values,body.user.id);
      else normalizeEntity(type,values,body.user.id);
    }catch(e){
      const errorField=type==='park'?'key':type==='restroom'?'component':'title';
      await ack({
        response_action:'errors',
        errors:{[errorField]:e.message==='INVALID_COUNT_SUM'?'العدد الإجمالي لا يساوي السليم + المعطل + المفقود':'راجع الحقول المطلوبة ونتيجة الفحص'}
      });
      return;
    }
    await ack();
    try{
      await repo.upsert(config.team,body.user.id,type,values,view.id);
      await logNotification(`تسجيل جديد في ${type}`,values.title||values.key||values.restroomKey||type,body.user.id);
      await publish(client,body.user.id,type);
    }catch(e){logger.error(e.message);}
  });
}

module.exports={registerOperations,SAFE_DEMO_CHANNEL_ID};
