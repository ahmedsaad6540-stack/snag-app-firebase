'use strict';
const {CATEGORIES,PRIORITIES,STATUSES,NEXT,TRADES,SNAG_TYPES,PARK_ST_TRACKS,slackEscape} = require('./domain');
const plain = (s)=>({type:'plain_text',text:String(s).slice(0,150),emoji:true});
const option = (value,label)=>({text:plain(String(label).slice(0,75)),value:String(value)});

function createModal({enableFiles=false,prefill=null}={}){
  const categoryOptions=[
    option('auto','🤖 تصنيف تلقائي ذكي (NCRI v2)'),
    ...Object.entries(CATEGORIES).map(([v,l])=>option(v,l))
  ];
  const priorityOptions=[
    option('auto','🤖 تحديد تلقائي للأولوية (NCRI v2)'),
    ...Object.entries(PRIORITIES).map(([v,l])=>option(v,l))
  ];
  return {
    type:'modal',
    callback_id:'parkops_create_submit',
    title:plain('Park Street Ops'),
    submit:plain('حفظ تجريبي'),
    close:plain('إلغاء'),
    blocks:[
      {type:'section',text:{type:'mrkdwn',text:'🧪 *نسخة تجريبية* — البلاغ محفوظ خارج المشروع الإنتاجي. يدعم التصنيف الذكي NCRI v2.'}},
      {type:'input',block_id:'title',label:plain('عنوان البلاغ'),element:{type:'plain_text_input',action_id:'input',max_length:120,...(prefill?.title?{initial_value:String(prefill.title).slice(0,120)}:{}),placeholder:plain('مثال: سبوت إضاءة لا يعمل')}},
      {type:'input',block_id:'location',label:plain('الموقع'),element:{type:'plain_text_input',action_id:'input',max_length:120,...(prefill?.location?{initial_value:String(prefill.location).slice(0,120)}:{}),placeholder:plain('مثال: البلازا — حمام رجال')}},
      {type:'input',block_id:'description',optional:true,label:plain('تفاصيل إضافية'),element:{type:'plain_text_input',action_id:'input',multiline:true,max_length:1200,...(prefill?.description?{initial_value:String(prefill.description).slice(0,1200)}:{})}},
      {type:'input',block_id:'category',label:plain('القسم'),element:{type:'static_select',action_id:'select',options:categoryOptions,...(prefill?.category&&CATEGORIES[prefill.category]?{initial_option:option(prefill.category,CATEGORIES[prefill.category])}:{})}},
      {type:'input',block_id:'priority',label:plain('الأولوية'),element:{type:'static_select',action_id:'select',options:priorityOptions,...(prefill?.priority&&PRIORITIES[prefill.priority]?{initial_option:option(prefill.priority,PRIORITIES[prefill.priority])}:{})}},
      {type:'input',block_id:'trade',optional:true,label:plain('التخصص الهندسي (Trade)'),element:{type:'static_select',action_id:'select',options:TRADES.map(t=>option(t,t)),...(prefill?.trade&&TRADES.includes(prefill.trade)?{initial_option:option(prefill.trade,prefill.trade)}:{})}},
      {type:'input',block_id:'snagType',optional:true,label:plain('نوع البلاغ'),element:{type:'static_select',action_id:'select',options:Object.entries(SNAG_TYPES).map(([k,v])=>option(k,v))}},
      {type:'input',block_id:'assignedTo',optional:true,label:plain('المسؤول (مستخدم مسموح في التجربة فقط)'),element:{type:'users_select',action_id:'user',placeholder:plain('اختيار مستخدم (تجريبي)')}},
      {type:'input',block_id:'dueDate',optional:true,label:plain('موعد الاستحقاق'),element:{type:'datepicker',action_id:'date',placeholder:plain('اختيار تاريخ')}},
      ...(enableFiles?[{type:'input',block_id:'files',optional:true,label:plain('صور قبل / بعد (4 حد أقصى)'),element:{type:'file_input',action_id:'file',filetypes:['jpg','jpeg','png','pdf'],max_files:4}}]:[])
    ]
  };
}

function updateModal(ticket){
  const available=NEXT[ticket.status] || [];
  if(!available.length) return null;
  return {
    type:'modal',
    callback_id:'parkops_update_submit',
    title:plain('تحديث أمر العمل'),
    submit:plain('حفظ'),
    close:plain('إلغاء'),
    private_metadata:JSON.stringify({id:ticket.id}),
    blocks:[
      {type:'section',text:{type:'mrkdwn',text:`*${slackEscape(ticket.title)}*\nالحالة الآن: ${STATUSES[ticket.status]||'غير معروف'}`}},
      {type:'input',block_id:'status',label:plain('الحالة الجديدة'),element:{type:'static_select',action_id:'select',options:available.map(s=>option(s,STATUSES[s]))}},
      {type:'input',block_id:'note',optional:true,label:plain('ملاحظة المتابعة / الإغلاق (اختياري)'),element:{type:'plain_text_input',action_id:'input',multiline:true,max_length:500}}
    ]
  };
}

function editTicketModal(ticket){
  if(!ticket) return null;
  return {
    type:'modal',
    callback_id:'parkops_edit_full_submit',
    title:plain('تعديل بيانات البلاغ'),
    submit:plain('حفظ التعديلات'),
    close:plain('إلغاء'),
    private_metadata:JSON.stringify({id:ticket.id}),
    blocks:[
      {type:'input',block_id:'title',label:plain('عنوان البلاغ'),element:{type:'plain_text_input',action_id:'input',max_length:120,initial_value:String(ticket.title||'').slice(0,120)}},
      {type:'input',block_id:'location',label:plain('الموقع'),element:{type:'plain_text_input',action_id:'input',max_length:120,initial_value:String(ticket.location||'').slice(0,120)}},
      {type:'input',block_id:'description',optional:true,label:plain('التفاصيل'),element:{type:'plain_text_input',action_id:'input',multiline:true,max_length:1200,initial_value:String(ticket.description||'').slice(0,1200)}},
      {type:'input',block_id:'category',label:plain('القسم'),element:{type:'static_select',action_id:'select',options:Object.entries(CATEGORIES).map(([v,l])=>option(v,l)),...(CATEGORIES[ticket.category]?{initial_option:option(ticket.category,CATEGORIES[ticket.category])}:{})}},
      {type:'input',block_id:'priority',label:plain('الأولوية'),element:{type:'static_select',action_id:'select',options:Object.entries(PRIORITIES).map(([v,l])=>option(v,l)),...(PRIORITIES[ticket.priority]?{initial_option:option(ticket.priority,PRIORITIES[ticket.priority])}:{})}},
      {type:'input',block_id:'trade',optional:true,label:plain('التخصص الهندسي'),element:{type:'static_select',action_id:'select',options:TRADES.map(t=>option(t,t)),...(ticket.trade&&TRADES.includes(ticket.trade)?{initial_option:option(ticket.trade,ticket.trade)}:{})}},
      {type:'input',block_id:'comment',optional:true,label:plain('إضافة تعليق جديد'),element:{type:'plain_text_input',action_id:'input',max_length:500}}
    ]
  };
}

function quickTracksModal(){
  const allOptions=[];
  for(const track of PARK_ST_TRACKS){
    for(let i=0;i<track.items.length;i+=1){
      const it=track.items[i];
      allOptions.push(option(`${track.id}::${i}`,`${track.name} • ${it.title} (${it.trade})`));
    }
  }
  return {
    type:'modal',
    callback_id:'parkops_quick_track_submit',
    title:plain('بلاغ سريع من القوالب'),
    submit:plain('إنشاء البلاغ'),
    close:plain('إلغاء'),
    blocks:[
      {type:'section',text:{type:'mrkdwn',text:'⚡ اختر من قوالب التفتيش السريع المعتمدة في Park Street ليتم تصنيف القسم والتخصص تلقائيًا:'}},
      {type:'input',block_id:'template',label:plain('قالب الفحص السريع'),element:{type:'static_select',action_id:'select',options:allOptions.slice(0,95)}},
      {type:'input',block_id:'location',label:plain('الموقع المحدد'),element:{type:'plain_text_input',action_id:'input',max_length:120,placeholder:plain('مثال: البلازا أمام مبنى B2')}},
      {type:'input',block_id:'priority',label:plain('الأولوية'),element:{type:'static_select',action_id:'select',options:Object.entries(PRIORITIES).map(([v,l])=>option(v,l)),initial_option:option('medium',PRIORITIES.medium)}},
      {type:'input',block_id:'description',optional:true,label:plain('ملاحظة الفحص'),element:{type:'plain_text_input',action_id:'input',multiline:true,max_length:800}}
    ]
  };
}

function homeView(tickets=[], userId='', options={}){
  const filterStatus=options.filterStatus||'all';
  const filterCategory=options.filterCategory||'all';
  const counts=Object.fromEntries(Object.keys(STATUSES).map(k=>[k,tickets.filter(t=>t.status===k).length]));
  const urgentCount=tickets.filter(t=>t.status!=='closed'&&(t.priority==='urgent'||t.priority==='high')).length;

  const filtered=tickets.filter(t=>{
    if(filterStatus==='urgent')return t.status!=='closed'&&(t.priority==='urgent'||t.priority==='high');
    if(filterStatus!=='all'&&t.status!==filterStatus)return false;
    if(filterCategory!=='all'&&t.category!==filterCategory)return false;
    return true;
  });

  const blocks=[
    {type:'header',text:plain('🏢 Park Street Operations')},
    {type:'section',text:{type:'mrkdwn',text:'🧪 *بيئة تجريبية منفصلة* — لا توجد بيانات حقيقية ولا اتصال بقاعدة SNAG الإنتاجية.'}},
    {type:'section',text:{type:'mrkdwn',text:`*إجمالي البلاغات التجريبية:* ${tickets.length}   |   🚨 *عاجلة نشطة:* ${urgentCount}\n🔵 جديد: ${counts.open}   🟠 قيد التنفيذ: ${counts['in-progress']}   🟡 للمراجعة: ${counts.review}   ✅ مغلق: ${counts.closed}`}},
    {type:'actions',elements:[
      {type:'button',action_id:'parkops_create',text:plain('➕ بلاغ تجريبي جديد'),style:'primary'},
      {type:'button',action_id:'parkops_quick_track',text:plain('⚡ قالب فحص سريع')},
      {type:'button',action_id:'parkops_refresh',text:plain('🔄 تحديث القائمة')},
      {type:'button',action_id:'parkops_modules',text:plain('📚 بقية الوحدات')},
      {type:'button',action_id:'parkops_go',text:plain('🧠 مركز الذكاء AI'),value:'ai'}
    ]},
    {type:'actions',elements:[
      {type:'button',action_id:'parkops_filter_status',text:plain(`الكل (${tickets.length})`),value:'all'},
      {type:'button',action_id:'parkops_filter_status',text:plain(`🔵 جديد (${counts.open})`),value:'open'},
      {type:'button',action_id:'parkops_filter_status',text:plain(`🟠 تنفيذ (${counts['in-progress']})`),value:'in-progress'},
      {type:'button',action_id:'parkops_filter_status',text:plain(`🟡 مراجعة (${counts.review})`),value:'review'},
      {type:'button',action_id:'parkops_filter_status',text:plain(`🚨 عاجل (${urgentCount})`),value:'urgent'}
    ]},
    {type:'divider'},
    {type:'section',text:{type:'mrkdwn',text:`*آخر أوامر العمل التجريبية* ${filterStatus!=='all'?`(تصفية: ${STATUSES[filterStatus]||filterStatus})`:''}`}}
  ];

  if(!filtered.length){
    blocks.push({type:'section',text:{type:'mrkdwn',text:'لا توجد بلاغات مطابقة حتى الآن. جرّب زر *بلاغ تجريبي جديد* أو *قالب فحص سريع*.'}});
  }

  for(const t of filtered.slice(0,12)){
    const status=STATUSES[t.status] || 'غير محدد';
    const tradeInfo=t.trade?` • 🛠️ ${slackEscape(t.trade)}`:'';
    const lastComment=Array.isArray(t.comments)&&t.comments.length?`\n💬 آخر ملاحظة: ${slackEscape(t.comments[t.comments.length-1].text)}`:'';
    blocks.push({
      type:'section',
      text:{
        type:'mrkdwn',
        text:`*${slackEscape(t.title)}*\n${slackEscape(t.location)} • ${CATEGORIES[t.category]||''} • ${PRIORITIES[t.priority]||''}${tradeInfo}\n*الحالة:* ${status}\n${t.assignedTo?'المسؤول: <@'+t.assignedTo+'>\n':''}${t.dueDate?'الاستحقاق: '+t.dueDate+'\n':''}المعرف: \`${t.id}\`${lastComment}`
      },
      accessory:t.status!=='closed'?{type:'button',action_id:'parkops_edit',text:plain('تغيير الحالة'),value:t.id}:undefined
    });
    blocks.push({
      type:'actions',
      elements:[
        {type:'button',action_id:'parkops_edit_full',text:plain('✏️ تعديل / تعليق'),value:t.id},
        ...(t.status!=='closed'?[{type:'button',action_id:'parkops_delete_ticket',text:plain('🗑️ حذف تجريبي'),style:'danger',value:t.id}]:[])
      ]
    });
    blocks.push({type:'divider'});
  }
  return {type:'home',blocks:blocks.slice(0,98)};
}

function deniedView(){
  return {
    type:'home',
    blocks:[
      {type:'header',text:plain('Park Street Operations')},
      {type:'section',text:{type:'mrkdwn',text:'🔒 حسابك غير مضاف إلى قائمة مستخدمي التجربة. لا توجد صلاحية لعرض البيانات.'}}
    ]
  };
}

module.exports={createModal,updateModal,editTicketModal,quickTracksModal,homeView,deniedView};
