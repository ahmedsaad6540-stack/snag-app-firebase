import { compressImageFile, readFileAsDataUrl } from "./imageCompression.js"
export { compressImageFile, readFileAsDataUrl } from "./imageCompression.js"

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
