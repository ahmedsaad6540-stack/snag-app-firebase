'use strict';

const {appConfig,authorized}=require('./config');
const {createFirestoreRepo}=require('./repository');
const {createOperationsRepo}=require('./operationsRepo');
const {registerOperations}=require('./operationsHandlers');
const {fromModal,validateNew,STATUSES,PARK_ST_TRACKS}=require('./domain');
const {createModal,updateModal,editTicketModal,quickTracksModal,homeView,deniedView}=require('./views');
const {notifyDemoChannelFromApp}=require('./slackNotifications');

function createApp({config=appConfig(),repo=createFirestoreRepo(),moduleRepo=createOperationsRepo()}={}){
  const {App}=require('@slack/bolt');
  const slackAppOptions = config.socketMode
    ? { token: config.botToken, appToken: config.appToken, socketMode: true }
    : { token: config.botToken, signingSecret: config.signingSecret, port: config.port };
  const app=new App(slackAppOptions);
  const allow=(body,uid)=>authorized(config,body,uid);
  const homeFilters=new Map();
  const home=async(client,uid,filterOpts=null)=>{
    if(filterOpts)homeFilters.set(uid,filterOpts);
    const activeFilter=homeFilters.get(uid)||{};
    return client.views.publish({user_id:uid,view:homeView(await repo.list(config.team),uid,activeFilter)});
  };
  const tryLog=(logger,e)=>logger.error(e && e.stack ? e.stack : String(e));

  app.event('app_home_opened',async({event,body,client,logger})=>{
    if(event.tab!=='home')return;
    try{if(!allow(body,event.user))return await client.views.publish({user_id:event.user,view:deniedView()});await home(client,event.user);}catch(e){tryLog(logger,e);}
  });

  async function openCreate({ack,body,client,logger}){
    await ack();
    if(!allow(body))return;
    try{await client.views.open({trigger_id:body.trigger_id,view:createModal({enableFiles:config.enableFiles})});}catch(e){tryLog(logger,e);}
  }
  app.action('parkops_create',openCreate);
  app.shortcut('parkops_new',openCreate);
  app.command('/parkops-demo',async({ack,body,client,logger})=>{
    await ack({response_type:'ephemeral',text:allow(body)?'🧪 افتح نافذة البلاغ التجريبي.':'🔒 غير مصرح لك باستخدام التجربة.'});
    if(!allow(body))return;
    try{await client.views.open({trigger_id:body.trigger_id,view:createModal({enableFiles:config.enableFiles})});}catch(e){tryLog(logger,e);}
  });

  app.action('parkops_quick_track',async({ack,body,client,logger})=>{
    await ack();
    if(!allow(body))return;
    try{await client.views.open({trigger_id:body.trigger_id,view:quickTracksModal()});}catch(e){tryLog(logger,e);}
  });

  app.view('parkops_quick_track_submit',async({ack,body,view,client,logger})=>{
    if(!allow(body)){await ack();return;}
    const vals=view.state?.values||{};
    const templateKey=vals.template?.select?.selected_option?.value||'';
    const location=String(vals.location?.input?.value||'').trim();
    const priority=vals.priority?.select?.selected_option?.value||'medium';
    const description=String(vals.description?.input?.value||'').trim();
    if(!location){
      await ack({response_action:'errors',errors:{location:'الموقع مطلوب'}});
      return;
    }
    const [trackId,idxStr]=templateKey.split('::');
    const track=PARK_ST_TRACKS.find(t=>t.id===trackId)||PARK_ST_TRACKS[0];
    const item=track.items[Number(idxStr)]||track.items[0];
    const catMap={security:'security','customer-journey':'customer-journey',landscape:'landscape','traffic-parking':'parking'};
    await ack();
    try{
      await repo.create(config.team,body.user.id,{
        title:item.title,
        location,
        description:description||`بلاغ سريع من قالب (${track.name}): ${item.title}`,
        category:catMap[track.id]||'operations',
        priority,
        trade:item.trade,
        snagType:item.type
      },view.id);
      await home(client,body.user.id);
    }catch(e){tryLog(logger,e);}
  });

  app.action('parkops_refresh',async({ack,body,client,logger})=>{
    await ack();if(!allow(body))return;try{await home(client,body.user.id);}catch(e){tryLog(logger,e);}
  });

  const filterStatusHandler=async({ack,body,action,client,logger})=>{
    await ack();
    if(!allow(body))return;
    try{await home(client,body.user.id,{filterStatus:action.value||'all'});}catch(e){tryLog(logger,e);}
  };
  app.action('parkops_filter_status',filterStatusHandler);
  app.action(/^parkops_filter_status_/,filterStatusHandler);

  app.action('parkops_edit',async({ack,body,action,client,logger})=>{
    await ack();if(!allow(body))return;
    try{const ticket=await repo.get(config.team,action.value);if(!ticket)return;
      const view=updateModal(ticket);if(view)await client.views.open({trigger_id:body.trigger_id,view});
    }catch(e){tryLog(logger,e);}
  });

  app.action('parkops_edit_full',async({ack,body,action,client,logger})=>{
    await ack();if(!allow(body))return;
    try{
      const ticket=await repo.get(config.team,action.value);
      if(!ticket)return;
      const view=editTicketModal(ticket);
      if(view)await client.views.open({trigger_id:body.trigger_id,view});
    }catch(e){tryLog(logger,e);}
  });

  app.action('parkops_delete_ticket',async({ack,body,action,client,logger})=>{
    await ack();if(!allow(body))return;
    try{
      if(repo.remove)await repo.remove(config.team,action.value);
      await home(client,body.user.id);
    }catch(e){tryLog(logger,e);}
  });

  app.view('parkops_create_submit',async({ack,body,view,client,logger})=>{
    if(!allow(body)){await ack({response_action:'errors',errors:{title:'حساب غير مصرح'}});return;}
    const inputs=fromModal(view.state.values);
    const errors=validateNew(inputs);
    if(inputs.assignedTo && !config.users.has(inputs.assignedTo))errors.assignedTo='اختيار مستخدم غير مصرح له في بيئة التجربة';
    if(Object.keys(errors).length){await ack({response_action:'errors',errors});return;}
    // Acknowledge within Slack's 3-second window, then write with idempotency key.
    await ack();
    try{
      const createdId=await repo.create(config.team,body.user.id,inputs,view.id);
      const createdRecord=repo.get?await repo.get(config.team,createdId):{...inputs,isDemo:true,status:'open'};
      await notifyDemoChannelFromApp({client,eventType:'created',documentId:createdId,after:createdRecord||{...inputs,isDemo:true,status:'open'},logger});
      await home(client,body.user.id);
    }catch(e){tryLog(logger,e);}
  });

  app.view('parkops_update_submit',async({ack,body,view,client,logger})=>{
    if(!allow(body)){await ack({response_action:'errors',errors:{status:'حساب غير مصرح'}});return;}
    let id;try{id=JSON.parse(view.private_metadata).id;}catch{id='';}
    const next=view.state.values?.status?.select?.selected_option?.value;
    const note=view.state.values?.note?.input?.value||'';
    const current=await repo.get(config.team,id);
    if(!current||!next||current.status==='closed'||!Object.keys(STATUSES).includes(next)){
      await ack({response_action:'errors',errors:{status:'اختيار غير صالح، أعد فتح البلاغ'}});return;
    }
    // Verify transition pre-ack; repository transaction rechecks on concurrent submissions.
    const {canTransition}=require('./domain');
    if(!canTransition(current.status,next)){
      await ack({response_action:'errors',errors:{status:'انتقال حالة غير مسموح'}});return;
    }
    await ack();
    try{
      const beforeSnapshot={...current};
      await repo.updateStatus(config.team,id,body.user.id,next,note);
      const afterSnapshot=repo.get?await repo.get(config.team,id):{...current,status:next};
      await notifyDemoChannelFromApp({client,eventType:'updated',documentId:id,before:beforeSnapshot,after:afterSnapshot,logger});
      await home(client,body.user.id);
    }catch(e){tryLog(logger,e);}
  });

  app.view('parkops_edit_full_submit',async({ack,body,view,client,logger})=>{
    if(!allow(body)){await ack();return;}
    let id;try{id=JSON.parse(view.private_metadata||'{}').id;}catch{id='';}
    const vals=view.state?.values||{};
    const patch={
      title:vals.title?.input?.value||'',
      location:vals.location?.input?.value||'',
      description:vals.description?.input?.value||'',
      category:vals.category?.select?.selected_option?.value||'',
      priority:vals.priority?.select?.selected_option?.value||'',
      trade:vals.trade?.select?.selected_option?.value||'',
      comment:vals.comment?.input?.value||''
    };
    const errs=validateNew(patch);
    if(Object.keys(errs).length){
      await ack({response_action:'errors',errors:errs});
      return;
    }
    await ack();
    try{
      if(repo.updateTicket)await repo.updateTicket(config.team,id,body.user.id,patch);
      await home(client,body.user.id);
    }catch(e){tryLog(logger,e);}
  });

  registerOperations(app,{repo:moduleRepo,originalRepo:repo,config});
  return app;
}

if(require.main===module){
  try {
    const fs=require('node:fs'),path=require('node:path');
    const envPath=path.join(__dirname,'../.env');
    if(fs.existsSync(envPath)){
      for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){
        const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if(m&&!process.env[m[1]]&&m[2])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');
      }
    }
    const app=createApp();
    app.start().then(()=>console.log('Park Street Operations staging app ready (NO production access).')).catch(e=>{console.error(e.message);process.exitCode=1;});
  }
  catch(e){console.error('Startup refused:',e.message);process.exitCode=1;}
}
module.exports={createApp};
