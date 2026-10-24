'use strict';

const { classifyNCRI } = require('./ai/ncri');

const CATEGORIES = Object.freeze({
  maintenance: 'الصيانة',
  cleaning: 'النظافة',
  security: 'الأمن',
  landscape: 'اللاند سكيب',
  parking: 'البيزمنت',
  'customer-journey': 'رحلة العميل',
  restrooms: 'فحص الحمامات',
  operations: 'التشغيل'
});

const PRIORITIES = Object.freeze({
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'حرجة'
});

const STATUSES = Object.freeze({
  open: 'جديد',
  'in-progress': 'قيد التنفيذ',
  review: 'جاهز للمراجعة',
  closed: 'مغلق'
});

const NEXT = Object.freeze({
  open: ['in-progress'],
  'in-progress': ['review'],
  review: ['closed', 'in-progress'],
  closed: []
});

const LOCATIONS = Object.freeze([
  'Building A', 'Building B', 'Building C', 'Building D', 'Building E', 'Building F', 'Building G',
  'Building 1', 'Building 2', 'Building 3', 'Building 4',
  'Landscape', 'Plaza', 'Stairs', 'Basement', 'Roof', 'Gates', 'Restrooms'
]);

const TRADES = Object.freeze([
  'Civil', 'Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'Painting', 'Carpentry',
  'Landscape', 'Firefighting', 'Low Current', 'Housekeeping', 'Security', 'Traffic',
  'Safety', 'Soft Service', 'Operations'
]);

const SNAG_TYPES = Object.freeze({
  maintenance: 'صيانة — Maintenance',
  operations: 'تشغيل — Operations',
  cleanliness: 'نظافة — Cleanliness'
});

const PARK_ST_TRACKS = Object.freeze([
  {
    id: 'security',
    name: 'الأمن والسلامة',
    items: [
      { title: 'طفايات الحريق وصلاحيتها', trade: 'Firefighting', type: 'operations' },
      { title: 'صناديق الحريق وخراطيم الإطفاء', trade: 'Firefighting', type: 'operations' },
      { title: 'مخارج الطوارئ وخلوها من العوائق', trade: 'Safety', type: 'operations' },
      { title: 'لوحات إنذار الحريق وكواشف الدخان', trade: 'Low Current', type: 'maintenance' },
      { title: 'كاميرات المراقبة CCTV', trade: 'Low Current', type: 'maintenance' },
      { title: 'بوابات الدخول وأفراد الأمن', trade: 'Security', type: 'operations' },
      { title: 'إضاءة الطوارئ وعلامات الإخلاء', trade: 'Electrical', type: 'maintenance' },
      { title: 'تأمين غرف الكهرباء والميكانيكا', trade: 'Safety', type: 'operations' }
    ]
  },
  {
    id: 'customer-journey',
    name: 'رحلة العميل والمباني',
    items: [
      { title: 'نظافة المداخل والواجهات الزجاجية', trade: 'Housekeeping', type: 'cleanliness' },
      { title: 'حالة الأرضيات والرخام والإنترلوك', trade: 'Civil', type: 'maintenance' },
      { title: 'الإنارة العامة والديكورية بالممشى', trade: 'Electrical', type: 'maintenance' },
      { title: 'كفاءة المصاعد والسلالم المتحركة', trade: 'Mechanical', type: 'maintenance' },
      { title: 'التكييف والتهوية بالمناطق المشتركة', trade: 'HVAC', type: 'maintenance' },
      { title: 'سلال المهملات ونظافتها', trade: 'Housekeeping', type: 'cleanliness' },
      { title: 'المقاعد ومناطق الجلوس', trade: 'Carpentry', type: 'maintenance' },
      { title: 'اللوحات الإرشادية والتوجيهية', trade: 'Operations', type: 'operations' }
    ]
  },
  {
    id: 'landscape',
    name: 'اللاندسكيب والمسطحات الخضراء',
    items: [
      { title: 'حالة المسطحات الخضراء والنجيلة', trade: 'Landscape', type: 'cleanliness' },
      { title: 'تقليم الأشجار والنخيل', trade: 'Landscape', type: 'operations' },
      { title: 'شبكات الري وعدم وجود تسريبات', trade: 'Plumbing', type: 'maintenance' },
      { title: 'نظافة أحواض الزهور والنباتات', trade: 'Landscape', type: 'cleanliness' },
      { title: 'إضاءة اللاندسكيب والأشجار', trade: 'Electrical', type: 'maintenance' },
      { title: 'النوافير والمسطحات المائية', trade: 'Mechanical', type: 'maintenance' }
    ]
  },
  {
    id: 'traffic-parking',
    name: 'الحركة والباركينج',
    items: [
      { title: 'بوابات الجراج وأذرع الدخول والخروج', trade: 'Low Current', type: 'maintenance' },
      { title: 'تخطيط الأرضيات وأسهم الاتجاهات', trade: 'Painting', type: 'maintenance' },
      { title: 'المطبات ومصدات العجلات والمرايا العاكسة', trade: 'Traffic', type: 'operations' },
      { title: 'إنارة وتهوية الجراج (Jet Fans)', trade: 'HVAC', type: 'maintenance' },
      { title: 'نظافة أرضيات الجراج وخلوها من الزيوت', trade: 'Housekeeping', type: 'cleanliness' },
      { title: 'انسيابية حركة السيارات ومنطقة التحميل', trade: 'Traffic', type: 'operations' }
    ]
  }
]);

function text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function slackEscape(value) {
  return text(value, 280).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fromModal(values) {
  const at = (block, action) => values?.[block]?.[action];
  const trade = text(at('trade', 'select')?.selected_option?.value, 40);
  const snagType = text(at('snagType', 'select')?.selected_option?.value, 40);
  const rawCategory = text(at('category', 'select')?.selected_option?.value, 40);
  const rawPriority = text(at('priority', 'select')?.selected_option?.value, 40);
  const title = text(at('title', 'input')?.value, 120);
  const location = text(at('location', 'input')?.value, 120);
  const description = text(at('description', 'input')?.value, 1200);

  let category = rawCategory;
  let priority = rawPriority;

  // Support NCRI v2 auto-classification if user selected "auto"
  if (category === 'auto' || priority === 'auto') {
    const ncri = classifyNCRI(`${title} ${description} ${location}`);
    if (category === 'auto') {
      category = ncri.sector === 'traffic-parking' ? 'parking' : (CATEGORIES[ncri.sector] ? ncri.sector : 'maintenance');
    }
    if (priority === 'auto') {
      priority = PRIORITIES[ncri.priority] ? ncri.priority : 'medium';
    }
  }

  return {
    title,
    location,
    description,
    category,
    priority,
    assignedTo: text(at('assignedTo', 'user')?.selected_user, 32),
    dueDate: text(at('dueDate', 'date')?.selected_date, 10),
    photoIds: at('files', 'file')?.files || [],
    ...(trade ? { trade } : {}),
    ...(snagType ? { snagType } : {})
  };
}

function validateNew(record) {
  const errors = {};
  if (!record.title || record.title.length < 4) errors.title = 'اكتب عنوانًا من 4 أحرف على الأقل';
  if (!record.location) errors.location = 'الموقع مطلوب';
  if (!Object.hasOwn(CATEGORIES, record.category)) errors.category = 'اختر القسم';
  if (!Object.hasOwn(PRIORITIES, record.priority)) errors.priority = 'اختر الأولوية';
  if (record.photoIds?.length) {
    try {
      require('./operationsDomain').validateFileIds(record.photoIds);
    } catch {
      errors.files = 'ملفات غير مدعومة';
    }
  }
  return errors;
}

function canTransition(before, after) {
  return before === after || Boolean(NEXT[before]?.includes(after));
}

function makeRecord(inputs, teamId, userId, now = () => new Date().toISOString()) {
  const issues = validateNew(inputs);
  if (Object.keys(issues).length) throw new Error('Invalid record inputs.');
  const { validateFileIds } = require('./operationsDomain');
  if (inputs.assignedTo && !/^U[A-Z0-9]{8,20}$/.test(inputs.assignedTo)) throw new Error('INVALID_ASSIGNEE');
  if (inputs.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(inputs.dueDate)) throw new Error('INVALID_DUE_DATE');

  return {
    title: inputs.title,
    location: inputs.location,
    description: inputs.description,
    ...(inputs.assignedTo ? { assignedTo: inputs.assignedTo } : {}),
    ...(inputs.dueDate ? { dueDate: inputs.dueDate } : {}),
    ...(inputs.photoIds?.length ? { photoIds: validateFileIds(inputs.photoIds) } : {}),
    ...(inputs.trade && TRADES.includes(inputs.trade) ? { trade: inputs.trade } : {}),
    ...(inputs.snagType && Object.hasOwn(SNAG_TYPES, inputs.snagType) ? { snagType: inputs.snagType } : {}),
    ...(inputs.sourceRef ? { sourceRef: inputs.sourceRef } : {}),
    category: inputs.category,
    priority: inputs.priority,
    status: 'open',
    source: 'slack-staging',
    isDemo: true,
    teamId,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now(),
    updatedAt: now(),
    history: [{ event: 'created', actor: userId, at: now() }]
  };
}

function enrichRecordWithNCRI(record) {
  const ncri = classifyNCRI(`${record.title || ''} ${record.description || ''} ${record.location || ''}`);
  return {
    ...record,
    trade: record.trade || ncri.trade,
    snagType: record.snagType || ncri.type,
    ncri: {
      category: ncri.category,
      confidence: ncri.confidence,
      urgencyLevel: ncri.urgencyLevel,
      suggestedAction: ncri.suggestedAction,
      estimatedSlaHours: ncri.estimatedSlaHours
    }
  };
}

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  NEXT,
  LOCATIONS,
  TRADES,
  SNAG_TYPES,
  PARK_ST_TRACKS,
  text,
  slackEscape,
  fromModal,
  validateNew,
  canTransition,
  makeRecord,
  enrichRecordWithNCRI
};
