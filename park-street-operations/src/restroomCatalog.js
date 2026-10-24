'use strict';
// Components/IDs transcribed from actual src/constants/restroomsData.js, 29 per restroom.
const COMPONENTS = [
 ['elec_spots','سبوتات السقف','الكهرباء','عدد'],['elec_switches','مفاتيح الكهرباء','الكهرباء','عدد'],['elec_sockets','المقابس الكهربائية','الكهرباء','عدد'],['elec_emergency','كشافات الطوارئ','الكهرباء','عدد'],
 ['vent_fans','شفاطات التهوية','التهوية','عدد'],['civil_riser','أبواب الرايزر','الأعمال المدنية','عدد'],
 ['plumb_toilets','قواعد الحمام','السباكة','عدد'],['plumb_flushes','سيفونات / صناديق الطرد','السباكة','عدد'],['plumb_shattaf','شطافات الحمام','السباكة','عدد'],['plumb_sinks','أحواض غسيل الأيدي','السباكة','عدد'],['plumb_mixers','خلاطات / حنفيات الأحواض','السباكة','عدد'],['plumb_drains','مصارف الأرضية','السباكة','عدد'],['plumb_leaks','تسريب مياه / مواسير','السباكة','حالة'],
 ['fix_mirrors','المرايا','التجهيزات','عدد'],['fix_roll_holder','حوامل بكر المناديل','التجهيزات','عدد'],['fix_pull_tissue','موزعات مناديل السحب','التجهيزات','عدد'],['fix_soap','موزعات الصابون','التجهيزات','عدد'],['fix_dryers','مجففات الأيدي','التجهيزات','عدد'],['fix_small_bins','سلال المهملات الصغيرة','التجهيزات','عدد'],['fix_large_bins','سلال المهملات الكبيرة','التجهيزات','عدد'],
 ['civil_main_door','أبواب الحمام','الأعمال المدنية','عدد'],['civil_cab_doors','أبواب الكبائن','الأعمال المدنية','عدد'],['civil_locks','أقفال ومفصلات الكبائن','الأعمال المدنية','عدد'],['civil_partitions','فواصل الكبائن','الأعمال المدنية','حالة'],['civil_ceiling','السقف','الأعمال المدنية','حالة'],['civil_floors','الأرضيات والسيراميك','الأعمال المدنية','حالة'],['civil_walls','الحوائط والدهانات','الأعمال المدنية','حالة'],['safe_accessible','تجهيزات ذوي الهمم','السلامة والإتاحة','عدد' === 'حالة' ? 'عدد' : 'حالة'],['safe_signs','لوحات الإرشاد','السلامة والإتاحة','عدد']
].map(([code,name,trade,type])=>({code,name,trade,type}));
const RESTROOMS=[];
function add(prefix,building,direction,floors,genders=['f','m']){
 for(const floor of floors)for(const g of genders)RESTROOMS.push({key:`${prefix}_${floor}_${g}`,building,direction,floor:floor.startsWith('f')?`الدور ${floor.slice(1)}`:floor,gender:g==='f'?'حريمي':g==='m'?'رجالي':'ذوي الهمم'});
}
add('b1_rameda','مبنى 1','اتجاه راميدا',['f2','f3','f4']);
add('b1_sky','مبنى 1','Sky القديمة / Art of form',['f1','f2','f3','f4','f6']);
add('b2_clinics','مبنى 2','اتجاه العيادات',['f2','f3','f4']);
add('b2_offices','مبنى 2','اتجاه المكاتب',['f2','f3','f4','f5','f6']);
for(const [prefix,direction,floor] of [['b3_prayer','المصلى','المصلى'],['b3_richard_f1','ريتشارد','الدور 1'],['b3_arabbank_f1','ناحية البنك العربي','الدور 1'],['b3_ayman_f3','ناحية مستر ايمن','الدور 3']])for(const g of ['f','m']) RESTROOMS.push({key:`${prefix}_${g}`,building:'مبنى 3',direction,floor,gender:g==='f'?'حريمي':'رجالي'});
for(const plaza of ['p1','p3'])for(const g of ['m','f','a'])RESTROOMS.push({key:`plaza_${plaza}_${g}`,building:'البلازا',direction:plaza==='p1'?'بلازا 1':'بلازا 3',floor:'غير محدد',gender:g==='a'?'ذوي الهمم':g==='f'?'حريمي':'رجالي'});
for(const [prefix,building,direction] of [['lmd_main','LMD','حمامات LMD'],['mosque_main','المسجد','حمامات المسجد']]) for(const g of ['m','f']) RESTROOMS.push({key:`${prefix}_${g}`,building,direction,floor:'غير محدد',gender:g==='f'?'حريمي':'رجالي'});
const RESTROOM_BY_KEY=Object.fromEntries(RESTROOMS.map(r=>[r.key,r]));
const COMPONENT_BY_CODE=Object.fromEntries(COMPONENTS.map(r=>[r.code,r]));

const RESTROOM_ZONES = ['مبنى 1', 'مبنى 2', 'مبنى 3', 'البلازا', 'LMD', 'المسجد'];
const RESTROOM_TRADES = ['الكهرباء', 'التهوية', 'الأعمال المدنية', 'السباكة', 'التجهيزات', 'السلامة والإتاحة'];

function formatRestroomLabel(r) {
  if (!r) return '';
  return `${r.building} • ${r.direction} • ${r.floor} (${r.gender})`;
}

function isRestroomRowDefective(row) {
  if (!row) return false;
  return (
    (Number(row.defectiveCount) || 0) > 0 ||
    (Number(row.missingCount) || 0) > 0 ||
    row.conditionStatus === 'تالف' ||
    row.conditionStatus === 'ناقص' ||
    row.conditionStatus === 'يحتاج نظافة'
  );
}

function computeRestroomZoneCoverage(restroomRows = [], restroomMetaList = []) {
  const metaByKey = {};
  for (const m of restroomMetaList) {
    if (m && m.restroomKey) metaByKey[m.restroomKey] = m;
  }

  const rowsByRestroom = {};
  for (const row of restroomRows) {
    const rk = row.restroomKey;
    if (!rk) continue;
    if (!rowsByRestroom[rk]) rowsByRestroom[rk] = [];
    rowsByRestroom[rk].push(row);
  }

  return RESTROOM_ZONES.map((zone) => {
    const zoneRestrooms = RESTROOMS.filter((r) => r.building === zone);
    const total = zoneRestrooms.length;
    let confirmed = 0;
    let rounds = 0;
    let inspected = 0;
    let defects = 0;
    let badMirrors = 0;

    for (const r of zoneRestrooms) {
      const meta = metaByKey[r.key];
      const rows = rowsByRestroom[r.key] || [];
      if (meta && meta.confirmed) confirmed += 1;
      if (meta && Number(meta.roundsCount) > 0) rounds += Number(meta.roundsCount);
      else if (rows.length > 0) rounds += 1;
      if (rows.length > 0 || (meta && meta.confirmed)) inspected += 1;

      for (const item of rows) {
        if (isRestroomRowDefective(item)) {
          defects += 1;
        }
        if (item.component === 'fix_mirrors' && ((Number(item.defectiveCount) || 0) > 0 || (Number(item.missingCount) || 0) > 0)) {
          badMirrors += (Number(item.defectiveCount) || 0) + (Number(item.missingCount) || 0);
        }
      }
    }

    return {
      zone,
      total,
      confirmed,
      rounds,
      inspected,
      defects,
      badMirrors,
      pct: total ? Math.round((confirmed / total) * 100) : 0
    };
  });
}

module.exports={
  RESTROOMS,
  RESTROOM_BY_KEY,
  COMPONENTS,
  COMPONENT_BY_CODE,
  RESTROOM_ZONES,
  RESTROOM_TRADES,
  formatRestroomLabel,
  isRestroomRowDefective,
  computeRestroomZoneCoverage
};
