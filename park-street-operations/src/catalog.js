'use strict';
// Mirrors the ParkStreetModule.jsx inspection IDs and section/zone keys.
// The 51 core checklist items are metadata only; no production reads are made.
const S = [
['security','الأمن والحراسة والمراقبة',[
 ['sec-gates','SEC-01','بوابات الدخول ونقاط التفتيش الأمني',[
  ['guard-presence','تواجد أفراد الأمن بنقاط التمركز'],['guard-uniform','الالتزام بالزي الرسمي'],['walkthrough-gate','بوابات الكشف عن المعادن وأجهزة التفتيش'],['security-barriers','الحواجز الأمنية بالمداخل'],['visitor-handling','التعامل مع الزوار واستقبالهم']]],
 ['sec-cctv','SEC-02','كاميرات المراقبة وغرفة التحكم',[
  ['cctv-operation','تشغيل كاميرات المراقبة'],['cctv-angles','عدسات الكاميرات وزوايا الرؤية'],['nvr-recording','أجهزة التسجيل NVR/DVR'],['radio-intercom','أجهزة اللاسلكي والإنتركم']]],
 ['sec-corridors','SEC-03','الممرات الخلفية والطوارئ والتصاريح',[
  ['emergency-doors','تأمين أبواب الطوارئ'],['work-permits','تصاريح دخول المقاولين'],['patrol-rounds','الدوريات الأمنية'],['perimeter-light','الإضاءة الأمنية المحيطة']]]]],
['customer-journey','رحلة العميل — بارك ستريت',[
 ['cj-arrival','CJ-01','المداخل الرئيسية والاستقبال',[
  ['entrance-clean','نظافة المداخل والزجاج'],['reception-desk','جاهزية الاستقبال'],['wayfinding-main','اللوحات الإرشادية'],['entrance-mat','مشايات المداخل والأرضيات']]],
 ['cj-promenade','CJ-02','الممشى والبلازا',[
  ['walkway-clear','خلو الممشى من العوائق'],['marble-interlock','سلامة الرخام والإنترلوك'],['seating-benches','مقاعد واستراحات الزوار'],['trash-bins','سلال مهملات الممشى'],['storefronts','واجهات المحلات']]],
 ['cj-ambiance','CJ-03','الحركة الرأسية والأجواء',[
  ['escalators-lifts','السلالم المتحركة والمصاعد'],['promenade-light','الإضاءة الديكورية'],['sound-music','الموسيقى والسماعات'],['scent-air','الهواء والتهوية والروائح']]]]],
['landscape','الزراعة واللاند سكيب',[
 ['land-trees','LND-01','الأشجار والنخيل والمسطحات',[
  ['trees-vitality','حيوية الأشجار والنباتات'],['palms-pruning','تقليم الأشجار والنخيل'],['grass-mowing','تهذيب النجيلة'],['seasonal-flowers','الزهور والشتلات']]],
 ['land-planters','LND-02','الأحواض والمراكن',[
  ['planters-clean','نظافة أحواض الزرع'],['planters-body','سلامة المراكن ودهاناتها'],['soil-fertilizer','التربة والتسميد'],['pest-disease','مكافحة الآفات الزراعية']]],
 ['land-irrigation','LND-03','الري والإضاءة والنوافير',[
  ['irrigation-pipes','شبكات الري والرشاشات'],['no-water-overflow','عدم تجمع مياه الري'],['landscape-lights','كشافات الإضاءة الزراعية'],['water-fountains','النوافير والمسطحات المائية']]]]],
['traffic-parking','مسار السيارات بالبيزمنت',[
 ['car-ramps-gates','CAR-01','الرامبات والبوابات',[
  ['barrier-gates','الأذرع الإلكترونية والتذاكر'],['ramp-surface','أرضيات منحدرات الدخول'],['ramp-trench','جريليات تصريف المياه'],['height-bar','محدد الارتفاع']]],
 ['car-lanes-safety','CAR-02','الحركة المرورية والأمان',[
  ['floor-arrows','الأسهم الأرضية وتخطيط الحارات'],['overhead-signs','اللوحات المرورية المعلقة'],['speed-bumps','المطبات وعيون القطط'],['convex-mirrors','المرايا العاكسة'],['column-guards','كاوتش حماية الأعمدة ومصدات العجلات']]],
 ['car-epoxy-mep','CAR-03','الأرضيات والإنارة والتهوية',[
  ['epoxy-floor','أرضيات الإيبوكسي'],['basement-lighting','إنارة البيزمنت'],['jet-fans','مراوح Jet Fans'],['traffic-flow','انسيابية مسار السيارات']]]]]
];
const PARK_SECTORS = S.map(([id,name,zones])=>({id,name,zones:zones.map(([zoneId,code,title,items])=>({id:zoneId,code,title,items:items.map(([itemId,name])=>({id:itemId,name,key:`${id}__${zoneId}__${itemId}`}))}))}));
const PARK_ITEMS = PARK_SECTORS.flatMap(s=>s.zones.flatMap(z=>z.items.map(i=>({...i,sector:s.id,sectorName:s.name,zone:z.id,zoneName:z.title,code:z.code}))));
const PARK_BY_KEY=Object.fromEntries(PARK_ITEMS.map(x=>[x.key,x]));
const INSPECTION_STATUSES={na:'لم يُفحص',ok:'سليم',snag:'ملاحظة / عطل',followup:'يحتاج متابعة'};
module.exports={PARK_SECTORS,PARK_ITEMS,PARK_BY_KEY,INSPECTION_STATUSES};
