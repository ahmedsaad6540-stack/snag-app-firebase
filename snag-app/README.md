# 📋 Snag List Pro — Firebase Edition

## المتطلبات
- Node.js 18+
- مشروع Firebase (خطة Spark تكفي لتشغيل الواجهة؛ Cloud Functions وإدارة أسرار Slack في staging تحتاج Blaze)

---

## إعداد Firebase (مرة واحدة)

### 1. أنشئ مشروع Firebase
اذهب إلى [console.firebase.google.com](https://console.firebase.google.com) ← **Add project**

### 2. فعّل Firestore
**Build → Firestore Database → Create database**
اختر **Start in test mode** للبداية السريعة

### 3. فعّل Storage
**Build → Storage → Get started** ← **Start in test mode**

### 4. أضف Web App
**Project Settings → General → Your apps → Add app → Web**
انسخ الـ firebaseConfig

### 5. إعداد المشروع
```bash
cp .env.example .env.local   # ثم عبّئ القيم من Firebase Console

npm install
npm run dev
```

---

## هيكل المشروع

```
snag-app/
├── .env.example              ← انسخه .env.local وضع بيانات Firebase
├── src/
│   ├── lib/
│   │   └── firebase.js       ← تهيئة Firebase (يقرأ من .env.local)
│   ├── hooks/
│   │   ├── useSnags.js       ← Firestore + Storage — كل منطق البيانات
│   │   └── useAttachments.js
│   ├── constants/index.js
│   ├── utils/
│   │   ├── classify.js
│   │   ├── compress.js
│   │   └── export.js
│   └── components/
│       ├── Header.jsx
│       ├── StatBar.jsx
│       ├── SnagForm.jsx
│       └── SnagList.jsx
```

---

## كيف تعمل البيانات

```
إضافة ملاحظة:
  صورة → ضغط (compress.js) → رفع Firebase Storage → رابط URL
  بيانات الملاحظة + روابط الصور → Firestore

عرض الملاحظات:
  onSnapshot() → تحديث فوري real-time لكل أعضاء الفريق بلا refresh

حذف ملاحظة:
  deleteObject() من Storage + deleteDoc() من Firestore
```

---

## أمان Firestore

**تنبيه:** ملف `firestore.rules` الحالي يسمح بالقراءة والكتابة المجهولة على كل المستندات (`allow read, write: if true`). هذا كشف واسع للبلاغات والمستخدمين وبيانات الوحدات، وليس وضعًا آمنًا للإنتاج. لا تنشر هذا الملف باعتباره قواعد إنتاج آمنة.

أُضيفت `firestore.staging.rules` كاقتراح مرحلي معزول وغير مربوط بـ`firebase.json`: يسمح بإنشاء المستخدم لحسابه المعلّق فقط، ويتيح قراءة ملفه الشخصي، ويقصر إدارة المستخدمين على المدير، ويقصر مجموعات التطبيق على المستخدمين الموافق عليهم. هذا اقتراح انتقالي؛ ما زالت صلاحيات البيانات بين المستخدمين المعتمدين واسعة، ويجب تصميم عزل المستأجرين والتحقق من حقول كل مجموعة قبل اعتماده.

اختبارات المحاكي تغطي إنشاء الحساب وقراءة ملفه قبل الموافقة، رفض وصول الحساب المعلّق، صلاحيات المدير، وعمليات القراءة/الكتابة التي تستخدمها مجموعات الملاحظات وبارك ستريت والوحدات والمخازن والقوائم المخصصة والحمامات والإشعارات. شغّلها محليًا عبر `npm run test:rules`. هذا لا يغيّر قواعد المشروع المنشور ولا يثبت نجاح النشر؛ قبل أي ترحيل، اختبر القواعد على نسخة staging وراجع واجهة الموافقة، خصوصًا أن hooks الحالية تبدأ بعض المستمعات قبل عرض شاشة انتظار الموافقة.

## Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /attachments/{snagId}/{fileId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

لا تستخدم `allow read, write: if true` في الإنتاج. لا تُستبدل القواعد الحالية قبل اختبار الهجرة والنسخ الاحتياطي ومراجعة نموذج المستخدمين والمستأجرين.

---

## بناء ورفع الإنتاج

```bash
npm run build

# Firebase Hosting
firebase login
firebase deploy --only hosting --project <firebase-project-id>
```

## تكامل Slack مع المهام

إشعارات البيانات الحقيقية **مغلقة عمدًا** في هذا التغيير. القيمة الافتراضية لـ`SLACK_NOTIFICATIONS_MODE` هي `off`، ووضع `live` لا يرسل إشعارات حتى اعتماد تجربة staging ومراجعة إنتاجية منفصلة. لا تنشر Cloud Functions إلى Firebase الإنتاج من هذا الفرع.

عند اعتماد staging فقط، أنشئ Slack App بأقل صلاحية `chat:write` وأضفه يدويًا إلى قناة الاختبار الخاصة `C0CAS6S7RR8`. لا تستخدم Webhook أو Bot Token حقيقيًا في الاختبارات المحلية.

1. أنشئ مشروع Firebase منفصلًا للتجربة، فعّل Blaze وواجهات Cloud Functions/Secret Manager، ثم من مجلد `snag-app` اختر مشروع staging صراحة.
2. خزّن Bot Token لذلك المشروع فقط:

   ```bash
   firebase functions:secrets:set SLACK_BOT_TOKEN --project <staging-project-id>
   ```

3. في ملف محلي غير مُلتزم `functions/.env.<staging-project-id>`، عيّن:

   ```bash
   SLACK_NOTIFICATIONS_MODE=test
   ```

   ثم انشر الدوال إلى staging فقط:

   ```bash
   firebase deploy --only functions --project <staging-project-id>
   ```

   أنشئ بعد ذلك من Firebase Console مستندًا اصطناعيًا في `snag_integration_tests/{testId}` مع `isDemo: true`. الوضع `test` يتجاهل `snags` و`park_street_snags` كليًا، ولا يسمح إلا بحدث الإنشاء أو تغيير الحالة/الأولوية للمستند التجريبي الموسوم. احذف بيانات الاختبار بعد التحقق. لا تضع Bot Token في ملف البيئة؛ Firebase Secret Manager هو المصدر الوحيد له.

التوجيه المستقبلي يستخدم مفاتيح ثابتة في الكود فقط: `security`, `customer-journey`, `landscape`, `traffic-parking`, `maintenance`, و`housekeeping`. لا تؤخذ معرفات القنوات من Firestore. رسائل Slack محصورة في معرف البلاغ والحالة والموقع والوصف القصير؛ لا تضاف الصور أو المرفقات أو أسماء/بريد المفتش. تُحجب أنماط البريد والهاتف الشائعة من الوصف، لكن يجب أن يظل الوصف خاليًا من البيانات الشخصية من المصدر. لا تفعّل `live` أو تنشر إلى المشروع الحقيقي قبل اعتماد المالك واختبار staging.

يحتاج نشر Cloud Functions إلى Firebase Blaze، وتخزين الأسرار عبر Secret Manager. لا تتضمن هذه التعليمات أمر نشر للإنتاج عمدًا.
