'use strict';
const {PARK_BY_KEY,INSPECTION_STATUSES}=require('./catalog');
const {RESTROOM_BY_KEY,COMPONENT_BY_CODE}=require('./restroomCatalog');
const {isVacantText}=require('./storesCatalog');
const {text}=require('./domain');

const TYPES=Object.freeze({
  park:'تفتيش Park Street',
  restroom:'فحص الحمامات',
  unit:'الوحدات',
  store:'المخازن',
  permit:'تصاريح العمل',
  custom:'القوائم المخصصة'
});
const ENTITY_TYPES=new Set(['unit','store','permit','custom']);
const PERMIT_STATES=Object.freeze(['requested','safety-review','ops-review','approved','rejected','closed']);
const ALLOWED_CONDITIONS=new Set(['سليم','عطل','متوسط','تالف','ناقص','يحتاج نظافة']);

function normalizeInspection(values, actor, at=new Date().toISOString()) {
  const key=text(values?.key,200),reference=PARK_BY_KEY[key],status=text(values?.status,20);
  if(!reference||!Object.hasOwn(INSPECTION_STATUSES,status)||status==='na')throw new Error('INVALID_PARK_INSPECTION');
  return {
    id:key,
    key,
    sector:reference.sector,
    zone:reference.zone,
    item:reference.id,
    code:reference.code,
    title:reference.name,
    spec:reference.spec||'',
    status,
    note:text(values?.note,1200),
    isDemo:true,
    source:'slack-staging',
    updatedBy:actor,
    updatedAt:at,
    photoIds:validateFileIds(values?.photoIds)
  };
}

function numeric(v){
  if(v===null||v===undefined||v==='')return null;
  if(!/^\d{1,5}$/.test(String(v).trim()))throw new Error('INVALID_COUNT');
  const n=Number(v);
  if(n>10000)throw new Error('COUNT_LIMIT');
  return n;
}

function validateFileIds(input){
  if(input===undefined||input===null)return [];
  if(!Array.isArray(input)||input.length>4||input.some(x=>typeof x!=='string'||!/^F[A-Z0-9]{8,20}$/.test(x)))throw new Error('INVALID_FILE_IDS');
  return input;
}

function normalizeRestroom(values,actor,at=new Date().toISOString()){
  const restroomKey=text(values?.restroomKey,100),componentCode=text(values?.component,100);
  const room=RESTROOM_BY_KEY[restroomKey],comp=COMPONENT_BY_CODE[componentCode];
  if(!room||!comp)throw new Error('INVALID_RESTROOM_ITEM');
  const total=numeric(values?.totalCount),working=numeric(values?.workingCount),defective=numeric(values?.defectiveCount),missing=numeric(values?.missingCount);
  if(comp.type==='عدد'&&(total===null||working===null||defective===null||missing===null||working+defective+missing!==total))throw new Error('INVALID_COUNT_SUM');
  const condition=text(values?.conditionStatus,30);
  if(comp.type==='حالة'&&!ALLOWED_CONDITIONS.has(condition))throw new Error('INVALID_CONDITION');
  return {
    id:`${restroomKey}__${componentCode}`,
    restroomKey,
    component:componentCode,
    componentName:comp.name,
    trade:comp.trade,
    inputType:comp.type,
    building:room.building,
    direction:room.direction,
    floor:room.floor,
    gender:room.gender,
    conditionStatus:comp.type==='حالة'?condition:'',
    totalCount:comp.type==='عدد'?total:null,
    workingCount:comp.type==='عدد'?working:null,
    defectiveCount:comp.type==='عدد'?defective:null,
    missingCount:comp.type==='عدد'?missing:null,
    note:text(values?.note,1000),
    actionRequired:text(values?.actionRequired,300),
    inspector:text(values?.inspector,120),
    inspectDate:text(values?.inspectDate,20)||at.slice(0,10),
    photoIds:validateFileIds(values?.photoIds),
    updatedAt:at,
    updatedBy:actor,
    isDemo:true,
    source:'slack-staging'
  };
}

function normalizeEntity(type,values,actor,at=new Date().toISOString()){
  if(!ENTITY_TYPES.has(type))throw new Error('INVALID_ENTITY_TYPE');
  const rawTitle=text(values?.title||values?.unitName||values?.companyName||(values?.storeNo?`مخزن ${values.storeNo}`:''),140);
  const location=text(values?.location||[values?.buildingNo,values?.floor,values?.unitNo].filter(Boolean).join(' • '),140);
  const description=text(values?.description||values?.companyActivity||values?.notes,1200);
  if(rawTitle.length<3)throw new Error('INVALID_TITLE');

  const extra={};
  if(type==='unit'){
    extra.buildingNo=text(values?.buildingNo,40);
    extra.floor=text(values?.floor,40);
    extra.unitNo=text(values?.unitNo,40);
    extra.unitName=text(values?.unitName||rawTitle,140);
    extra.unitOwnerName=text(values?.unitOwnerName,120);
    extra.unitManagerName=text(values?.unitManagerName,120);
    extra.mobileTelOwner=text(values?.mobileTelOwner,60);
    extra.mobileTelManager=text(values?.mobileTelManager,60);
    extra.mobileTelUnit=text(values?.mobileTelUnit,60);
    extra.address=text(values?.address||location,200);
    extra.email=text(values?.email,120);
    extra.workingHours=text(values?.workingHours,100);
    extra.weeklyOff=text(values?.weeklyOff,100);
    extra.companyActivity=text(values?.companyActivity||description,200);
    extra.isVacant=isVacantText(extra.unitName);
  } else if(type==='store'){
    extra.storeNo=text(values?.storeNo,40)||rawTitle.replace(/[^\d]/g,'').slice(0,10)||'';
    extra.companyName=text(values?.companyName||rawTitle,140);
    extra.notes=text(values?.notes||description,600);
    extra.isVacant=isVacantText(extra.companyName);
  } else if(type==='permit'){
    extra.status='requested';
    extra.approvalStage=PERMIT_STATES.includes(values?.approvalStage)?values.approvalStage:'requested';
    extra.contractorName=text(values?.contractorName,120);
    extra.workDate=text(values?.workDate,30)||at.slice(0,10);
    extra.risk=text(values?.risk,400);
    extra.requiresOfficialApproval=true;
  } else if(type==='custom'){
    extra.listName=text(values?.listName,80)||'قائمة مخصصة عامة';
    extra.subtitle=text(values?.subtitle||location,140);
  }
  if(values?.photoIds?.length){
    extra.photoIds=validateFileIds(values.photoIds);
  }

  return {
    title:rawTitle,
    location,
    description,
    type,
    ...extra,
    createdBy:actor,
    updatedBy:actor,
    createdAt:at,
    updatedAt:at,
    isDemo:true,
    source:'slack-staging'
  };
}

function buildPromotedSnagFromParkItem(parkRecord){
  if(!parkRecord||!parkRecord.id)throw new Error('INVALID_PARK_RECORD');
  const catMap={
    security:'security',
    'customer-journey':'customer-journey',
    landscape:'landscape',
    'traffic-parking':'parking'
  };
  return {
    title:`[فحص Park St] ${parkRecord.title||parkRecord.id}`.slice(0,120),
    location:`${parkRecord.zone||'Park Street'}`.slice(0,120),
    description:`بند تفتيش (${parkRecord.code||parkRecord.id}): ${parkRecord.note||'تم رصد ملاحظة تتطلب معالجة'}`.slice(0,1200),
    category:catMap[parkRecord.sector]||'operations',
    priority:parkRecord.status==='snag'?'high':'medium',
    sourceRef:{module:'park',id:parkRecord.id}
  };
}

const RESTROOM_TRADE_MAP={
  'الكهرباء':'Electrical',
  'التهوية':'HVAC',
  'الأعمال المدنية':'Civil',
  'السباكة':'Plumbing',
  'التجهيزات':'Housekeeping',
  'السلامة والإتاحة':'Safety'
};

function buildPromotedSnagFromRestroomRow(row){
  if(!row||!row.restroomKey||!row.component)throw new Error('INVALID_RESTROOM_ITEM');
  const comp=COMPONENT_BY_CODE[row.component]||{name:row.component,trade:'السباكة'};
  const room=RESTROOM_BY_KEY[row.restroomKey]||{building:row.building||'',direction:'',floor:'',gender:row.gender||''};
  const countStr=row.totalCount!==null&&row.totalCount!==undefined
    ?`إجمالي ${row.totalCount} | سليم ${row.workingCount} | معطل ${row.defectiveCount} | مفقود ${row.missingCount}`
    :`الحالة: ${row.conditionStatus||'عطل'}`;
  return {
    title:`[حمامات] ${comp.name} — ${room.building} (${room.gender})`.slice(0,120),
    location:`${room.building} • ${room.direction} • ${room.floor} (${room.gender})`.slice(0,120),
    description:`مكون: ${comp.name} (${comp.trade}) | ${countStr}${row.note?' | ملاحظة: '+row.note:''}${row.actionRequired?' | الإجراء المطلوب: '+row.actionRequired:''}`.slice(0,1200),
    category:'restrooms',
    priority:(Number(row.defectiveCount)>=2||row.component==='plumb_leaks')?'urgent':'high',
    trade:RESTROOM_TRADE_MAP[comp.trade]||'Plumbing',
    snagType:comp.trade==='التجهيزات'?'cleanliness':'maintenance',
    sourceRef:{module:'restroom',id:row.id,restroomKey:row.restroomKey,component:row.component}
  };
}

function restrictedExternalValue(value){
  return value&&(/xoxb-|xoxp-|hooks\.slack\.com\/services\/|AIza[0-9A-Za-z_-]+/).test(String(value));
}

module.exports={
  TYPES,
  ENTITY_TYPES,
  PERMIT_STATES,
  ALLOWED_CONDITIONS,
  normalizeInspection,
  normalizeRestroom,
  normalizeEntity,
  numeric,
  validateFileIds,
  restrictedExternalValue,
  buildPromotedSnagFromParkItem,
  buildPromotedSnagFromRestroomRow
};
