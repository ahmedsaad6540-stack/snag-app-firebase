/**
 * 💡 Smart Suggestions Engine
 * محرك الاقتراحات الذكية — يقترح حلول ويكشف التكرارات
 */

/**
 * اقتراح حلول بناءً على ملاحظات سابقة مشابهة
 */
export function getSimilarSnags(currentDesc, snags = [], limit = 5) {
  if (!currentDesc?.trim() || snags.length === 0) return []

  const words = currentDesc.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return []

  const scored = snags.map(snag => {
    const desc = (snag.description || "").toLowerCase()
    let matchCount = 0
    words.forEach(w => { if (desc.includes(w)) matchCount++ })
    const similarity = words.length > 0 ? Math.round((matchCount / words.length) * 100) : 0
    return { ...snag, similarity }
  })
    .filter(s => s.similarity > 30)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}

/**
 * كشف الملاحظات المكررة المحتملة
 */
export function detectDuplicates(snags = [], threshold = 60) {
  if (snags.length < 2) return []
  
  const duplicateGroups = []
  const checked = new Set()

  for (let i = 0; i < snags.length; i++) {
    if (checked.has(snags[i].id)) continue
    const group = [snags[i]]
    
    for (let j = i + 1; j < snags.length; j++) {
      if (checked.has(snags[j].id)) continue
      
      const sim = calculateSimilarity(snags[i], snags[j])
      if (sim >= threshold) {
        group.push({ ...snags[j], similarity: sim })
        checked.add(snags[j].id)
      }
    }
    
    if (group.length > 1) {
      checked.add(snags[i].id)
      duplicateGroups.push({
        primary: snags[i],
        duplicates: group.slice(1),
        count: group.length,
      })
    }
  }

  return duplicateGroups
}

function calculateSimilarity(a, b) {
  const descA = (a.description || "").toLowerCase()
  const descB = (b.description || "").toLowerCase()
  
  // Same location + same trade + similar description = likely duplicate
  let score = 0
  if (a.location === b.location) score += 25
  if (a.trade === b.trade) score += 20
  if (a.type === b.type) score += 10

  // Word overlap
  const wordsA = new Set(descA.split(/\s+/).filter(w => w.length > 2))
  const wordsB = new Set(descB.split(/\s+/).filter(w => w.length > 2))
  let overlap = 0
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++ })
  const maxWords = Math.max(wordsA.size, wordsB.size, 1)
  score += Math.round((overlap / maxWords) * 45)

  return Math.min(100, score)
}

/**
 * اقتراحات ذكية حسب السياق
 */
export function getSmartSuggestions(snag, allSnags = []) {
  const suggestions = []

  // 1. Check for recurring issues at same location
  const sameLocation = allSnags.filter(s =>
    s.location === snag.location &&
    s.trade === snag.trade &&
    s.id !== snag.id
  )
  
  if (sameLocation.length >= 3) {
    suggestions.push({
      type: "recurring",
      icon: "🔄",
      title: "مشكلة متكررة",
      message: `تم تسجيل ${sameLocation.length} ملاحظة مشابهة في نفس الموقع — قد تكون مشكلة جذرية تحتاج حل شامل`,
      severity: "warning",
    })
  }

  // 2. Check for escalation pattern
  const reopened = allSnags.filter(s =>
    s.location === snag.location &&
    s.status === "open" &&
    s.id !== snag.id
  )
  if (reopened.length > 2) {
    suggestions.push({
      type: "escalation",
      icon: "⬆️",
      title: "نمط تصعيد",
      message: `يوجد ${reopened.length} ملاحظة مفتوحة في نفس الموقع — يُنصح بجولة تفتيش شاملة`,
      severity: "important",
    })
  }

  // 3. Trade-specific advice
  const tradeAdvice = {
    electrical: "تأكد من فصل التيار قبل أي تدخل كهربائي، وفي حالة الإضاءة (كشاف، كشافات، ليد، ليدات) افحص التوصيلات والترانس قبل الاستبدال",
    fire: "أي خلل في أنظمة الإطفاء يجب معالجته خلال 24 ساعة",
    plumbing: "تحقق من مصدر التسريب الرئيسي قبل الإصلاح المحلي",
    security: "وثّق الحالة بالكاميرات قبل التدخل",
    ac: "تحقق من فلتر الهواء أولاً — 60% من مشاكل التكييف سببها الفلاتر",
  }
  
  if (tradeAdvice[snag.trade]) {
    suggestions.push({
      type: "advice",
      icon: "💡",
      title: "نصيحة مهنية",
      message: tradeAdvice[snag.trade],
      severity: "info",
    })
  }

  // 4. Similar resolved issues
  const resolved = allSnags.filter(s =>
    s.trade === snag.trade &&
    s.status === "closed" &&
    s.id !== snag.id
  ).slice(0, 3)

  if (resolved.length > 0) {
    suggestions.push({
      type: "reference",
      icon: "📋",
      title: "ملاحظات مشابهة تم حلها",
      message: `يوجد ${resolved.length} ملاحظة مشابهة تم إغلاقها — يمكن مراجعتها للاستفادة`,
      severity: "info",
      relatedIds: resolved.map(r => r.id),
    })
  }

  return suggestions
}

/**
 * تحليل عبء العمل وتوزيع المهام
 */
export function analyzeWorkload(snags = []) {
  const openByTrade = {}
  const openByLocation = {}
  const openByPriority = { urgent: 0, medium: 0, normal: 0 }

  snags.filter(s => s.status !== "closed").forEach(s => {
    openByTrade[s.trade] = (openByTrade[s.trade] || 0) + 1
    openByLocation[s.location] = (openByLocation[s.location] || 0) + 1
    openByPriority[s.priority] = (openByPriority[s.priority] || 0) + 1
  })

  const busiestTrade = Object.entries(openByTrade).sort((a, b) => b[1] - a[1])[0]
  const busiestLocation = Object.entries(openByLocation).sort((a, b) => b[1] - a[1])[0]

  return {
    openByTrade,
    openByLocation,
    openByPriority,
    busiestTrade: busiestTrade ? { trade: busiestTrade[0], count: busiestTrade[1] } : null,
    busiestLocation: busiestLocation ? { location: busiestLocation[0], count: busiestLocation[1] } : null,
    totalOpen: snags.filter(s => s.status !== "closed").length,
    urgentOpen: openByPriority.urgent,
  }
}
