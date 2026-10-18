import { useState } from "react"
import { genId } from "../constants/index.js"
import { processFile } from "../utils/compress.js"

const MAX_FILES = 4  // أقصى عدد مرفقات (4 بدلاً من 8 لضمان عدم تجاوز حد Firestore)

export function useAttachments() {
  const [attachments, setAttachments] = useState([])

  async function addFiles(fileList) {
    const available = MAX_FILES - attachments.length
    if (available <= 0) {
      alert(`الحد الأقصى ${MAX_FILES} مرفقات`)
      return
    }
    const files = Array.from(fileList || []).slice(0, available)
    const mapped = []
    
    for (const file of files) {
      try {
        const dataUrl = await processFile(file)
        mapped.push({
          id:      genId(),
          name:    file.name,
          size:    file.size,
          type:    file.type || "application/octet-stream",
          dataUrl,
        })
      } catch (err) {
        if (err.message === "file_too_large") {
          alert(`⚠️ الملف "${file.name}" كبير جداً وتجاوز سعة التخزين المجانية (أقصى حجم للملفات المباشرة 500KB، وحفظ الملفات الكبيرة يتطلب إعداد Firebase Storage).`)
        } else {
          console.error("Error processing file:", file.name, err)
          alert(`❌ فشل في معالجة الملف: ${file.name}`)
        }
      }
    }
    
    setAttachments((prev) => [...prev, ...mapped])
  }

  function removeFile(id) {
    setAttachments((prev) => prev.filter((f) => f.id !== id))
  }

  function clear() {
    setAttachments([])
  }

  return { attachments, addFiles, removeFile, clear }
}
