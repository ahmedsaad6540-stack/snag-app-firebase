import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../lib/firebase.js"
import { useUnits } from "../hooks/useUnits.js"
import { canUser } from "../constants/permissions.js"
import {
  MALL_VIOLATION_CATEGORIES,
  MALL_VIOLATIONS_CATALOG,
  MALL_MANUAL_CHAPTERS,
  getArabicDayName,
  formatSlashDateAr,
  numberToArabicWordsEgp,
  matchViolationsFromCaseText,
  normalizeArabicText,
} from "../constants/mallViolationsData.js"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

const VIOLATIONS_COL = "mall_violations"

const QUICK_CASE_EXAMPLES = [
  {
    label: "تغيير الملابس في حمام الموظفات (جو اند جوس)",
    text: "تغيير الملابس في حمام الموظفات الدور الثاني مبنى 1 من قبل موظفات تابعات إلى مطعم جو اند جوس",
    building: "1",
    floor: "الأرضي",
    unitName: "جو اند جوس",
    unitNo: "1 - G",
  },
  {
    label: "تدخين داخل سلم الطوارئ",
    text: "تم رصد أحد العاملين بالوحدة يقوم بالتدخين داخل سلم الطوارئ بالمبنى",
  },
  {
    label: "ترولي بضائع بدون غطاء",
    text: "التحرك بترولي بضائع مكشوف بدون غطاء في الممر أثناء ساعات التشغيل",
  },
  {
    label: "إشغال ممر الهروب بترولي ومخلفات",
    text: "وجود متعلقات خاصة بالوحدة وترك ترولي ومخلفات بممر الهروب الخدمي يعوق الحركة",
  },
  {
    label: "طفاية حريق فارغة بالوحدة",
    text: "أثناء المرور تبين وجود أجهزة إطفاء فارغة داخل الوحدة غير صالحة للاستخدام",
  },
  {
    label: "عدم الالتزام بتصفية الدهون / مصيدة الدهون",
    text: "عدم الالتزام باشتراطات تصفية الدهون وتراكم الشحوم في مصيدة الدهون بالمطعم",
  },
]

function todayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/**
 * يرسم نموذج المخالفة الرسمي (طبق الأصل من نموذج WESTWING / Park St. west)
 * على Canvas عالي الدقة لتحويله إلى صورة PNG جاهزة للمشاركة الفورية على جروب الواتساب
 */
async function renderOfficialViolationFormBlob(formData, signatureDataUrl) {
  const width = 1240
  const height = 1754 // A4 Portrait ratio
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  // 1. خلفية الورقة الرسمية
  ctx.fillStyle = "#fcfcfa"
  ctx.fillRect(0, 0, width, height)

  // إطار خارجي خفيف
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = 4
  ctx.strokeRect(24, 24, width - 48, height - 48)

  // 2. شعار WESTWING + Park St. west في أعلى اليسار (طبقاً للنموذج الورقي)
  ctx.save()
  // رمز شعار Westwing الهندسي
  ctx.strokeStyle = "#4b5563"
  ctx.lineWidth = 10
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(145, 115)
  ctx.lineTo(175, 85)
  ctx.lineTo(215, 130)
  ctx.lineTo(255, 85)
  ctx.lineTo(285, 115)
  ctx.lineTo(255, 145)
  ctx.lineTo(215, 100)
  ctx.lineTo(175, 145)
  ctx.closePath()
  ctx.stroke()

  ctx.fillStyle = "#374151"
  ctx.textAlign = "center"
  ctx.font = "bold 34px Georgia, 'Times New Roman', serif"
  ctx.fillText("WESTWING", 215, 190)
  ctx.font = "bold 11px Arial, sans-serif"
  ctx.fillStyle = "#6b7280"
  ctx.fillText("PROPERTY MANAGEMENT SOLUTIONS", 215, 210)

  ctx.fillStyle = "#374151"
  ctx.font = "bold 46px Arial, sans-serif"
  ctx.fillText("Park St.", 210, 268)
  ctx.font = "bold 24px Arial, sans-serif"
  ctx.fillText("west", 268, 296)
  ctx.restore()

  // 3. عنوان النموذج في المنتصف (مخالفة تعليمات المركز التجارى)
  ctx.save()
  ctx.fillStyle = "#111827"
  ctx.textAlign = "center"
  ctx.direction = "rtl"
  ctx.font = "bold 38px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, Arial, sans-serif"
  const titleText = "مخالفة تعليمات المركز التجارى"
  ctx.fillText(titleText, width / 2 + 40, 360)
  const titleWidth = ctx.measureText(titleText).width
  ctx.strokeStyle = "#111827"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width / 2 + 40 - titleWidth / 2 - 10, 374)
  ctx.lineTo(width / 2 + 40 + titleWidth / 2 + 10, 374)
  ctx.stroke()
  ctx.restore()

  // دالة مساعدة لرسم الحقول المنقطة (RTL)
  function drawDottedField(label, value, rightX, y, dotsWidth) {
    ctx.save()
    ctx.direction = "rtl"
    ctx.textAlign = "right"
    ctx.fillStyle = "#111827"
    ctx.font = "bold 28px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
    ctx.fillText(label, rightX, y)
    const labelW = ctx.measureText(label).width + 14

    // نقاط السطر
    ctx.strokeStyle = "#6b7280"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(rightX - labelW, y + 6)
    ctx.lineTo(rightX - labelW - dotsWidth, y + 6)
    ctx.stroke()
    ctx.setLineDash([])

    // القيمة المكتوبة فوق النقاط
    if (value) {
      ctx.fillStyle = "#1e3a8a"
      ctx.font = "bold 28px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(String(value), rightX - labelW - dotsWidth / 2, y - 2)
    }
    ctx.restore()
  }

  // 4. شبكة البيانات العلوية (اليوم / الموافق / بمبنى / بالدور / اسم الوحدة / رقم الوحدة)
  const rightColX = width - 95
  const leftColX = 600

  drawDottedField("اليوم /", formData.dayName || "", rightColX, 455, 290)
  drawDottedField("الموافق", formatSlashDateAr(formData.date), leftColX, 455, 290)

  drawDottedField("بمبنى /", formData.building || "", rightColX, 520, 290)
  drawDottedField("بالدور /", formData.floor || "", leftColX, 520, 290)

  drawDottedField("اسم الوحدة /", formData.unitName || "", rightColX, 585, 270)
  drawDottedField("رقم الوحدة /", formData.unitNo || "", leftColX, 585, 270)

  // 5. سطر: أثناء المرور مشرف عام التشغيل تلاحظ.
  ctx.save()
  ctx.direction = "rtl"
  ctx.textAlign = "right"
  ctx.fillStyle = "#111827"
  ctx.font = "bold 29px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  ctx.fillText("أثناء المرور مشرف عام التشغيل تلاحظ.", rightColX, 655)
  ctx.restore()

  // 6. نوع المخالفة / (3 أسطر منقطة مع تفاف النص تلقائياً)
  ctx.save()
  ctx.direction = "rtl"
  ctx.textAlign = "right"
  ctx.fillStyle = "#111827"
  ctx.font = "bold 29px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  const violationLabel = "نوع المخالفة /"
  ctx.fillText(violationLabel, rightColX, 725)
  const vLabelW = ctx.measureText(violationLabel).width + 16

  const lineYs = [725, 790, 855]
  ctx.strokeStyle = "#6b7280"
  ctx.lineWidth = 2
  ctx.setLineDash([4, 6])
  lineYs.forEach((ly, idx) => {
    const startX = idx === 0 ? rightXWithOffset(rightColX, vLabelW) : rightColX - 40
    ctx.beginPath()
    ctx.moveTo(startX, ly + 8)
    ctx.lineTo(110, ly + 8)
    ctx.stroke()
  })
  ctx.setLineDash([])

  // تقسيم نص المخالفة على الـ 3 أسطر
  const fullViolationText =
    formData.customIncidentText?.trim() ||
    formData.violationTitleAr ||
    ""
  ctx.fillStyle = "#1e3a8a"
  ctx.font = "bold 27px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  const words = fullViolationText.split(/\s+/)
  const lines = ["", "", ""]
  let currentLine = 0
  for (const w of words) {
    const maxW = currentLine === 0 ? rightColX - vLabelW - 140 : rightColX - 170
    const testLine = lines[currentLine] ? `${lines[currentLine]} ${w}` : w
    if (ctx.measureText(testLine).width > maxW && currentLine < 2) {
      currentLine++
      lines[currentLine] = w
    } else {
      lines[currentLine] = testLine
    }
  }
  lines.forEach((ln, idx) => {
    if (!ln) return
    const xPos = idx === 0 ? rightColX - vLabelW - 10 : rightColX - 50
    ctx.fillText(ln, xPos, lineYs[idx] - 2)
  })
  ctx.restore()

  // 7. الفقرة القانونية للغرامة المالية
  const baseNumDisplay =
    formData.displayNumericFine !== undefined && formData.displayNumericFine !== ""
      ? Number(formData.displayNumericFine).toLocaleString("en-US")
      : Number(formData.finalAmount || 0).toLocaleString("en-US")

  const wordsDisplay = (
    formData.amountWordsAr || numberToArabicWordsEgp(formData.finalAmount)
  )
    .replace(/جنيهاً مصرياً فقط لا غير/g, "")
    .replace(/جنيها مصري فقط لا غير/g, "")
    .trim()

  ctx.save()
  ctx.direction = "rtl"
  ctx.textAlign = "right"
  ctx.fillStyle = "#111827"
  ctx.font = "bold 28px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"

  ctx.fillText(
    "-  طبقا للائحة المخالفات المعلنة للوحدات والمتعارف عليها تم توقيع غرامة مالية على الوحدة",
    rightColX,
    945
  )

  // السطر الثاني للغرامة: بقيمة ( .... ج ) ............ جنيها مصري فقط لا غير
  const line2Y = 1005
  const p1 = "بقيمة ("
  ctx.fillText(p1, rightColX - 25, line2Y)
  const p1W = ctx.measureText(p1).width

  // المبلغ بالأرقام
  ctx.fillStyle = "#b91c1c"
  ctx.font = "bold 30px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  const numStr = ` ${baseNumDisplay} ج `
  ctx.fillText(numStr, rightColX - 25 - p1W, line2Y)
  const numW = ctx.measureText(numStr).width

  ctx.fillStyle = "#111827"
  ctx.font = "bold 28px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  const p2 = ")"
  ctx.fillText(p2, rightColX - 25 - p1W - numW, line2Y)
  const afterParenX = rightColX - 25 - p1W - numW - 28

  // نقاط تحت المبلغ بالحروف
  const wordsBoxW = 310
  ctx.strokeStyle = "#6b7280"
  ctx.lineWidth = 2
  ctx.setLineDash([4, 6])
  ctx.beginPath()
  ctx.moveTo(afterParenX, line2Y + 6)
  ctx.lineTo(afterParenX - wordsBoxW, line2Y + 6)
  ctx.stroke()
  ctx.setLineDash([])

  // كتابة المبلغ بالحروف
  ctx.fillStyle = "#1e3a8a"
  ctx.textAlign = "center"
  ctx.fillText(wordsDisplay, afterParenX - wordsBoxW / 2, line2Y - 2)

  ctx.fillStyle = "#111827"
  ctx.textAlign = "right"
  ctx.fillText("جنيها مصري فقط لا غير", afterParenX - wordsBoxW - 16, line2Y)

  // السطر الثالث والرابع
  ctx.fillText(
    "تسدد في خزينة الإدارة المالية للمركز التجاري على أن يراعي عدم تكرار هذه المخالفة مرة",
    rightColX - 25,
    1065
  )
  ctx.fillText(
    "أخري على أن يتم مضاعفة المخالفة في حاله التكرار.",
    rightColX - 25,
    1120
  )

  if (formData.violationCode) {
    ctx.fillStyle = "#4b5563"
    ctx.font = "bold 20px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
    ctx.fillText(
      `[ مرجع اللائحة: بند رقم (${formData.violationCode}) — ${formData.categoryAr || "إدارة التشغيل"}${formData.isDoubled ? " — مضاعفة لتكرار المخالفة" : ""} ]`,
      rightColX - 25,
      1172
    )
  }
  ctx.restore()

  // 8. قسم التوقيعات: المدير المسئول عن الوحدة (يمين) + إدارة المركز التجاري (يسار أسفل)
  ctx.save()
  ctx.direction = "rtl"
  ctx.textAlign = "right"
  ctx.fillStyle = "#111827"
  ctx.font = "bold 30px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"

  const mgrHeader = "المدير المسئول عن الوحدة"
  ctx.fillText(mgrHeader, rightColX, 1280)
  const mgrW = ctx.measureText(mgrHeader).width
  ctx.strokeStyle = "#111827"
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(rightColX, 1292)
  ctx.lineTo(rightColX - mgrW, 1292)
  ctx.stroke()

  drawDottedField("الاسم /", formData.unitManagerName || "", rightColX, 1345, 250)
  drawDottedField("التوقيع /", formData.unitManagerSign || "", rightColX, 1405, 250)
  drawDottedField(
    "التاريخ",
    formData.unitManagerSignDate ? formatSlashDateAr(formData.unitManagerSignDate) : "    /     /     ",
    rightColX,
    1465,
    250
  )

  // إدارة المركز التجاري (في اليسار السفلي مثل النموذج الورقي)
  const mallAdminX = 560
  const adminHeader = "إدارة المركز التجاري"
  ctx.fillStyle = "#111827"
  ctx.font = "bold 30px 'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif"
  ctx.fillText(adminHeader, mallAdminX, 1490)
  const adminW = ctx.measureText(adminHeader).width
  ctx.strokeStyle = "#111827"
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(mallAdminX, 1502)
  ctx.lineTo(mallAdminX - adminW, 1502)
  ctx.stroke()

  drawDottedField("اسم مشرف التشغيل /", formData.supervisorName || "", mallAdminX, 1565, 260)
  drawDottedField("التوقيع /", "", mallAdminX, 1630, 320)

  // رسم التوقيع المرسوم أو التوقيع الانسيابي التلقائي لمشرف التشغيل
  if (signatureDataUrl) {
    await new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, mallAdminX - 380, 1565, 240, 95)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = signatureDataUrl
    })
  } else if (formData.supervisorName) {
    ctx.save()
    ctx.translate(mallAdminX - 240, 1625)
    ctx.rotate(-0.08)
    ctx.fillStyle = "#1d4ed8"
    ctx.font = "italic bold 28px 'IBM Plex Sans Arabic', Georgia, serif"
    ctx.textAlign = "center"
    ctx.fillText(formData.supervisorName, 0, 0)
    // خط توقيع انسيابي
    ctx.strokeStyle = "#1d4ed8"
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-90, 10)
    ctx.quadraticCurveTo(0, -22, 95, 6)
    ctx.quadraticCurveTo(30, 22, -60, 16)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/png", 0.95)
  })
}

function rightXWithOffset(rightX, offset) {
  return rightX - offset
}

export default function ViolationsModule({ currentUser, notify }) {
  const canAdd = !currentUser || canUser(currentUser, "violations", "add")
  const canEdit = !currentUser || canUser(currentUser, "violations", "edit")
  const canDelete = !currentUser || canUser(currentUser, "violations", "delete")
  const canExport = !currentUser || canUser(currentUser, "violations", "export")

  const { units } = useUnits(notify)

  // التبويب الداخلي: builder | catalog | archive
  const [subTab, setSubTab] = useState("builder")

  // سجل المخالفات المحفوظة في Firestore
  const [savedViolations, setSavedViolations] = useState([])
  const [loadingViolations, setLoadingViolations] = useState(true)

  // حالة الفلترة في الكتالوج والأرشيف
  const [catalogCategory, setCatalogCategory] = useState("all")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [archiveSearch, setArchiveSearch] = useState("")
  const [archiveCategory, setArchiveCategory] = useState("all")

  // حالة النموذج الحالي
  const [form, setForm] = useState(() => createDefaultForm(currentUser))
  const [editingViolationId, setEditingViolationId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sharingImage, setSharingImage] = useState(false)

  // لوحة التوقيع اليدوي الاختيارية
  const [showSignPad, setShowSignPad] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState("")
  const signCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)

  function createDefaultForm(userObj) {
    const today = todayIso()
    return {
      date: today,
      dayName: getArabicDayName(today),
      building: "1",
      floor: "الأرضي",
      unitId: "",
      unitName: "",
      unitNo: "",
      unitManagerName: "",
      unitManagerSign: "",
      unitManagerSignDate: "",
      caseDescriptionInput: "",
      violationCode: 45,
      violationTitleAr:
        "استخدام العاملين بالوحدات لدورات المياه الخاصة بالزائرين (أو تغيير الملابس بالحمامات)",
      categoryAr: "إدارة التشغيل",
      manualRefAr:
        "البند 13 من التعليمات العامة (ص5): يمنع استخدام دورات المياه في تغيير الملابس الخاصة بالعاملين، ويتم الالتزام بدورات المياه الخاصة واللوكر الخاص بالعاملين.",
      customIncidentText: "",
      baseAmount: 1000,
      isDoubled: false,
      finalAmount: 1000,
      displayNumericFine: 1000,
      amountWordsAr: numberToArabicWordsEgp(1000),
      customWordsMode: false,
      supervisorName: userObj?.displayName || "مشرف التشغيل",
      status: "قيد التحصيل",
      notes: "",
    }
  }

  // جلب سجل المخالفات من Firestore
  useEffect(() => {
    const q = query(collection(db, VIOLATIONS_COL), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(
      q,
      snap => {
        setSavedViolations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoadingViolations(false)
      },
      err => {
        console.error("Violations Firestore error:", err)
        setLoadingViolations(false)
      }
    )
    return unsub
  }, [])

  // المطابقة الذكية الفورية أثناء كتابة وصف الواقعة
  const smartMatches = useMemo(() => {
    const textToMatch = form.caseDescriptionInput || form.customIncidentText
    if (!textToMatch || textToMatch.trim().length < 3) return []
    return matchViolationsFromCaseText(textToMatch, 6)
  }, [form.caseDescriptionInput, form.customIncidentText])

  // فحص هل توجد مخالفات سابقة مسجلة على نفس الوحدة (لتنبيه التكرار ومضاعفة الغرامة)
  const unitPreviousViolations = useMemo(() => {
    if (!form.unitName && !form.unitNo) return []
    const normName = normalizeArabicText(form.unitName)
    const normNo = normalizeArabicText(form.unitNo)
    return savedViolations.filter(v => {
      if (editingViolationId && v.id === editingViolationId) return false
      const vName = normalizeArabicText(v.unitName || "")
      const vNo = normalizeArabicText(v.unitNo || "")
      return (normName && vName && vName === normName) || (normNo && vNo && vNo === normNo)
    })
  }, [savedViolations, form.unitName, form.unitNo, editingViolationId])

  // اختيار بند مخالفة من اللائحة (105 بند)
  function selectCatalogItem(item, keepCustomIncidentText = true) {
    const base = Number(item.amount || 0)
    const mult = form.isDoubled ? 2 : 1
    const finalAmt = base * mult
    setForm(prev => ({
      ...prev,
      violationCode: item.code,
      violationTitleAr: item.titleAr,
      categoryAr: item.categoryAr,
      manualRefAr: item.manualRefAr || "",
      baseAmount: base,
      finalAmount: finalAmt,
      displayNumericFine: finalAmt,
      amountWordsAr: numberToArabicWordsEgp(finalAmt),
      customWordsMode: false,
      customIncidentText:
        keepCustomIncidentText && prev.customIncidentText
          ? prev.customIncidentText
          : prev.caseDescriptionInput || item.titleAr,
    }))
    toast.success(`تم تطبيق البند رقم (${item.code}) — ${item.amount.toLocaleString()} ج.م`)
  }

  // زر التحليل الذكي وتعبئة النموذج تلقائياً من النص المكتوب
  function handleSmartAnalyzeAndFill(textOverride) {
    const rawText = (
      typeof textOverride === "string" ? textOverride : form.caseDescriptionInput
    ).trim()
    if (!rawText) {
      toast.error("اكتب وصف الحالة التي حدثت أولاً ليتم البحث في لائحة المخالفات")
      return
    }

    const matches = matchViolationsFromCaseText(rawText, 5)
    const best = matches[0]

    // محاولة استخراج المبنى والدور والوحدة تلقائياً من النص المكتوب
    let detectedBuilding = form.building
    let detectedFloor = form.floor
    let detectedUnitName = form.unitName
    let detectedUnitNo = form.unitNo
    let detectedManager = form.unitManagerName

    const bMatch = rawText.match(/مبن[ىي]\s*([123١٢٣])/i)
    if (bMatch) {
      const mapAr = { "١": "1", "٢": "2", "٣": "3" }
      detectedBuilding = mapAr[bMatch[1]] || bMatch[1]
    }

    if (rawText.includes("الأرضي") || rawText.includes("الارضي")) detectedFloor = "الأرضي"
    else if (rawText.includes("الدور الأول") || rawText.includes("الدور الاول")) detectedFloor = "الأول"
    else if (rawText.includes("الدور الثاني")) detectedFloor = "الثاني"
    else if (rawText.includes("الدور الثالث")) detectedFloor = "الثالث"
    else if (rawText.includes("الدور الرابع")) detectedFloor = "الرابع"
    else if (rawText.includes("البيزمنت") || rawText.includes("بيزمنت")) detectedFloor = "البيزمنت"

    // البحث في الوحدات المسجلة عن اسم وحدة مذكور داخل النص
    const normRaw = normalizeArabicText(rawText)
    for (const u of units) {
      const uNameNorm = normalizeArabicText(u.unitName || "")
      if (uNameNorm && uNameNorm.length >= 3 && normRaw.includes(uNameNorm)) {
        detectedUnitName = u.unitName
        detectedUnitNo = u.unitNo || detectedUnitNo
        detectedBuilding = u.buildingNo || detectedBuilding
        detectedFloor = u.floor || detectedFloor
        detectedManager = u.unitManagerName || detectedManager
        break
      }
    }

    // إذا لم تكن الوحدة في قاعدة البيانات، نستخرج الاسم بعد كلمة (مطعم / كافيه / محل / وحدة / شركة)
    if (!detectedUnitName) {
      const unitRegex = /(?:مطعم|كافيه|محل|وحدة|وحده|شركة|عيادة)\s+([^\n.,،]+)/i
      const m = rawText.match(unitRegex)
      if (m && m[1]) {
        detectedUnitName = m[1].trim()
      }
    }

    if (best) {
      const base = Number(best.amount || 0)
      const finalAmt = form.isDoubled ? base * 2 : base
      setForm(prev => ({
        ...prev,
        caseDescriptionInput: rawText,
        customIncidentText: rawText,
        building: detectedBuilding,
        floor: detectedFloor,
        unitName: detectedUnitName,
        unitNo: detectedUnitNo,
        unitManagerName: detectedManager,
        violationCode: best.code,
        violationTitleAr: best.titleAr,
        categoryAr: best.categoryAr,
        manualRefAr: best.manualRefAr || "",
        baseAmount: base,
        finalAmount: finalAmt,
        displayNumericFine: finalAmt,
        amountWordsAr: numberToArabicWordsEgp(finalAmt),
      }))
      toast.success(
        `تم مطابقة الحالة مع بند رقم (${best.code}): "${best.titleAr}" بقيمة ${best.amount.toLocaleString()} ج.م`
      )
    } else {
      setForm(prev => ({
        ...prev,
        caseDescriptionInput: rawText,
        customIncidentText: rawText,
        building: detectedBuilding,
        floor: detectedFloor,
        unitName: detectedUnitName,
        unitNo: detectedUnitNo,
      }))
      toast("تم وضع وصف الواقعة في النموذج — يمكنك اختيار البند الأقرب من القائمة", {
        icon: "ℹ️",
      })
    }
  }

  // اختيار وحدة من دليل الوحدات المسجلة
  function handleSelectRegisteredUnit(unitId) {
    if (!unitId) {
      setForm(prev => ({ ...prev, unitId: "" }))
      return
    }
    const found = units.find(u => u.id === unitId)
    if (!found) return
    setForm(prev => ({
      ...prev,
      unitId: found.id,
      unitName: found.unitName || prev.unitName,
      unitNo: found.unitNo || prev.unitNo,
      building: found.buildingNo || prev.building,
      floor: found.floor || prev.floor,
      unitManagerName: found.unitManagerName || prev.unitManagerName,
    }))
    toast.success(`تم تعبئة بيانات الوحدة: ${found.unitName || found.unitNo}`)
  }

  // تبديل مضاعفة الغرامة (×2 في حالة التكرار)
  function handleToggleDoubleFine(nextDoubled) {
    setForm(prev => {
      const base = Number(prev.baseAmount || 0)
      const finalAmt = nextDoubled ? base * 2 : base
      return {
        ...prev,
        isDoubled: nextDoubled,
        finalAmount: finalAmt,
        displayNumericFine: finalAmt,
        amountWordsAr: numberToArabicWordsEgp(finalAmt),
      }
    })
  }

  // وضعية النموذج الورقي الخاص (مثل الصورة المرفقة: الرقم الأساسي 1000 ج والمكتوب بالحروف ألفان جنيهاً لتكرار المخالفة)
  function applyPaperRepeatStyle() {
    setForm(prev => {
      const base = Number(prev.baseAmount || 1000)
      const doubled = base * 2
      return {
        ...prev,
        isDoubled: true,
        finalAmount: doubled,
        displayNumericFine: base,
        amountWordsAr: numberToArabicWordsEgp(doubled),
        customWordsMode: true,
      }
    })
    toast.success("تم ضبط الصيغة: (القيمة الأساسية بالأرقام + القيمة المضاعفة بالحروف كما في النموذج الورقي)")
  }

  // ── دوال لوحة التوقيع الإلكتروني ──
  function startDrawing(e) {
    const canvas = signCanvasRef.current
    if (!canvas) return
    isDrawingRef.current = true
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const ctx = canvas.getContext("2d")
    ctx.strokeStyle = "#1d4ed8"
    ctx.lineWidth = 2.8
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  function drawMove(e) {
    if (!isDrawingRef.current) return
    const canvas = signCanvasRef.current
    if (!canvas) return
    if (e.cancelable) e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const ctx = canvas.getContext("2d")
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  function stopDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = signCanvasRef.current
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"))
    }
  }

  function clearSignature() {
    const canvas = signCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setSignatureDataUrl("")
  }

  // ── صياغة رسالة الواتساب الرسمية ──
  function buildWhatsAppMessageText(data = form) {
    const incidentText = data.customIncidentText?.trim() || data.violationTitleAr
    const numFine =
      data.displayNumericFine !== undefined && data.displayNumericFine !== ""
        ? Number(data.displayNumericFine).toLocaleString("en-US")
        : Number(data.finalAmount || 0).toLocaleString("en-US")

    return [
      `⚠️ *WESTWING — Park St. West*`,
      `📄 *إخطار مخالفة تعليمات المركز التجاري*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📅 *اليوم:* ${data.dayName || "-"}  |  *الموافق:* ${formatSlashDateAr(data.date)}`,
      `🏢 *بمبنى:* ${data.building || "-"}  |  *بالدور:* ${data.floor || "-"}`,
      `🏪 *اسم الوحدة:* ${data.unitName || "-"}  |  *رقم الوحدة:* ${data.unitNo || "-"}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👁️ *أثناء مرور مشرف عام التشغيل تلاحظ:*`,
      `📌 *نوع المخالفة:* ${incidentText}`,
      data.violationCode
        ? `📚 *مرجع اللائحة:* بند رقم (${data.violationCode}) — ${data.violationTitleAr} (${data.categoryAr})`
        : null,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 *الغرامة المالية الموقعة:*`,
      `طبقاً للائحة المخالفات المعلنة للوحدات والمتعارف عليها تم توقيع غرامة مالية على الوحدة بقيمة *( ${numFine} ج )* *${data.amountWordsAr}* تسدد في خزينة الإدارة المالية للمركز التجاري على أن يراعى عدم تكرار هذه المخالفة مرة أخرى على أن يتم مضاعفة المخالفة في حالة التكرار.`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 *المدير المسئول عن الوحدة:* ${data.unitManagerName || "..................."}`,
      `🕵️‍♂️ *إدارة المركز التجاري (مشرف التشغيل):* ${data.supervisorName || "-"}`,
    ]
      .filter(Boolean)
      .join("\n")
  }

  // 1. مشاركة صورة النموذج الرسمي مباشرة على الواتساب (Web Share API with Image File)
  async function handleShareOfficialFormImage(targetData = form) {
    setSharingImage(true)
    try {
      const blob = await renderOfficialViolationFormBlob(targetData, signatureDataUrl)
      if (!blob) throw new Error("تعذر توليد صورة النموذج")

      const safeUnit = (targetData.unitName || targetData.unitNo || "Unit").replace(/[^\u0600-\u06FFa-zA-Z0-9_-]/g, "_")
      const fileName = `ParkSt_Violation_${safeUnit}_${targetData.date || todayIso()}.png`
      const file = new File([blob], fileName, { type: "image/png" })
      const caption = buildWhatsAppMessageText(targetData)

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `مخالفة تعليمات المركز التجاري - ${targetData.unitName || ""}`,
          text: caption,
          files: [file],
        })
        toast.success("تم فتح نافذة المشاركة لإرسال صورة النموذج على الواتساب")
      } else {
        // على أجهزة الكمبيوتر أو المتصفحات التي لا تدعم مشاركة الملفات مباشرة: تحميل الصورة + نسخ النص + فتح واتساب
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        try {
          await navigator.clipboard.writeText(caption)
        } catch (_) {}

        toast.success("تم تحميل صورة النموذج الرسمي (PNG) ونسخ نص المخالفة — يمكنك إرفاقها الآن في جروب الواتساب")
        window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank")
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err)
        toast.error("حدث خطأ أثناء مشاركة صورة النموذج")
      }
    } finally {
      setSharingImage(false)
    }
  }

  // 2. تحميل صورة النموذج الرسمي كملف PNG
  async function handleDownloadFormPng(targetData = form) {
    setSharingImage(true)
    try {
      const blob = await renderOfficialViolationFormBlob(targetData, signatureDataUrl)
      const safeUnit = (targetData.unitName || targetData.unitNo || "Unit").replace(/[^\u0600-\u06FFa-zA-Z0-9_-]/g, "_")
      const fileName = `ParkSt_Violation_${safeUnit}_${targetData.date || todayIso()}.png`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("تم تحميل صورة نموذج المخالفة الرسمي (PNG)")
    } catch (err) {
      console.error(err)
      toast.error("تعذر تحميل الصورة")
    } finally {
      setSharingImage(false)
    }
  }

  // 3. مشاركة نص المخالفة مباشرة إلى جروب الواتساب
  function handleShareWhatsAppText(targetData = form) {
    const text = buildWhatsAppMessageText(targetData)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  // 4. نسخ نص المخالفة للحافظة
  async function handleCopyViolationText(targetData = form) {
    const text = buildWhatsAppMessageText(targetData)
    try {
      await navigator.clipboard.writeText(text)
      toast.success("تم نسخ نص المخالفة بالكامل — جاهز للصق في جروب الواتساب")
    } catch {
      toast.error("تعذر النسخ التلقائي")
    }
  }

  // 5. طباعة / حفظ PDF للنموذج الرسمي
  async function handlePrintOfficialForm(targetData = form) {
    const blob = await renderOfficialViolationFormBlob(targetData, signatureDataUrl)
    const dataUrl = await new Promise(res => {
      const reader = new FileReader()
      reader.onloadend = () => res(reader.result)
      reader.readAsDataURL(blob)
    })

    const win = window.open("", "_blank")
    if (!win) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة")
      return
    }
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>مخالفة تعليمات المركز التجاري - ${targetData.unitName || ""}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: flex-start; }
          img { width: 100%; max-width: 210mm; height: auto; display: block; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="setTimeout(() => { window.print(); }, 250);" />
      </body>
      </html>
    `)
    win.document.close()
  }

  // 6. حفظ المخالفة في قاعدة بيانات السحابة (Firestore)
  async function handleSaveViolation(e) {
    if (e) e.preventDefault()
    if (!canAdd && !editingViolationId) {
      toast.error("ليس لديك صلاحية إضافة مخالفة")
      return
    }
    if (!form.unitName.trim() && !form.unitNo.trim()) {
      toast.error("يرجى إدخال اسم الوحدة أو رقم الوحدة أولاً")
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        customIncidentText: form.customIncidentText?.trim() || form.violationTitleAr,
        signatureDataUrl: signatureDataUrl || "",
        updatedAt: new Date().toISOString(),
      }

      if (editingViolationId) {
        await updateDoc(doc(db, VIOLATIONS_COL, editingViolationId), payload)
        toast.success("تم تحديث نموذج المخالفة بنجاح")
        if (notify) {
          notify("update", `تم تعديل مخالفة الوحدة: ${form.unitName || form.unitNo}`)
        }
      } else {
        await addDoc(collection(db, VIOLATIONS_COL), {
          ...payload,
          createdBy: currentUser?.displayName || currentUser?.email || "مشرف التشغيل",
          createdByEmail: currentUser?.email || "",
          createdAt: serverTimestamp(),
          createdAtIso: new Date().toISOString(),
        })
        toast.success("تم حفظ المخالفة في السجل السحابي بنجاح")
        if (notify) {
          notify(
            "add",
            `مخالفة جديدة على وحدة (${form.unitName || form.unitNo}) بقيمة ${Number(form.finalAmount || 0).toLocaleString()} ج.م`
          )
        }
      }
      setEditingViolationId(null)
    } catch (err) {
      console.error(err)
      toast.error("حدث خطأ أثناء حفظ المخالفة")
    } finally {
      setSaving(false)
    }
  }

  // حذف مخالفة من الأرشيف
  async function handleDeleteViolation(item) {
    if (!canDelete) return
    if (!window.confirm(`هل أنت متأكد من حذف مخالفة الوحدة "${item.unitName || item.unitNo}"؟`)) return
    try {
      await deleteDoc(doc(db, VIOLATIONS_COL, item.id))
      toast.success("تم حذف المخالفة من السجل")
    } catch (err) {
      console.error(err)
      toast.error("تعذر حذف المخالفة")
    }
  }

  // تغيير حالة تحصيل الغرامة
  async function handleCycleViolationStatus(item) {
    if (!canEdit) return
    const statuses = ["قيد التحصيل", "تم السداد بالخزينة", "مضاعفة لتكرار المخالفة", "ملغاة"]
    const idx = statuses.indexOf(item.status || "قيد التحصيل")
    const nextStatus = statuses[(idx + 1) % statuses.length]
    try {
      await updateDoc(doc(db, VIOLATIONS_COL, item.id), { status: nextStatus })
      toast.success(`تم تحديث الحالة إلى: ${nextStatus}`)
    } catch (err) {
      console.error(err)
    }
  }

  // تصدير سجل المخالفات واللائحة إلى ملف Excel
  function handleExportViolationsExcel() {
    const wb = XLSX.utils.book_new()

    // شيت 1: سجل المخالفات المحررة
    const logRows = savedViolations.map((v, i) => ({
      "م": i + 1,
      "اليوم": v.dayName || "",
      "التاريخ": v.date || "",
      "المبنى": v.building || "",
      "الدور": v.floor || "",
      "اسم الوحدة": v.unitName || "",
      "رقم الوحدة": v.unitNo || "",
      "رقم البند": v.violationCode || "",
      "تصنيف الإدارة": v.categoryAr || "",
      "بند اللائحة": v.violationTitleAr || "",
      "وصف المخالفة المرصودة": v.customIncidentText || v.violationTitleAr || "",
      "الغرامة الأساسية (ج.م)": Number(v.baseAmount || 0),
      "مضاعفة للتكرار؟": v.isDoubled ? "نعم (×2)" : "لا",
      "إجمالي الغرامة الموقعة (ج.م)": Number(v.finalAmount || 0),
      "المبلغ بالحروف": v.amountWordsAr || "",
      "المدير المسئول عن الوحدة": v.unitManagerName || "",
      "مشرف التشغيل المحرر": v.supervisorName || "",
      "حالة السداد": v.status || "قيد التحصيل",
    }))
    const wsLog = XLSX.utils.json_to_sheet(
      logRows.length > 0
        ? logRows
        : [{ "رسالة": "لا توجد مخالفات مسجلة حتى الآن" }]
    )
    XLSX.utils.book_append_sheet(wb, wsLog, "سجل المخالفات المحررة")

    // شيت 2: لائحة المخالفات الكاملة (105 بند)
    const catalogRows = MALL_VIOLATIONS_CATALOG.map(c => ({
      "كود البند": c.code,
      "بيان المخالفة": c.titleAr,
      "قيمة الغرامة (ج.م)": c.amount > 0 ? c.amount : "تقدر حسب التلفيات",
      "المبلغ بالحروف": numberToArabicWordsEgp(c.amount),
      "الإدارة المختصة": c.categoryAr,
      "مرجع نظام وقواعد العمل": c.manualRefAr || "",
    }))
    const wsCat = XLSX.utils.json_to_sheet(catalogRows)
    XLSX.utils.book_append_sheet(wb, wsCat, "لائحة المخالفات (105 بند)")

    XLSX.writeFile(wb, `ParkSt_Violations_Report_${todayIso()}.xlsx`)
    toast.success("تم تصدير سجل المخالفات ولائحة الغرامات إلى ملف Excel")
  }

  // فلترة اللائحة (105 بند)
  const filteredCatalog = useMemo(() => {
    const normQ = normalizeArabicText(catalogSearch)
    return MALL_VIOLATIONS_CATALOG.filter(item => {
      if (catalogCategory !== "all" && item.categoryAr !== catalogCategory) return false
      if (!normQ) return true
      const hay = normalizeArabicText(
        `${item.code} ${item.titleAr} ${item.categoryAr} ${(item.keywords || []).join(" ")} ${item.manualRefAr || ""}`
      )
      return hay.includes(normQ)
    })
  }, [catalogCategory, catalogSearch])

  // فلترة سجل المخالفات المحررة
  const filteredArchive = useMemo(() => {
    const normQ = normalizeArabicText(archiveSearch)
    return savedViolations.filter(v => {
      if (archiveCategory !== "all" && v.categoryAr !== archiveCategory) return false
      if (!normQ) return true
      const hay = normalizeArabicText(
        `${v.unitName} ${v.unitNo} ${v.building} ${v.floor} ${v.violationTitleAr} ${v.customIncidentText} ${v.supervisorName} ${v.date}`
      )
      return hay.includes(normQ)
    })
  }, [savedViolations, archiveCategory, archiveSearch])

  // إحصائيات سريعة
  const archiveStats = useMemo(() => {
    const totalCount = savedViolations.length
    const totalFines = savedViolations.reduce((acc, v) => acc + Number(v.finalAmount || 0), 0)
    const collectedFines = savedViolations
      .filter(v => v.status === "تم السداد بالخزينة")
      .reduce((acc, v) => acc + Number(v.finalAmount || 0), 0)
    const repeatCount = savedViolations.filter(v => v.isDoubled).length
    return { totalCount, totalFines, collectedFines, repeatCount }
  }, [savedViolations])

  const displayNumFineInPreview =
    form.displayNumericFine !== undefined && form.displayNumericFine !== ""
      ? Number(form.displayNumericFine).toLocaleString("en-US")
      : Number(form.finalAmount || 0).toLocaleString("en-US")

  const displayWordsShortInPreview = (
    form.amountWordsAr || numberToArabicWordsEgp(form.finalAmount)
  )
    .replace(/جنيهاً مصرياً فقط لا غير/g, "")
    .replace(/جنيها مصري فقط لا غير/g, "")
    .trim()

  return (
    <div style={st.wrap}>
      {/* ── الهيدر الرئيسي لقسم المخالفات ولائحة التشغيل ── */}
      <div style={st.heroCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 30 }}>⚖️</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fef2f2" }}>
                منظومة المخالفات والغرامات ونظام العمل — Park St. West
              </h2>
              <span style={st.heroBadge}>105 بند رسمي • WESTWING</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#fecaca", lineHeight: 1.7 }}>
              اكتب أي حالة أو مخالفة تم رصدها أثناء المرور الميداني ليقوم النظام تلقائياً بمطابقتها مع{" "}
              <strong>لائحة المخالفات المالية (105 بند)</strong> وتجهيز{" "}
              <strong>نموذج مخالفة تعليمات المركز التجاري الرسمي</strong> باسم مشرف التشغيل مع إمكانية مشاركته كصورة أو نص مباشرة على{" "}
              <strong>جروب الواتساب</strong>.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canExport && (
              <button type="button" onClick={handleExportViolationsExcel} style={st.excelBtn}>
                📊 تصدير السجل واللائحة (Excel)
              </button>
            )}
          </div>
        </div>

        {/* شريط الإحصائيات السريعة */}
        <div className="ps-2col-grid" style={st.statsGrid}>
          <div style={st.statBox}>
            <div style={st.statLabel}>📚 إجمالي بنود اللائحة المعتمدة</div>
            <div style={{ ...st.statValue, color: "#38bdf8" }}>105 بند</div>
          </div>
          <div style={st.statBox}>
            <div style={st.statLabel}>📝 إجمالي المخالفات المحررة</div>
            <div style={{ ...st.statValue, color: "#f59e0b" }}>{archiveStats.totalCount} مخالفة</div>
          </div>
          <div style={st.statBox}>
            <div style={st.statLabel}>💰 إجمالي الغرامات الموقعة</div>
            <div style={{ ...st.statValue, color: "#ef4444" }}>
              {archiveStats.totalFines.toLocaleString("en-US")} ج.م
            </div>
          </div>
          <div style={st.statBox}>
            <div style={st.statLabel}>✅ المحصل بالخزينة / المضاعف</div>
            <div style={{ ...st.statValue, color: "#10b981" }}>
              {archiveStats.collectedFines.toLocaleString("en-US")} ج.م ({archiveStats.repeatCount} مكرر)
            </div>
          </div>
        </div>

        {/* أزرار التنقل بين الأقسام الـ 3 */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSubTab("builder")}
            style={{
              ...st.subTabBtn,
              ...(subTab === "builder" ? st.subTabBtnActive : {}),
            }}
          >
            📝 تحرير نموذج مخالفة ذكي (ومشاركته على الواتساب)
          </button>
          <button
            type="button"
            onClick={() => setSubTab("catalog")}
            style={{
              ...st.subTabBtn,
              ...(subTab === "catalog" ? st.subTabBtnActive : {}),
            }}
          >
            📚 لائحة المخالفات والغرامات الكاملة (105 بند) ودليل التشغيل
          </button>
          <button
            type="button"
            onClick={() => setSubTab("archive")}
            style={{
              ...st.subTabBtn,
              ...(subTab === "archive" ? st.subTabBtnActive : {}),
            }}
          >
            🗂️ سجل المخالفات المحررة ({savedViolations.length})
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          القسم الأول: محرر المخالفة الذكي + المعاينة الحية للنموذج الورقي + المشاركة
         ══════════════════════════════════════════════════════════════════════════ */}
      {subTab === "builder" && (
        <div className="app-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18, alignItems: "start" }}>
          {/* ── العمود الأيمن: إدخال الواقعة والمطابقة الذكية وبيانات النموذج ── */}
          <div style={st.card}>
            <div style={st.sectionHeader}>
              <span style={{ fontSize: 20 }}>🔍</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "#f8fafc" }}>
                  1. اكتب الحالة التي حدثت (البحث والمطابقة التلقائية مع اللائحة)
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  اكتب ما تلاحظ أثناء المرور وسيقوم النظام باستخراج البند المطابق وقيمة الغرامة تلقائياً
                </div>
              </div>
            </div>

            <textarea
              rows={3}
              value={form.caseDescriptionInput}
              onChange={e => {
                const val = e.target.value
                setForm(prev => ({
                  ...prev,
                  caseDescriptionInput: val,
                  customIncidentText: val,
                }))
              }}
              placeholder="مثال: تغيير الملابس في حمام الموظفات الدور الثاني مبنى 1 من قبل موظفات تابعات إلى مطعم جو اند جوس..."
              style={st.textarea}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleSmartAnalyzeAndFill()}
                style={st.smartMatchBtn}
              >
                ⚡ طابق الحالة مع اللائحة واملأ النموذج تلقائياً
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingViolationId(null)
                  setForm(createDefaultForm(currentUser))
                  clearSignature()
                  toast("تم تفريغ النموذج لكتابة مخالفة جديدة")
                }}
                style={st.resetBtn}
              >
                🔄 نموذج جديد
              </button>
            </div>

            {/* أمثلة سريعة بضغطة واحدة */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 700 }}>
                💡 أمثلة سريعة لحالات ميدانية (اضغط للتجربة الفورية):
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {QUICK_CASE_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        caseDescriptionInput: ex.text,
                        customIncidentText: ex.text,
                        building: ex.building || prev.building,
                        floor: ex.floor || prev.floor,
                        unitName: ex.unitName || prev.unitName,
                        unitNo: ex.unitNo || prev.unitNo,
                      }))
                      handleSmartAnalyzeAndFill(ex.text)
                    }}
                    style={st.exampleChip}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* نتائج المطابقة الذكية الفورية */}
            {smartMatches.length > 0 && (
              <div style={st.smartMatchesBox}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fde68a", marginBottom: 8 }}>
                  🎯 البنود المطابقة المقترحة من لائحة بارك ستريت (اضغط لاختيار البند):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {smartMatches.map((m, idx) => {
                    const isSelected = form.violationCode === m.code
                    return (
                      <div
                        key={m.code}
                        onClick={() => selectCatalogItem(m, true)}
                        style={{
                          ...st.matchItemCard,
                          borderColor: isSelected ? "#10b981" : "#334155",
                          background: isSelected
                            ? "rgba(16, 185, 129, 0.16)"
                            : "rgba(15, 23, 42, 0.85)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#f8fafc" }}>
                            {idx === 0 ? "⭐ الأعلى تطابقاً: " : ""}بند #{m.code} — {m.titleAr}
                          </span>
                          <span style={st.amountPill}>
                            {m.amount > 0 ? `${m.amount.toLocaleString("en-US")} ج.م` : "تُقدّر حسب التلفيات"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          📂 {m.categoryAr} {m.manualRefAr ? `• ${m.manualRefAr}` : ""}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <hr style={st.divider} />

            {/* ── اختيار مباشر من الـ 105 بند مخالفة ── */}
            <div style={st.sectionHeader}>
              <span style={{ fontSize: 20 }}>📋</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "#f8fafc" }}>
                  2. البند المختار من لائحة المخالفات (105 بند)
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  يمكنك تغيير البند يدوياً أو تصفية اللائحة حسب الإدارة المختصة
                </div>
              </div>
            </div>

            <div className="ps-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={st.label}>تصفية حسب الإدارة</label>
                <select
                  value={catalogCategory}
                  onChange={e => setCatalogCategory(e.target.value)}
                  style={st.input}
                >
                  {MALL_VIOLATION_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={st.label}>اختر بند المخالفة من اللائحة</label>
                <select
                  value={form.violationCode || ""}
                  onChange={e => {
                    const code = Number(e.target.value)
                    const item = MALL_VIOLATIONS_CATALOG.find(x => x.code === code)
                    if (item) selectCatalogItem(item, true)
                  }}
                  style={st.input}
                >
                  {MALL_VIOLATIONS_CATALOG.filter(
                    x => catalogCategory === "all" || x.categoryAr === catalogCategory
                  ).map(item => (
                    <option key={item.code} value={item.code}>
                      #{item.code} - {item.titleAr} ({item.amount > 0 ? `${item.amount.toLocaleString()} ج` : "حسب التلفيات"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.manualRefAr && (
              <div style={st.ruleRefBanner}>
                📖 <strong>مرجع لائحة التشغيل:</strong> {form.manualRefAr}
              </div>
            )}

            <hr style={st.divider} />

            {/* ── 3. بيانات الوحدة والتاريخ والمبلغ والمشرف ── */}
            <div style={st.sectionHeader}>
              <span style={{ fontSize: 20 }}>🏢</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: "#f8fafc" }}>
                  3. بيانات الوحدة والغرامة المالية ومسؤول التشغيل
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  اختر الوحدة من الدليل للتعبئة التلقائية أو اكتب البيانات مباشرة
                </div>
              </div>
            </div>

            {/* اختيار سريع من دليل الوحدات المسجلة */}
            {units.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={st.label}>⚡ تعبئة تلقائية من دليل الوحدات المسجلة ({units.length} وحدة)</label>
                <select
                  value={form.unitId}
                  onChange={e => handleSelectRegisteredUnit(e.target.value)}
                  style={st.input}
                >
                  <option value="">-- اختر وحدة من الدليل أو اكتب اسم الوحدة بالأسفل --</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unitName || "بدون اسم"} — وحدة ({u.unitNo || "-"}) — مبنى {u.buildingNo || "-"} — الدور {u.floor || "-"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* تنبيه في حالة وجود مخالفات سابقة على نفس الوحدة */}
            {unitPreviousViolations.length > 0 && (
              <div style={st.repeatAlertBox}>
                <div>
                  ⚠️ <strong>تنبيه تكرار مخالفة:</strong> هذه الوحدة مسجل عليها{" "}
                  <strong>({unitPreviousViolations.length}) مخالفة سابقة</strong> في السجل!
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleDoubleFine(true)}
                  style={st.repeatDoubleBtn}
                >
                  مضاعفة الغرامة فوراً (×2)
                </button>
              </div>
            )}

            <div className="ps-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={st.label}>التاريخ (الموافق)</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => {
                    const dt = e.target.value
                    setForm(prev => ({
                      ...prev,
                      date: dt,
                      dayName: getArabicDayName(dt),
                    }))
                  }}
                  style={st.input}
                />
              </div>
              <div>
                <label style={st.label}>اليوم</label>
                <input
                  type="text"
                  value={form.dayName}
                  onChange={e => setForm(prev => ({ ...prev, dayName: e.target.value }))}
                  placeholder="مثال: الثلاثاء"
                  style={st.input}
                />
              </div>

              <div>
                <label style={st.label}>بمبنى /</label>
                <input
                  type="text"
                  value={form.building}
                  onChange={e => setForm(prev => ({ ...prev, building: e.target.value }))}
                  placeholder="مثال: 1"
                  style={st.input}
                />
              </div>
              <div>
                <label style={st.label}>بالدور /</label>
                <input
                  type="text"
                  value={form.floor}
                  onChange={e => setForm(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="مثال: الأرضي / الأول / الثاني"
                  style={st.input}
                />
              </div>

              <div>
                <label style={st.label}>اسم الوحدة /</label>
                <input
                  type="text"
                  value={form.unitName}
                  onChange={e => setForm(prev => ({ ...prev, unitName: e.target.value }))}
                  placeholder="مثال: جو اند جوس"
                  style={st.input}
                />
              </div>
              <div>
                <label style={st.label}>رقم الوحدة /</label>
                <input
                  type="text"
                  value={form.unitNo}
                  onChange={e => setForm(prev => ({ ...prev, unitNo: e.target.value }))}
                  placeholder="مثال: 1 - G"
                  style={st.input}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={st.label}>
                نوع المخالفة المكتوب على أسطر النموذج الرسمي (يمكنك التعديل بحرية)
              </label>
              <textarea
                rows={2}
                value={form.customIncidentText}
                onChange={e => setForm(prev => ({ ...prev, customIncidentText: e.target.value }))}
                placeholder="النص الذي سيظهر أمام (نوع المخالفة / ...) في النموذج الرسمي"
                style={st.textarea}
              />
            </div>

            {/* ── التحكم في قيمة الغرامة ومضاعفة التكرار ── */}
            <div style={st.fineControlCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 900, fontSize: 13, color: "#fef08a" }}>
                  💰 قيمة الغرامة المالية (بالأرقام والحروف)
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleDoubleFine(!form.isDoubled)}
                    style={{
                      ...st.toggleDoubleBtn,
                      background: form.isDoubled ? "#dc2626" : "#1e293b",
                      color: form.isDoubled ? "#fff" : "#cbd5e1",
                    }}
                  >
                    {form.isDoubled ? "✅ مُطبّق مضاعفة التكرار (×2)" : "🔄 مضاعفة المخالفة للتكرار (×2)"}
                  </button>
                  <button
                    type="button"
                    onClick={applyPaperRepeatStyle}
                    style={st.paperModeBtn}
                    title="يجعل الرقم بين القوسين (1000 ج) والمكتوب بالحروف (ألفان جنيهاً) تماماً مثل الصورة الورقية المرفقة"
                  >
                    📄 صيغة النموذج الورقي المرفق
                  </button>
                </div>
              </div>

              <div className="ps-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <label style={st.label}>المبلغ بالأرقام (ج.م)</label>
                  <input
                    type="number"
                    value={form.displayNumericFine}
                    onChange={e => {
                      const val = Number(e.target.value || 0)
                      setForm(prev => ({
                        ...prev,
                        displayNumericFine: val,
                        finalAmount: val,
                        amountWordsAr: prev.customWordsMode
                          ? prev.amountWordsAr
                          : numberToArabicWordsEgp(val),
                      }))
                    }}
                    style={st.input}
                  />
                </div>
                <div>
                  <label style={st.label}>المبلغ بالحروف العربية (يظهر في النموذج)</label>
                  <input
                    type="text"
                    value={form.amountWordsAr}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        amountWordsAr: e.target.value,
                        customWordsMode: true,
                      }))
                    }
                    style={st.input}
                  />
                </div>
              </div>
            </div>

            {/* ── بيانات التوقيعات (مشرف التشغيل + مدير الوحدة) ── */}
            <div className="ps-2col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <label style={st.label}>🕵️‍♂️ اسم مشرف التشغيل (إدارة المركز التجاري)</label>
                <input
                  type="text"
                  value={form.supervisorName}
                  onChange={e => setForm(prev => ({ ...prev, supervisorName: e.target.value }))}
                  placeholder="اسم مسؤول التشغيل"
                  style={st.input}
                />
              </div>
              <div>
                <label style={st.label}>👤 اسم المدير المسئول عن الوحدة (اختياري)</label>
                <input
                  type="text"
                  value={form.unitManagerName}
                  onChange={e => setForm(prev => ({ ...prev, unitManagerName: e.target.value }))}
                  placeholder="يُترك فارغاً للتوقيع الورقي أو يُكتب هنا"
                  style={st.input}
                />
              </div>
            </div>

            {/* خيار رسم توقيع إلكتروني يدوي لمشرف التشغيل */}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowSignPad(v => !v)}
                style={st.signToggleBtn}
              >
                ✍️ {showSignPad ? "إخفاء لوحة التوقيع اليدوي" : "رسم توقيع يدوي لمشرف التشغيل (أو استخدام التوقيع التلقائي)"}
              </button>

              {showSignPad && (
                <div style={st.signPadWrap}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                    وقّع بإصبعك أو بالماوس داخل المربع ليظهر التوقيع في خانة (إدارة المركز التجاري):
                  </div>
                  <canvas
                    ref={signCanvasRef}
                    width={320}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={drawMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={drawMove}
                    onTouchEnd={stopDrawing}
                    style={st.signCanvas}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button type="button" onClick={clearSignature} style={st.resetBtn}>
                      🗑️ مسح التوقيع اليدوي
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── العمود الأيسر: المعاينة الحية للنموذج الورقي الرسمي + أزرار المشاركة الفورية ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* شريط أزرار المشاركة على الواتساب والطباعة والحفظ */}
            <div style={st.sharePanel}>
              <div style={{ fontWeight: 900, fontSize: 14, color: "#ecfdf5", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📲</span>
                <span>مشاركة المخالفة وإرسالها على جروب الواتساب أو طباعتها:</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 8 }}>
                <button
                  type="button"
                  disabled={sharingImage}
                  onClick={() => handleShareOfficialFormImage(form)}
                  style={st.whatsappImgBtn}
                >
                  📤 {sharingImage ? "جاري تجهيز الصورة..." : "مشاركة صورة النموذج على الواتساب"}
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsAppText(form)}
                  style={st.whatsappTxtBtn}
                >
                  💬 إرسال نص المخالفة على واتساب
                </button>

                <button
                  type="button"
                  disabled={sharingImage}
                  onClick={() => handleDownloadFormPng(form)}
                  style={st.downloadPngBtn}
                >
                  🖼️ تحميل صورة النموذج (PNG)
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyViolationText(form)}
                  style={st.copyBtn}
                >
                  📋 نسخ نص المخالفة للجروب
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintOfficialForm(form)}
                  style={st.printBtn}
                >
                  🖨️ طباعة / حفظ PDF رسمي
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveViolation}
                  style={st.saveBtn}
                >
                  💾 {saving ? "جاري الحفظ..." : editingViolationId ? "تحديث المخالفة بالسجل" : "حفظ في سجل المخالفات"}
                </button>
              </div>
            </div>

            {/* ── الورقة الرسمية المعاينة (طبق الأصل من نموذج مخالفة تعليمات المركز التجارى) ── */}
            <div style={st.paperOuterWrap}>
              <div style={st.paperSheet} dir="rtl">
                {/* الهيدر العلوي: شعار WESTWING + Park St. west في اليسار */}
                <div style={st.paperTopRow}>
                  <div style={{ flex: 1 }} />
                  <div style={st.paperLogoBlock} dir="ltr">
                    {/* شعار Westwing الهندسي SVG */}
                    <svg width="72" height="42" viewBox="0 0 120 70" style={{ display: "block", margin: "0 auto" }}>
                      <path
                        d="M15 35 L35 12 L60 42 L85 12 L105 35 L85 58 L60 28 L35 58 Z"
                        fill="none"
                        stroke="#4b5563"
                        strokeWidth="9"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div style={st.logoWestwing}>WESTWING</div>
                    <div style={st.logoSub}>PROPERTY MANAGEMENT SOLUTIONS</div>
                    <div style={st.logoParkSt}>Park St.</div>
                    <div style={st.logoWest}>west</div>
                  </div>
                </div>

                {/* عنوان النموذج */}
                <div style={st.paperTitleWrap}>
                  <span style={st.paperTitle}>مخالفة تعليمات المركز التجارى</span>
                </div>

                {/* شبكة الحقول العلوية */}
                <div className="paper-meta-grid" style={st.paperMetaGrid}>
                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>اليوم /</span>
                    <span style={st.paperDottedValue}>{form.dayName || "\u00A0"}</span>
                  </div>
                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>الموافق</span>
                    <span style={st.paperDottedValue} dir="ltr">
                      {formatSlashDateAr(form.date)}
                    </span>
                  </div>

                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>بمبنى /</span>
                    <span style={st.paperDottedValue}>{form.building || "\u00A0"}</span>
                  </div>
                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>بالدور /</span>
                    <span style={st.paperDottedValue}>{form.floor || "\u00A0"}</span>
                  </div>

                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>اسم الوحدة /</span>
                    <span style={st.paperDottedValue}>{form.unitName || "\u00A0"}</span>
                  </div>
                  <div style={st.paperFieldRow}>
                    <span style={st.paperFieldLabel}>رقم الوحدة /</span>
                    <span style={st.paperDottedValue}>{form.unitNo || "\u00A0"}</span>
                  </div>
                </div>

                {/* نص الملاحظة ونوع المخالفة */}
                <div style={st.paperObservationLine}>أثناء المرور مشرف عام التشغيل تلاحظ.</div>

                <div style={st.paperViolationBlock}>
                  <span style={st.paperFieldLabel}>نوع المخالفة / </span>
                  <span style={st.paperViolationText}>
                    {form.customIncidentText?.trim() || form.violationTitleAr}
                  </span>
                </div>

                {/* الفقرة القانونية للغرامة المالية */}
                <div style={st.paperLegalParagraph}>
                  <div>
                    - &nbsp;طبقا للائحة المخالفات المعلنة للوحدات والمتعارف عليها تم توقيع غرامة مالية على الوحدة
                  </div>
                  <div style={{ marginTop: 6 }}>
                    بقيمة ({" "}
                    <span style={st.paperFineNum}>{displayNumFineInPreview} ج</span>{" "}
                    ){" "}
                    <span style={st.paperFineWords}>{displayWordsShortInPreview}</span>{" "}
                    جنيها مصري فقط لا غير
                  </div>
                  <div style={{ marginTop: 6 }}>
                    تسدد في خزينة الإدارة المالية للمركز التجاري على أن يراعي عدم تكرار هذه المخالفة مرة أخري على أن يتم مضاعفة المخالفة في حاله التكرار.
                  </div>
                </div>

                {/* التوقيعات في أسفل الورقة */}
                <div style={st.paperSignaturesWrap}>
                  {/* يمين: المدير المسئول عن الوحدة */}
                  <div style={st.paperRightSignBox}>
                    <div style={st.paperSignHeader}>المدير المسئول عن الوحدة</div>
                    <div style={st.paperFieldRow}>
                      <span style={st.paperFieldLabel}>الاسم /</span>
                      <span style={st.paperDottedValue}>{form.unitManagerName || "\u00A0"}</span>
                    </div>
                    <div style={st.paperFieldRow}>
                      <span style={st.paperFieldLabel}>التوقيع /</span>
                      <span style={st.paperDottedValue}>{form.unitManagerSign || "\u00A0"}</span>
                    </div>
                    <div style={st.paperFieldRow}>
                      <span style={st.paperFieldLabel}>التاريخ</span>
                      <span style={st.paperDottedValue}>
                        {form.unitManagerSignDate
                          ? formatSlashDateAr(form.unitManagerSignDate)
                          : "   /    /    "}
                      </span>
                    </div>
                  </div>

                  {/* يسار أسفل: إدارة المركز التجاري */}
                  <div style={st.paperLeftSignBox}>
                    <div style={st.paperSignHeader}>إدارة المركز التجاري</div>
                    <div style={st.paperFieldRow}>
                      <span style={st.paperFieldLabel}>اسم مشرف التشغيل /</span>
                      <span style={st.paperDottedValue}>{form.supervisorName || "\u00A0"}</span>
                    </div>
                    <div style={{ ...st.paperFieldRow, position: "relative", minHeight: 48 }}>
                      <span style={st.paperFieldLabel}>التوقيع /</span>
                      <span style={st.paperDottedValue}>
                        {signatureDataUrl ? (
                          <img
                            src={signatureDataUrl}
                            alt="توقيع مشرف التشغيل"
                            style={{ height: 44, objectFit: "contain", verticalAlign: "middle" }}
                          />
                        ) : (
                          <span style={st.autoStylizedSign}>{form.supervisorName}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          القسم الثاني: لائحة المخالفات والغرامات الكاملة (105 بند) + فصول دليل التشغيل
         ══════════════════════════════════════════════════════════════════════════ */}
      {subTab === "catalog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={st.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc", fontWeight: 900 }}>
                  📚 جدول القيم المالية للغرامات والمخالفات — Park St. West (105 بند)
                </h3>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  اضغط على زر (⚡ تحرير مخالفة بهذا البند) أمام أي بند ليتم نقله فوراً إلى نموذج المخالفة الرسمي
                </div>
              </div>
              <input
                type="search"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="🔍 ابحث برقم البند أو الكلمة (مثال: تدخين، حمام، ترولي، طفاية، دهون)..."
                style={{ ...st.input, maxWidth: 380 }}
              />
            </div>

            {/* أزرار التصنيف */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {MALL_VIOLATION_CATEGORIES.map(cat => {
                const active = catalogCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCatalogCategory(cat.id)}
                    style={{
                      background: active ? cat.color : "#0f172a",
                      color: active ? "#020617" : "#cbd5e1",
                      border: `1px solid ${active ? cat.color : "#334155"}`,
                      borderRadius: 999,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {cat.icon} {cat.labelAr}
                  </button>
                )
              })}
            </div>

            {/* قائمة البنود */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 10 }}>
              {filteredCatalog.map(item => (
                <div key={item.code} style={st.catalogCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={st.codeBadge}>بند #{item.code}</span>
                    <span style={st.categoryTag}>{item.categoryAr}</span>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc", margin: "8px 0 6px", lineHeight: 1.5 }}>
                    {item.titleAr}
                  </div>

                  {item.manualRefAr && (
                    <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>
                      📖 {item.manualRefAr}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: "1px solid #1e293b", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#f87171" }}>
                        {item.amount > 0 ? `${item.amount.toLocaleString("en-US")} ج.م` : "تُقدّر حسب التلفيات"}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>
                        {numberToArabicWordsEgp(item.amount)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        selectCatalogItem(item, false)
                        setSubTab("builder")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      style={st.useRuleBtn}
                    >
                      ⚡ تحرير مخالفة بهذا البند
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ملخص فصول دليل التشغيل الرسمي (27 صفحة) */}
          <div style={st.card}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "#f8fafc", fontWeight: 900 }}>
              📘 ملخص قواعد وتعليمات التشغيل من الدليل الرسمي (PARK ST. OPERATIONS MANUAL)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
              {MALL_MANUAL_CHAPTERS.map(ch => (
                <div key={ch.id} style={st.chapterBox}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: "#38bdf8", marginBottom: 8 }}>
                    {ch.icon} {ch.titleAr}
                  </div>
                  <ul style={{ margin: 0, paddingRight: 18, color: "#cbd5e1", fontSize: 12, lineHeight: 1.8 }}>
                    {ch.rules.map((r, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          القسم الثالث: سجل المخالفات المحررة (الأرشيف والمتابعة والمشاركة)
         ══════════════════════════════════════════════════════════════════════════ */}
      {subTab === "archive" && (
        <div style={st.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc", fontWeight: 900 }}>
                🗂️ سجل المخالفات المحررة للوحدات ({filteredArchive.length})
              </h3>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                يمكنك إعادة فتح أي مخالفة أو مشاركة صورتها الرسمية على جروب الواتساب أو طباعتها في أي وقت
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={archiveCategory}
                onChange={e => setArchiveCategory(e.target.value)}
                style={{ ...st.input, width: "auto" }}
              >
                {MALL_VIOLATION_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.labelAr}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={archiveSearch}
                onChange={e => setArchiveSearch(e.target.value)}
                placeholder="🔍 ابحث باسم الوحدة أو المشرف أو التاريخ..."
                style={{ ...st.input, minWidth: 240 }}
              />
            </div>
          </div>

          {loadingViolations ? (
            <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>
              جاري تحميل سجل المخالفات...
            </div>
          ) : filteredArchive.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "#64748b", background: "#091326", borderRadius: 12, border: "1px dashed #1e293b" }}>
              لا توجد مخالفات مسجلة مطابقة للبحث حالياً.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredArchive.map(v => (
                <div key={v.id} style={st.archiveCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, fontSize: 16, color: "#f8fafc" }}>
                          🏪 {v.unitName || "وحدة غير مسماة"} {v.unitNo ? `(${v.unitNo})` : ""}
                        </span>
                        <span style={st.codeBadge}>بند #{v.violationCode || "-"}</span>
                        <span style={st.categoryTag}>{v.categoryAr || "إدارة التشغيل"}</span>
                        {v.isDoubled && (
                          <span style={{ background: "#7f1d1d", color: "#fecaca", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                            ⚠️ مضاعفة للتكرار (×2)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        📅 {v.dayName} {formatSlashDateAr(v.date)} • 🏢 مبنى ({v.building || "-"}) • الدور ({v.floor || "-"}) • 🕵️‍♂️ مشرف التشغيل:{" "}
                        <strong style={{ color: "#e2e8f0" }}>{v.supervisorName || "-"}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 900, fontSize: 17, color: "#f87171" }}>
                        {Number(v.finalAmount || 0).toLocaleString("en-US")} ج.م
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCycleViolationStatus(v)}
                        style={{
                          marginTop: 4,
                          background:
                            v.status === "تم السداد بالخزينة"
                              ? "#065f46"
                              : v.status === "ملغاة"
                              ? "#334155"
                              : "#78350f",
                          color: "#fff",
                          border: "none",
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                        title="اضغط لتغيير حالة التحصيل"
                      >
                        🔄 {v.status || "قيد التحصيل"}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#060d1a", borderRadius: 8, border: "1px solid #1e293b", fontSize: 13, color: "#e2e8f0" }}>
                    <strong>نوع المخالفة:</strong> {v.customIncidentText || v.violationTitleAr}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          ...createDefaultForm(currentUser),
                          ...v,
                        })
                        setSignatureDataUrl(v.signatureDataUrl || "")
                        setEditingViolationId(v.id)
                        setSubTab("builder")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      style={st.useRuleBtn}
                    >
                      📄 فتح في النموذج الرسمي / تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareOfficialFormImage(v)}
                      style={st.whatsappImgBtnSmall}
                    >
                      📤 مشاركة صورة النموذج واتساب
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppText(v)}
                      style={st.whatsappTxtBtnSmall}
                    >
                      💬 واتساب (نص)
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintOfficialForm(v)}
                      style={st.printBtnSmall}
                    >
                      🖨️ طباعة
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteViolation(v)}
                        style={st.deleteBtnSmall}
                      >
                        🗑️ حذف
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎨 التنسيقات (متوافقة 100% مع الهاتف والشاشات الكبيرة)
// ══════════════════════════════════════════════════════════════════════════════
const st = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  heroCard: {
    background: "linear-gradient(135deg, rgba(127, 29, 29, 0.45), rgba(15, 23, 42, 0.95))",
    border: "1px solid #dc2626",
    borderRadius: 16,
    padding: 18,
  },
  heroBadge: {
    background: "#dc2626",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    padding: "3px 10px",
    borderRadius: 999,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  statBox: {
    background: "rgba(6, 13, 26, 0.75)",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "10px 14px",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 700,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 4,
  },
  subTabBtn: {
    background: "#0f172a",
    color: "#94a3b8",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  subTabBtnActive: {
    background: "linear-gradient(135deg, #dc2626, #991b1b)",
    color: "#fff",
    borderColor: "#f87171",
  },
  excelBtn: {
    background: "#065f46",
    color: "#ecfdf5",
    border: "1px solid #10b981",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  card: {
    background: "rgba(10, 22, 40, 0.9)",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#cbd5e1",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    background: "#060d1a",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#f8fafc",
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    background: "#060d1a",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#f8fafc",
    fontSize: 13,
    fontFamily: "inherit",
    lineHeight: 1.6,
    boxSizing: "border-box",
  },
  smartMatchBtn: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#020617",
    border: "none",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    flex: 1,
  },
  resetBtn: {
    background: "#1e293b",
    color: "#cbd5e1",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  exampleChip: {
    background: "#0f172a",
    color: "#38bdf8",
    border: "1px solid #1e293b",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  smartMatchesBox: {
    marginTop: 12,
    background: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: 12,
    padding: 12,
  },
  matchItemCard: {
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "0.15s",
  },
  amountPill: {
    background: "#7f1d1d",
    color: "#fecaca",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #1e293b",
    margin: "16px 0",
  },
  ruleRefBanner: {
    background: "rgba(14, 116, 144, 0.18)",
    border: "1px solid #0e7490",
    color: "#bae6fd",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    lineHeight: 1.6,
  },
  repeatAlertBox: {
    background: "rgba(220, 38, 38, 0.18)",
    border: "1px solid #ef4444",
    color: "#fecaca",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  repeatDoubleBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  fineControlCard: {
    marginTop: 12,
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 12,
  },
  toggleDoubleBtn: {
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  paperModeBtn: {
    background: "#312e81",
    color: "#e0e7ff",
    border: "1px solid #4f46e5",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  signToggleBtn: {
    width: "100%",
    background: "#0f172a",
    color: "#38bdf8",
    border: "1px dashed #334155",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  signPadWrap: {
    marginTop: 8,
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: 10,
  },
  signCanvas: {
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #94a3b8",
    cursor: "crosshair",
    touchAction: "none",
    maxWidth: "100%",
  },
  sharePanel: {
    background: "linear-gradient(135deg, rgba(6, 95, 70, 0.5), rgba(15, 23, 42, 0.95))",
    border: "1px solid #10b981",
    borderRadius: 16,
    padding: 14,
  },
  whatsappImgBtn: {
    background: "linear-gradient(135deg, #16a34a, #15803d)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  whatsappTxtBtn: {
    background: "#059669",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  downloadPngBtn: {
    background: "#0284c7",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  copyBtn: {
    background: "#334155",
    color: "#f8fafc",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  printBtn: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  // ── تنسيق الورقة البيضاء الرسمية (Paper Form Replica) ──
  paperOuterWrap: {
    background: "#091326",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 12,
  },
  paperSheet: {
    background: "#fcfcfa",
    color: "#111827",
    borderRadius: 10,
    padding: "24px 22px 30px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
    border: "1px solid #d1d5db",
    fontFamily: "'IBM Plex Sans Arabic', 'Cairo', Tahoma, sans-serif",
  },
  paperTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  paperLogoBlock: {
    textAlign: "center",
    color: "#374151",
    lineHeight: 1.15,
  },
  logoWestwing: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  logoSub: {
    fontSize: 6.5,
    letterSpacing: 0.7,
    color: "#6b7280",
    fontWeight: 700,
    marginBottom: 6,
  },
  logoParkSt: {
    fontSize: 25,
    fontWeight: 900,
    color: "#374151",
  },
  logoWest: {
    fontSize: 13,
    fontWeight: 800,
    color: "#4b5563",
    marginLeft: 44,
  },
  paperTitleWrap: {
    textAlign: "center",
    margin: "12px 0 20px",
  },
  paperTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: "#111827",
    borderBottom: "2.5px solid #111827",
    paddingBottom: 3,
  },
  paperMetaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px 18px",
    marginBottom: 16,
  },
  paperFieldRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    fontSize: 15,
    fontWeight: 800,
  },
  paperFieldLabel: {
    whiteSpace: "nowrap",
    color: "#111827",
    fontWeight: 800,
  },
  paperDottedValue: {
    flex: 1,
    borderBottom: "2px dotted #6b7280",
    color: "#1e3a8a",
    fontWeight: 900,
    textAlign: "center",
    paddingBottom: 2,
    minWidth: 70,
  },
  paperObservationLine: {
    fontSize: 15,
    fontWeight: 900,
    color: "#111827",
    marginTop: 8,
    marginBottom: 10,
  },
  paperViolationBlock: {
    fontSize: 15,
    lineHeight: 2.05,
    marginBottom: 16,
  },
  paperViolationText: {
    color: "#1e3a8a",
    fontWeight: 900,
    borderBottom: "2px dotted #6b7280",
    paddingBottom: 2,
  },
  paperLegalParagraph: {
    fontSize: 14.5,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.9,
    margin: "14px 0 24px",
  },
  paperFineNum: {
    color: "#b91c1c",
    fontWeight: 900,
    fontSize: 16,
    padding: "0 4px",
  },
  paperFineWords: {
    color: "#1e3a8a",
    fontWeight: 900,
    borderBottom: "2px dotted #6b7280",
    padding: "0 12px",
  },
  paperSignaturesWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 20,
    marginTop: 22,
    alignItems: "end",
  },
  paperRightSignBox: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  paperLeftSignBox: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 28,
  },
  paperSignHeader: {
    fontSize: 16,
    fontWeight: 900,
    color: "#111827",
    textDecoration: "underline",
    marginBottom: 4,
  },
  autoStylizedSign: {
    fontFamily: "'IBM Plex Sans Arabic', Georgia, serif",
    fontStyle: "italic",
    color: "#1d4ed8",
    fontSize: 16,
    fontWeight: 900,
    display: "inline-block",
    transform: "rotate(-4deg)",
  },

  // ── كروت اللائحة والأرشيف ──
  catalogCard: {
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
  },
  codeBadge: {
    background: "#1e293b",
    color: "#38bdf8",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 900,
  },
  categoryTag: {
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fcd34d",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 800,
  },
  useRuleBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  chapterBox: {
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 14,
  },
  archiveCard: {
    background: "#091326",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 14,
  },
  whatsappImgBtnSmall: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  whatsappTxtBtnSmall: {
    background: "#059669",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  printBtnSmall: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  deleteBtnSmall: {
    background: "#7f1d1d",
    color: "#fecaca",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
}
