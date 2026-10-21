'use strict';
const {PARK_ITEMS,PARK_SECTORS,INSPECTION_STATUSES}=require('./catalog');
const {RESTROOMS,COMPONENTS,RESTROOM_ZONES,computeRestroomZoneCoverage,isRestroomRowDefective}=require('./restroomCatalog');
const {TYPES,PERMIT_STATES}=require('./operationsDomain');
const {sortStoresByNo}=require('./storesCatalog');
const {slackEscape}=require('./domain');
const {runFullAnalysis}=require('./ai/engine');

const P=s=>({type:'plain_text',text:String(s).slice(0,150),emoji:true});
const opt=(id,label)=>({text:P(String(label).slice(0,75)),value:String(id)});
const section=(text, accessory)=>({type:'section',text:{type:'mrkdwn',text:String(text).slice(0,3000)},...(accessory?{accessory}:{})});
const button=(id,label,value,style)=>({type:'button',action_id:id,text:P(label),...(value?{value:String(value)}:{}),...(style?{style}:{})});

const NAV=Object.freeze({
  overview:'الرئيسية',
  orders:'أوامر العمل',
  park:'فحص Park Street',
  restroom:'فحص الحمامات',
  unit:'الوحدات',
  store:'المخازن',
  permit:'التصاريح',
  custom:'القوائم الخاصة',
  ai:'مركز الذكاء AI',
  notifications:'الإشعارات',
  reports:'التقارير',
  team:'الفريق والصلاحيات'
});

const PERMIT_STAGE_LABELS=Object.freeze({
  requested:'📝 طلب مبدئي (Requested)',
  'safety-review':'🦺 مراجعة السلامة (Safety Review)',
  'ops-review':'⚙️ مراجعة التشغيل (Ops Review)',
  approved:'✅ معتمد تجريبياً (Approved - Demo)',
  rejected:'❌ مرفوض (Rejected)',
  closed:'🔒 مغلق (Closed)'
});

function navBlock(){
  return {
    type:'actions',
    elements:[
      button('parkops_dashboard','🏠 الرئيسية'),
      button('parkops_modules','📚 الأقسام'),
      button('parkops_create','➕ أمر عمل','create','primary'),
      button('parkops_go_ai','🧠 الذكاء AI','ai'),
      button('parkops_go_reports','📊 التقارير','reports')
    ]
  };
}

function directoryView(){
  const blocks=[
    {type:'header',text:P('🏢 Park Street Operations DEV')},
    section('🧪 *تجريبي فقط.* كل البيانات في Firebase Emulator أو مشروع Staging منفصل، ولا يوجد اتصال ببيانات Firebase الإنتاجية.'),
    navBlock(),
    {type:'divider'}
  ];
  for(const [id,label] of Object.entries(NAV)){
    blocks.push(section(`*${label}*`,button('parkops_go',`فتح ${label}`,id)));
  }
  return {type:'home',blocks};
}

function moduleHome(type,records=[],context={}){
  if(!Object.hasOwn(NAV,type))throw new Error('INVALID_VIEW_TYPE');
  if(type==='overview'||type==='orders')throw new Error('USE_ORIGINAL_DASHBOARD');

  const blocks=[
    {type:'header',text:P(`🏢 ${NAV[type]} — DEV`)},
    section('🔒 بيانات اختبار فقط. لا يتم سحب بيانات Firebase الإنتاجية.'),
    navBlock(),
    {type:'divider'}
  ];

  if(type==='team'){
    const allowedUsers=context.config?.users?[...context.config.users]:[];
    blocks.push(section(
      `🔒 *إدارة الفريق والصلاحيات (RBAC — بيئة Staging المعزولة)*\n` +
      `• مساحة العمل المسموحة: \`${slackEscape(context.config?.team||'غير محدد')}\`\n` +
      `• المستخدمون المصرح لهم (${allowedUsers.length}): ${allowedUsers.map(u=>`<@${slackEscape(u)}>`).join(' ، ')||'قائمة السماح'}\n` +
      `• قناة الاختبار الخاصة الآمنة: \`#snag-ops-demo\` (\`C0CAS6S7RR8\`)\n` +
      `• إدارة مستخدمي Firebase الإنتاجيين معطّلة بالكامل لحماية النظام الإنتاجي.`
    ));
    return {type:'home',blocks};
  }

  if(type==='ai'){
    const tickets=context.tickets||[];
    const parkRecords=context.parkRecords||[];
    const restroomRecords=context.restroomRecords||[];
    const restroomMeta=context.restroomMeta||[];
    const parkMap=Object.fromEntries(parkRecords.map(r=>[r.id||r.key,r]));
    const ai=runFullAnalysis({
      snags:tickets,
      parkInspection:{items:parkMap},
      restroomInspections:restroomMeta.map(m=>({
        ...m,
        items:Object.fromEntries(
          restroomRecords.filter(r=>r.restroomKey===m.restroomKey).map(r=>[r.component,{bad:r.defectiveCount,status:r.conditionStatus}])
        )
      }))
    });

    blocks.push(section(
      `🧠 *مركز القيادة والذكاء التشغيلي (AI Command Center — NCRI v2)*\n` +
      `*مؤشر الصحة التشغيلية:* \`${ai.health.score}/100\` (*${ai.health.grade}*) — ${slackEscape(ai.health.labelAr)}\n` +
      `*معدل الإغلاق:* \`${ai.kpis.resolutionRate}%\` | *متوسط زمن الحل (MTTR):* \`${ai.kpis.mttrHours}h\` | *بلاغات عاجلة مفتوحة:* \`${ai.kpis.urgentOpen}\``
    ));
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_ncri_modal','🤖 تجربة المصنف الذكي NCRI v2','ncri','primary'),
        button('parkops_refresh_module','🔄 تحديث التحليلات','ai')
      ]
    });
    blocks.push({type:'divider'});

    blocks.push(section('*💡 التوصيات الاستباقية الذكية (Proactive Suggestions)*'));
    for(const sug of ai.suggestions.slice(0,5)){
      blocks.push(section(`• *[${slackEscape(sug.priority.toUpperCase())} | ${slackEscape(sug.category)}]* *${slackEscape(sug.titleAr)}*\n  ${slackEscape(sug.actionAr)}`));
    }

    if(ai.hotspots.length){
      blocks.push({type:'divider'});
      blocks.push(section('*📍 البؤر الساخنة حسب الموقع (Spatial Hotspots)*'));
      for(const h of ai.hotspots.slice(0,5)){
        blocks.push(section(`• *${slackEscape(h.location)}* — إجمالي: ${h.total} | مفتوح: ${h.open} | عاجل: ${h.urgent} | التخصص الأبرز: \`${slackEscape(h.dominantTrade)}\` (Risk: ${h.riskScore})`));
      }
    }

    if(ai.anomalies.length||ai.duplicates.length){
      blocks.push({type:'divider'});
      blocks.push(section('*⚠️ رصد الشذوذ والتكرار (Anomaly & Duplicate Detection)*'));
      for(const a of ai.anomalies.slice(0,4)){
        blocks.push(section(`• 🚨 *${slackEscape(a.titleAr)}* — ${slackEscape(a.detailAr)}`));
      }
      for(const d of ai.duplicates.slice(0,3)){
        blocks.push(section(`• 🔁 *اشتباه تكرار (${d.similarity}%)* في \`${slackEscape(d.location)}\`: "${slackEscape(d.firstTitle)}" ↔ "${slackEscape(d.secondTitle)}"`));
      }
    }
    return {type:'home',blocks:blocks.slice(0,95)};
  }

  if(type==='notifications'){
    blocks.push(section(
      `🔔 *مركز الإشعارات وسجل الأحداث التجريبي*\n` +
      `• قناة الاختبار المسموحة: \`#snag-ops-demo\` (\`C0CAS6S7RR8\`) — بيانات تجريبية فقط بدون أي صور أو بيانات شخصية.\n` +
      `• إجمالي الإشعارات المسجلة: *${records.length}*`
    ));
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_send_demo_digest','📤 إرسال ملخص تجريبي لقناة #snag-ops-demo','digest','primary'),
        button('parkops_clear_notifications','🗑️ مسح الإشعارات','clear'),
        button('parkops_refresh_module','🔄 تحديث','notifications')
      ]
    });
    if(!records.length){
      blocks.push(section('لا توجد إشعارات مسجلة حالياً.'));
    } else {
      for(const n of records.slice(0,20)){
        blocks.push(section(`*${slackEscape(n.title)}*\n${slackEscape(n.detail||'')}\n🕒 ${slackEscape(n.updatedAt||'')}`));
      }
    }
    return {type:'home',blocks:blocks.slice(0,95)};
  }

  if(type==='reports'){
    const ticketsCount=(context.tickets||[]).length;
    const parkCount=(context.parkRecords||[]).length;
    const rrCount=(context.restroomRecords||[]).length;
    const unitCount=(context.units||[]).length;
    const storeCount=(context.stores||[]).length;
    const permitCount=(context.permits||[]).length;

    blocks.push(section(
      `📊 *مركز التقارير والتصدير الشامل (ExcelJS / CSV / Companion Web)*\n` +
      `• أوامر العمل (SNAGs): *${ticketsCount}* سجل\n` +
      `• فحص Park Street (51 بند): *${parkCount} / 51* بند مفحوص\n` +
      `• فحص الحمامات (1450 بند): *${rrCount} / 1450* بند مفحوص\n` +
      `• الوحدات: *${unitCount}* | المخازن: *${storeCount}* | التصاريح: *${permitCount}*`
    ));
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_export_xlsx','📥 تصدير ملف Excel الشامل (.xlsx)','xlsx','primary'),
        button('parkops_export_csv','📄 عرض/تصدير ملخص CSV','csv'),
        button('parkops_refresh_module','🔄 تحديث الإحصاءات','reports')
      ]
    });
    if(context.lastExportMessage){
      blocks.push(section(`✅ *نتيجة التصدير الأخير:*\n${slackEscape(context.lastExportMessage)}`));
    }
    return {type:'home',blocks:blocks.slice(0,95)};
  }

  if(type==='park'){
    const sectorFilter=context.sectorFilter||'all';
    const okCount=records.filter(r=>r.status==='ok').length;
    const snagCount=records.filter(r=>r.status==='snag').length;
    const followupCount=records.filter(r=>r.status==='followup').length;

    const sectorSummary=PARK_SECTORS.map(s=>{
      const total=s.zones.reduce((a,z)=>a+z.items.length,0);
      const checked=records.filter(r=>r.sector===s.id).length;
      const snags=records.filter(r=>r.sector===s.id&&r.status==='snag').length;
      return `• *${s.name}*: ${checked}/${total} (Snag: ${snags})`;
    }).join('\n');

    blocks.push(section(
      `*بنود الفحص القياسية:* ${PARK_ITEMS.length}\n` +
      `*القطاعات:* ${PARK_SECTORS.map(x=>x.name).join(' • ')}\n` +
      `*نتائج تجريبية محفوظة:* ${records.length} (✅ مطابق: ${okCount} | 🚨 Snag: ${snagCount} | 🔁 متابعة: ${followupCount})\n` +
      `${sectorSummary}`
    ));
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_add_module','📋 تسجيل فحص Park Street','park','primary'),
        button('parkops_refresh_module','🔄 تحديث','park'),
        button('parkops_export_xlsx','📥 تصدير Excel','park')
      ]
    });
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_park_filter_all','الكل (51)','all'),
        ...PARK_SECTORS.map(s=>button(`parkops_park_filter_${s.id}`,s.name.slice(0,22),s.id))
      ]
    });

    const filtered=sectorFilter==='all'?records:records.filter(r=>r.sector===sectorFilter);
    if(!filtered.length){
      blocks.push(section('لا توجد سجلات تجريبية في هذا القسم حتى الآن.'));
    } else {
      for(const r of filtered.slice(0,25)){
        const title=PARK_ITEMS.find(i=>i.key===r.id)?.name||r.title||r.id;
        const state=INSPECTION_STATUSES[r.status]||'';
        const canPromote=r.status==='snag'||r.status==='followup';
        blocks.push(section(
          `*${slackEscape(title)}*\n${slackEscape(state)} • ${slackEscape(r.zone||'')}\n${slackEscape(r.note||'')}`,
          canPromote?button('parkops_promote_park','🚨 ترحيل لـ SNAG',r.id):undefined
        ));
      }
    }
    return {type:'home',blocks:blocks.slice(0,95)};
  }

  if(type==='restroom'){
    const restroomMeta=context.restroomMeta||[];
    const zoneFilter=context.zoneFilter||'all';
    const zoneCoverage=computeRestroomZoneCoverage(records,restroomMeta);
    const defectsCount=records.filter(isRestroomRowDefective).length;
    const confirmedCount=restroomMeta.filter(m=>m.confirmed).length;

    const coverageText=zoneCoverage.map(z=>
      `• *${z.zone}*: مؤكّد ${z.confirmed}/${z.total} (${z.pct}%) | جولات: ${z.rounds} | أعطال: ${z.defects} | مرايا تالفة: ${z.badMirrors}`
    ).join('\n');

    blocks.push(section(
      `*الحمامات:* ${RESTROOMS.length}\n` +
      `*مكونات لكل حمام:* ${COMPONENTS.length}\n` +
      `*إجمالي البنود:* ${RESTROOMS.length*COMPONENTS.length}\n` +
      `*نتائج تجريبية محفوظة:* ${records.length} | *حمامات مؤكدة:* ${confirmedCount}/50 | *أعطال مرصودة:* ${defectsCount}\n` +
      `*تغطية القطاعات (Zone Coverage):*\n${coverageText}`
    ));
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_add_module','🚽 تسجيل فحص حمام','restroom','primary'),
        button('parkops_restroom_round_modal','✅ تأكيد جولة / اعتماد الحمام سليم','round'),
        button('parkops_promote_all_restrooms','🚨 ترحيل الأعطال لـ SNAG','promote_all'),
        button('parkops_refresh_module','🔄 تحديث','restroom')
      ]
    });
    blocks.push({
      type:'actions',
      elements:[
        button('parkops_restroom_filter_all','الكل','all'),
        button('parkops_restroom_filter_defects','🚨 الأعطال فقط','defects'),
        ...RESTROOM_ZONES.slice(0,3).map((z,idx)=>button(`parkops_restroom_filter_z${idx}`,z,z))
      ]
    });

    const filtered=records.filter(r=>{
      if(zoneFilter==='defects')return isRestroomRowDefective(r);
      if(zoneFilter!=='all')return r.building===zoneFilter;
      return true;
    });

    if(!filtered.length){
      blocks.push(section('لا توجد سجلات تجريبية في هذا القسم حتى الآن.'));
    } else {
      for(const r of filtered.slice(0,22)){
        const compName=COMPONENTS.find(c=>c.code===r.component)?.name||r.component;
        const title=`${r.building} (${r.gender||''}) • ${compName}`;
        const state=r.conditionStatus||`سليم ${r.workingCount} / معطل ${r.defectiveCount} / مفقود ${r.missingCount}`;
        const extra=[r.note,r.actionRequired?`الإجراء: ${r.actionRequired}`:'',r.inspector?`الفاحص: ${r.inspector}`:''].filter(Boolean).join(' | ');
        const defective=isRestroomRowDefective(r);
        blocks.push(section(
          `*${slackEscape(title)}*\n${slackEscape(state)}\n${slackEscape(extra)}`,
          defective?button('parkops_promote_restroom','🚨 ترحيل لـ SNAG',r.id):undefined
        ));
      }
    }
    return {type:'home',blocks:blocks.slice(0,95)};
  }

  // Entities: unit, store, permit, custom
  const displayRecords=type==='store'?sortStoresByNo(records):records;
  const vacantCount=records.filter(r=>r.isVacant).length;
  const statsExtra=(type==='unit'||type==='store')?` (شاغر Vacant: ${vacantCount} | مشغول: ${records.length-vacantCount})`:'';

  blocks.push(section(`*${TYPES[type]||NAV[type]}* | ${records.length} سجل تجريبي${statsExtra}`));

  const actionElements=[
    button('parkops_add_module',`➕ إضافة ${NAV[type]}`,type,'primary'),
    button('parkops_refresh_module','🔄 تحديث',type)
  ];
  if(type==='store'){
    actionElements.push(button('parkops_seed_stores','📦 تحميل الـ 84 مخزن القياسية','seed_stores'));
  } else if(type==='unit'){
    actionElements.push(button('parkops_seed_units','📥 تحميل وحدات تجريبية','seed_units'));
  }
  blocks.push({type:'actions',elements:actionElements});

  if(!displayRecords.length){
    blocks.push(section('لا توجد سجلات تجريبية في هذا القسم حتى الآن.'));
  } else {
    for(const r of displayRecords.slice(0,24)){
      if(type==='unit'){
        const badge=r.isVacant?'🟡 شاغر (Vacant)':'🟢 مشغول';
        const details=[
          r.buildingNo?`مبنى: ${r.buildingNo}`:'',
          r.floor?`دور: ${r.floor}`:'',
          r.unitNo?`وحدة: ${r.unitNo}`:'',
          r.unitOwnerName?`المالك: ${r.unitOwnerName}`:'',
          r.unitManagerName?`المدير: ${r.unitManagerName}`:'',
          r.workingHours?`الدوام: ${r.workingHours}`:'',
          r.companyActivity?`النشاط: ${r.companyActivity}`:''
        ].filter(Boolean).join(' • ');
        blocks.push(section(
          `*${slackEscape(r.title)}*\n${badge} | ${slackEscape(r.location||'')}\n${slackEscape(details||r.description||'')}`
        ));
      } else if(type==='store'){
        const badge=r.isVacant?'🟡 Vacant (شاغر)':'🟢 Occupied';
        blocks.push(section(
          `*${slackEscape(r.title)}*\n${badge} • رقم المخزن: \`${slackEscape(r.storeNo||'-')}\` • الشركة: ${slackEscape(r.companyName||'-')}\n${slackEscape(r.notes||r.description||r.location||'')}`
        ));
      } else if(type==='permit'){
        const stageLabel=PERMIT_STAGE_LABELS[r.approvalStage||r.status]||r.status||'requested';
        blocks.push(section(
          `*${slackEscape(r.title)}*\n${slackEscape(stageLabel)} • ⚠️ يتطلب اعتماداً رسمياً خارج التجربة\n` +
          `${slackEscape([r.location,r.contractorName?`المقاول: ${r.contractorName}`:'',r.workDate?`التاريخ: ${r.workDate}`:'',r.risk?`المخاطر: ${r.risk}`:''].filter(Boolean).join(' • '))}`,
          r.id?button('parkops_permit_stage_modal','🔄 تحديث المرحلة',r.id):undefined
        ));
      } else {
        blocks.push(section(
          `*${slackEscape(r.title)}*\n📋 ${slackEscape(r.listName||r.status||'recorded')}\n${slackEscape(r.note||r.location||r.description||'')}`
        ));
      }
    }
  }
  return {type:'home',blocks:blocks.slice(0,95)};
}

function genericModal(type,{enableFiles=false}={}){
  if(!['unit','store','permit','custom'].includes(type))throw new Error('UNSUPPORTED_GENERIC_MODAL');

  if(type==='unit'){
    return {
      type:'modal',
      callback_id:'parkops_module_submit',
      private_metadata:JSON.stringify({type:'unit'}),
      title:P('إضافة وحدة — Units'),
      submit:P('حفظ تجريبي'),
      close:P('إلغاء'),
      blocks:[
        section(`🧪 *${TYPES.unit}* — يدعم جميع الـ 14 حقلاً القياسية لوحدات Park Street في بيئة معزولة.`),
        {type:'input',block_id:'title',label:P('اسم/رقم الوحدة'),element:{type:'plain_text_input',action_id:'value',max_length:140,placeholder:P('مثال: G-01 — Brunch & Cake أو Vacant')}},
        {type:'input',block_id:'buildingNo',optional:true,label:P('رقم المبنى (Building No)'),element:{type:'plain_text_input',action_id:'value',max_length:40}},
        {type:'input',block_id:'floor',optional:true,label:P('الدور (Floor)'),element:{type:'plain_text_input',action_id:'value',max_length:40}},
        {type:'input',block_id:'unitNo',optional:true,label:P('كود الوحدة (Unit No)'),element:{type:'plain_text_input',action_id:'value',max_length:40}},
        {type:'input',block_id:'unitOwnerName',optional:true,label:P('اسم المالك (Owner Name)'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
        {type:'input',block_id:'unitManagerName',optional:true,label:P('اسم مدير الوحدة (Manager Name)'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
        {type:'input',block_id:'mobileTelOwner',optional:true,label:P('هاتف المالك (Owner Tel)'),element:{type:'plain_text_input',action_id:'value',max_length:60}},
        {type:'input',block_id:'mobileTelManager',optional:true,label:P('هاتف المدير (Manager Tel)'),element:{type:'plain_text_input',action_id:'value',max_length:60}},
        {type:'input',block_id:'mobileTelUnit',optional:true,label:P('هاتف الوحدة (Unit Tel)'),element:{type:'plain_text_input',action_id:'value',max_length:60}},
        {type:'input',block_id:'location',optional:true,label:P('الموقع / العنوان (Address)'),element:{type:'plain_text_input',action_id:'value',max_length:140}},
        {type:'input',block_id:'email',optional:true,label:P('البريد الإلكتروني (Email)'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
        {type:'input',block_id:'workingHours',optional:true,label:P('ساعات العمل (Working Hours)'),element:{type:'plain_text_input',action_id:'value',max_length:100}},
        {type:'input',block_id:'weeklyOff',optional:true,label:P('الراحة الأسبوعية (Weekly Off)'),element:{type:'plain_text_input',action_id:'value',max_length:100}},
        {type:'input',block_id:'description',optional:true,label:P('النشاط التجاري / التفاصيل (Company Activity)'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:1200}}
      ]
    };
  }

  if(type==='store'){
    return {
      type:'modal',
      callback_id:'parkops_module_submit',
      private_metadata:JSON.stringify({type:'store'}),
      title:P('إضافة مخزن — Stores'),
      submit:P('حفظ تجريبي'),
      close:P('إلغاء'),
      blocks:[
        section(`🧪 *${TYPES.store}* — إدارة مخازن Park Street (مع تتبع الشواغر Vacant).`),
        {type:'input',block_id:'title',label:P('اسم/رقم المخزن'),element:{type:'plain_text_input',action_id:'value',max_length:140,placeholder:P('مثال: مخزن 79 — IT Hospitality أو Vacant')}},
        {type:'input',block_id:'storeNo',optional:true,label:P('رقم المخزن (Store No)'),element:{type:'plain_text_input',action_id:'value',max_length:40,placeholder:P('مثال: 79')}},
        {type:'input',block_id:'companyName',optional:true,label:P('اسم الشركة / المستأجر (أو Vacant)'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
        {type:'input',block_id:'location',optional:true,label:P('الموقع'),element:{type:'plain_text_input',action_id:'value',max_length:140}},
        {type:'input',block_id:'description',optional:true,label:P('الملاحظات والتفاصيل'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:1200}},
        ...(enableFiles?[{type:'input',block_id:'files',optional:true,label:P('صور المخزن (حتى 4)'),element:{type:'file_input',action_id:'file',filetypes:['jpg','jpeg','png','pdf'],max_files:4}}]:[])
      ]
    };
  }

  return {
    type:'modal',
    callback_id:'parkops_module_submit',
    private_metadata:JSON.stringify({type}),
    title:P('Park Street Ops DEV'),
    submit:P('حفظ تجريبي'),
    close:P('إلغاء'),
    blocks:[
      section(`🧪 *${TYPES[type]}* — هذا النموذج لا يكتب على النظام الحقيقي.`),
      ...(type==='custom'?[{type:'input',block_id:'listName',optional:true,label:P('اسم القائمة المخصصة'),element:{type:'plain_text_input',action_id:'value',max_length:80,placeholder:P('مثال: قائمة فحص الفعاليات الموسمية')}}]:[]),
      {type:'input',block_id:'title',label:P(type==='permit'?'نوع تصريح العمل':'عنوان البند'),element:{type:'plain_text_input',action_id:'value',max_length:140}},
      {type:'input',block_id:'location',optional:true,label:P('الموقع'),element:{type:'plain_text_input',action_id:'value',max_length:140}},
      {type:'input',block_id:'description',optional:true,label:P('التفاصيل'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:1200}},
      ...(type==='permit'?[
        {type:'input',block_id:'contractorName',optional:true,label:P('الشركة المنفذة / المقاول'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
        {type:'input',block_id:'workDate',optional:true,label:P('تاريخ العمل'),element:{type:'plain_text_input',action_id:'value',max_length:30}},
        {type:'input',block_id:'risk',optional:true,label:P('المخاطر واحتياطات السلامة'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:400}}
      ]:[])
    ]
  };
}

function parkModal({enableFiles=false}={}){
  return {
    type:'modal',
    callback_id:'parkops_module_submit',
    private_metadata:JSON.stringify({type:'park'}),
    title:P('تفتيش Park Street'),
    submit:P('تسجيل تجريبي'),
    close:P('إلغاء'),
    blocks:[
      section('🧪 نفس الـ 51 بندًا ومعرّفاتهم الأصلية — في قاعدة اختبار منفصلة.'),
      {type:'input',block_id:'key',label:P('بند الفحص'),element:{type:'static_select',action_id:'value',placeholder:P('اختر بندًا'),options:PARK_ITEMS.map(i=>opt(i.key,`${i.code} • ${i.name}`))}},
      {type:'input',block_id:'status',label:P('النتيجة'),element:{type:'static_select',action_id:'value',options:Object.entries(INSPECTION_STATUSES).filter(([id])=>id!=='na').map(([id,n])=>opt(id,n))}},
      {type:'input',block_id:'note',optional:true,label:P('الملاحظات'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:1200}},
      ...(enableFiles?[{type:'input',block_id:'files',optional:true,label:P('صور الإثبات (اختياري)'),element:{type:'file_input',action_id:'file',filetypes:['jpg','jpeg','png','pdf'],max_files:4}}]:[])
    ]
  };
}

function restroomModal({enableFiles=false}={}){
  return {
    type:'modal',
    callback_id:'parkops_module_submit',
    private_metadata:JSON.stringify({type:'restroom'}),
    title:P('فحص الحمامات'),
    submit:P('حفظ تجريبي'),
    close:P('إلغاء'),
    blocks:[
      section('🧪 50 حمامًا × 29 مكوّنًا. للتعداد تحقق من: السليم + المعطل + المفقود = الإجمالي.'),
      {type:'input',block_id:'restroomKey',label:P('الحمام'),element:{type:'static_select',action_id:'value',options:RESTROOMS.map(r=>opt(r.key,`${r.building} ${r.direction} ${r.floor} ${r.gender}`))}},
      {type:'input',block_id:'component',label:P('المكوّن'),element:{type:'static_select',action_id:'value',options:COMPONENTS.map(r=>opt(r.code,r.name))}},
      {type:'input',block_id:'totalCount',optional:true,label:P('العدد الإجمالي (عناصر التعداد فقط)'),element:{type:'number_input',action_id:'value',is_decimal_allowed:false,min_value:'0',max_value:'10000'}},
      {type:'input',block_id:'workingCount',optional:true,label:P('العدد السليم'),element:{type:'number_input',action_id:'value',is_decimal_allowed:false,min_value:'0',max_value:'10000'}},
      {type:'input',block_id:'defectiveCount',optional:true,label:P('العدد المعطل'),element:{type:'number_input',action_id:'value',is_decimal_allowed:false,min_value:'0',max_value:'10000'}},
      {type:'input',block_id:'missingCount',optional:true,label:P('العدد المفقود'),element:{type:'number_input',action_id:'value',is_decimal_allowed:false,min_value:'0',max_value:'10000'}},
      {type:'input',block_id:'conditionStatus',optional:true,label:P('نتيجة فحص الحالة (لعناصر الحالة فقط)'),element:{type:'static_select',action_id:'value',options:['سليم','عطل','متوسط','تالف','ناقص','يحتاج نظافة'].map(x=>opt(x,x))}},
      {type:'input',block_id:'actionRequired',optional:true,label:P('الإجراء المطلوب'),element:{type:'plain_text_input',action_id:'value',max_length:240}},
      {type:'input',block_id:'inspector',optional:true,label:P('القائم بالفحص'),element:{type:'plain_text_input',action_id:'value',max_length:120}},
      {type:'input',block_id:'note',optional:true,label:P('الملاحظات'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:900}},
      ...(enableFiles?[{type:'input',block_id:'files',optional:true,label:P('صور الإثبات'),element:{type:'file_input',action_id:'file',filetypes:['jpg','jpeg','png','pdf'],max_files:4}}]:[])
    ]
  };
}

function restroomRoundModal(){
  return {
    type:'modal',
    callback_id:'parkops_restroom_round_submit',
    title:P('اعتماد جولة حمام'),
    submit:P('تأكيد الجولة'),
    close:P('إلغاء'),
    blocks:[
      section('✅ اختر الحمام لتأكيد فحصه وتسجيل الجولة، أو اعتماد باقي بنوده الـ 29 سليمة تلقائياً:'),
      {type:'input',block_id:'restroomKey',label:P('الحمام'),element:{type:'static_select',action_id:'value',options:RESTROOMS.map(r=>opt(r.key,`${r.building} ${r.direction} ${r.floor} ${r.gender}`))}},
      {type:'input',block_id:'mode',label:P('نوع الإجراء'),element:{type:'static_select',action_id:'value',options:[
        opt('confirm_only','تأكيد/تبديل حالة الفحص وتسجيل جولة'),
        opt('mark_all_ok','اعتماد باقي بنود الحمام الـ 29 سليمة + تأكيد الجولة')
      ]}},
      {type:'input',block_id:'inspector',optional:true,label:P('اسم القائم بالفحص'),element:{type:'plain_text_input',action_id:'value',max_length:120}}
    ]
  };
}

function permitStageModal(permit){
  return {
    type:'modal',
    callback_id:'parkops_permit_stage_submit',
    private_metadata:JSON.stringify({id:permit.id}),
    title:P('تحديث مرحلة التصريح'),
    submit:P('حفظ المرحلة'),
    close:P('إلغاء'),
    blocks:[
      section(`*${slackEscape(permit.title)}*\n⚠️ جميع التصاريح في بيئة الاختبار تحمل \`requiresOfficialApproval: true\`.`),
      {type:'input',block_id:'stage',label:P('المرحلة الجديدة'),element:{type:'static_select',action_id:'value',options:PERMIT_STATES.map(s=>opt(s,PERMIT_STAGE_LABELS[s]||s))}},
      {type:'input',block_id:'note',optional:true,label:P('ملاحظة المراجعة'),element:{type:'plain_text_input',action_id:'value',max_length:240}}
    ]
  };
}

function ncriTestModal(result=null){
  const blocks=[
    section('🤖 *المصنف اللغوي الذكي NCRI v2* — اكتب وصف أي ملاحظة بالعربية أو الإنجليزية ليقوم المحرك بتحديد التخصص والقسم والأولوية وزمن الاستجابة (SLA):'),
    {type:'input',block_id:'sampleText',label:P('نص البلاغ أو الملاحظة'),element:{type:'plain_text_input',action_id:'value',multiline:true,max_length:500,placeholder:P('مثال: تسريب مياه شديد في حمام البلازا رجالي بجانب مبنى 1')}}
  ];
  if(result){
    blocks.push({type:'divider'});
    blocks.push(section(
      `✅ *نتيجة تحليل NCRI v2 (ثقة ${Math.round(result.confidence*100)}%):*\n` +
      `• *التخصص الهندسي (Trade):* \`${slackEscape(result.trade)}\`\n` +
      `• *القطاع (Sector):* \`${slackEscape(result.sector)}\`\n` +
      `• *الأولوية المقترحة:* \`${slackEscape(result.priority)}\` (${slackEscape(result.urgencyLevel)})\n` +
      `• *الموقع المستنتج:* \`${slackEscape(result.suggestedLocation)}\`\n` +
      `• *زمن الاستجابة المستهدف (SLA):* \`${result.estimatedSlaHours} ساعة\`\n` +
      `• *الإجراء المقترح:* ${slackEscape(result.suggestedAction)}`
    ));
  }
  return {
    type:'modal',
    callback_id:'parkops_ncri_submit',
    title:P('المصنف الذكي NCRI v2'),
    submit:P('تحليل النص'),
    close:P('إغلاق'),
    blocks
  };
}

function moduleModal(type,opts={}){
  return type==='park'?parkModal(opts):type==='restroom'?restroomModal(opts):genericModal(type,opts);
}

function parseModuleForm(type,values){
  const read=id=>{const obj=values?.[id]?.value;return obj?.value??obj?.selected_option?.value??null;};
  const photoIds=values?.files?.file?.files||[];
  if(type==='park')return {key:read('key'),status:read('status'),note:read('note'),photoIds};
  if(type==='restroom'){
    const base=Object.fromEntries(['restroomKey','component','totalCount','workingCount','defectiveCount','missingCount','conditionStatus','note'].map(k=>[k,read(k)]));
    const actionRequired=read('actionRequired');
    const inspector=read('inspector');
    return {
      ...base,
      ...(actionRequired?{actionRequired}:{}),
      ...(inspector?{inspector}:{}),
      photoIds
    };
  }
  const base=Object.fromEntries(['title','location','description','risk'].map(k=>[k,read(k)]));
  const extraKeys=['buildingNo','floor','unitNo','unitName','unitOwnerName','unitManagerName','mobileTelOwner','mobileTelManager','mobileTelUnit','address','email','workingHours','weeklyOff','companyActivity','storeNo','companyName','notes','contractorName','workDate','listName','subtitle'];
  for(const k of extraKeys){
    const val=read(k);
    if(val!==null&&val!==undefined&&val!=='')base[k]=val;
  }
  if(photoIds.length)base.photoIds=photoIds;
  return base;
}

module.exports={
  NAV,
  PERMIT_STAGE_LABELS,
  directoryView,
  moduleHome,
  genericModal,
  parkModal,
  restroomModal,
  restroomRoundModal,
  permitStageModal,
  ncriTestModal,
  moduleModal,
  parseModuleForm
};
