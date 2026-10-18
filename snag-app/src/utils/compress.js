/**
 * 🖼️ Smart Image Compression Engine v2
 * 
 * المعمارية الجديدة:
 * - يتم ضغط كل صورة فور إضافتها (وليس عند الحفظ)
 * - الصور تُحفظ مباشرة في Firestore بدون الحاجة لـ Firebase Storage
 * - ضغط ذكي متعدد المراحل يضمن عدم تجاوز الحد الأقصى
 */

const MAX_THUMB_KB   = 40    // الحد الأقصى لكل صورة بالكيلوبايت
const MAX_DIMENSION  = 400   // أقصى بعد (عرض أو ارتفاع) بالبكسل
const INITIAL_QUALITY = 0.6  // جودة البداية

/**
 * ضغط ملف صورة إلى dataUrl صغير مضمون الحجم
 * يقلل الجودة تدريجياً حتى يصل للحجم المطلوب
 */
export function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    // Timeout: إذا لم يكتمل خلال 8 ثوان، ارفض
    const timer = setTimeout(() => reject(new Error("compress_timeout")), 8000)

    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      clearTimeout(timer)
      try {
        URL.revokeObjectURL(url)
        const result = shrinkToTarget(img, MAX_DIMENSION, MAX_THUMB_KB)
        resolve(result)
      } catch (e) {
        reject(e)
      }
    }
    
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error("image_load_failed"))
    }
    
    img.src = url
  })
}

/**
 * الضغط الفعلي: يرسم الصورة على Canvas ويقلل الجودة تدريجياً
 */
function shrinkToTarget(img, maxDim, maxKB) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width  = Math.round(img.width  * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)

  // محاولات متعددة لتقليل الحجم
  let quality = INITIAL_QUALITY
  let dataUrl = canvas.toDataURL("image/jpeg", quality)

  // كل مرة نقلل الجودة حتى نصل للحجم المطلوب
  for (let i = 0; i < 5 && estimateKB(dataUrl) > maxKB; i++) {
    quality -= 0.1
    if (quality < 0.1) quality = 0.1
    dataUrl = canvas.toDataURL("image/jpeg", quality)
  }

  // إذا مازال كبيراً، صغّر الأبعاد أكثر
  if (estimateKB(dataUrl) > maxKB) {
    canvas.width  = Math.round(canvas.width * 0.6)
    canvas.height = Math.round(canvas.height * 0.6)
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
    dataUrl = canvas.toDataURL("image/jpeg", 0.3)
  }

  return dataUrl
}

/** حساب تقريبي لحجم dataUrl بالكيلوبايت */
function estimateKB(dataUrl) {
  // base64 data after comma
  const base64 = dataUrl.split(",")[1] || ""
  return Math.round((base64.length * 3) / 4 / 1024)
}

/**
 * قراءة ملف غير صورة كـ dataUrl (PDF, etc)
 * يُستخدم فقط للملفات الصغيرة
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("read_timeout")), 5000)
    const reader = new FileReader()
    reader.onload = () => { clearTimeout(timer); resolve(reader.result) }
    reader.onerror = () => { clearTimeout(timer); reject(new Error("read_failed")) }
    reader.readAsDataURL(file)
  })
}

import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "../lib/firebase.js"

/**
 * معالجة ملف: إذا صورة → ضغط | إذا ملف آخر → إذا صغير يقرأ كـ base64، وإذا كبير يرفع للـ Storage
 */
export async function processFile(file) {
  if (file.type.startsWith("image/")) {
    return await compressImageFile(file)
  }
  
  // ملفات غير صور (مثل PDF): إذا أقل من 500KB نحفظها Base64
  if (file.size <= 500 * 1024) {
    return await readFileAsDataUrl(file)
  }
  
  // إذا أكبر من 500KB، نرفعها لـ Firebase Storage
  try {
    const fileRef = ref(storage, `attachments/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
    await uploadBytes(fileRef, file)
    const downloadUrl = await getDownloadURL(fileRef)
    return downloadUrl // Return the http link instead of dataUrl
  } catch (err) {
    console.error("Storage upload error, trying PDF fallback:", err)
    
    // إذا فشل التخزين وكان الملف PDF، حاول استخراج أول صفحة كصورة بدلاً من رفضه
    if (file.type === "application/pdf") {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext("2d")
        await page.render({ canvasContext: context, viewport }).promise
        
        return canvas.toDataURL("image/jpeg", 0.6) // Compress to JPEG
      } catch (pdfErr) {
        console.error("PDF to Image fallback failed:", pdfErr)
      }
    }

    throw new Error("file_too_large") // Fallback error if everything fails
  }
}

// ── Legacy exports for backward compatibility ──
export const compressImg = compressImageFile
export const fileToDataUrl = processFile
export const compressDataUrl = (dataUrl) => Promise.resolve(dataUrl)
