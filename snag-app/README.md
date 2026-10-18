# 📋 Snag List Pro — Firebase Edition

## المتطلبات
- Node.js 18+
- مشروع Firebase (مجاني Spark plan يكفي)

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

## Firestore Security Rules (الإنتاج)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /snags/{snagId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

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

> للاختبار السريع استبدل `request.auth != null` بـ `true` مؤقتاً

---

## بناء ورفع الإنتاج

```bash
npm run build

# Firebase Hosting
npm install -g firebase-tools
firebase login
firebase init hosting    # public dir = dist
firebase deploy
```
