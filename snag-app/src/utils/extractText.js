import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

// Setup pdf.js worker using standard Vite syntax
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Extracts text from a PDF or Image file
 */
export async function extractTextFromFile(file) {
  if (!file) return ""

  const isPdf = file.type === "application/pdf"
  const isImg = file.type.startsWith("image/")

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ""
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { // الحد الأقصى 3 صفحات لتسريع العملية
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(" ")
        fullText += pageText + "\n"
        
        // إذا لم يكن هناك نص (ملفات CamScanner أو ملفات مصورة)
        if (!fullText.trim() && i === 1) {
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          const context = canvas.getContext("2d")
          await page.render({ canvasContext: context, viewport }).promise
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
          
          try {
            const result = await Tesseract.recognize(dataUrl, 'ara+eng')
            fullText += result.data.text + "\n"
          } catch(ocrErr) {
            console.error("PDF OCR error:", ocrErr)
          }
        }
      }
      return fullText
    } catch (err) {
      console.error("PDF Extraction error:", err)
      return ""
    }
  } else if (isImg) {
    try {
      const result = await Tesseract.recognize(file, 'ara+eng', {
        logger: m => console.log(m)
      })
      return result.data.text
    } catch (err) {
      console.error("OCR error:", err)
      return ""
    }
  }

  return ""
}
