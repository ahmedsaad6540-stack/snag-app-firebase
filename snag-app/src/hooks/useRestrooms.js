import { useEffect, useMemo, useState } from "react"
import {
  collection, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp, writeBatch
} from "firebase/firestore"
import { db } from "../lib/firebase.js"
import {
  RESTROOM_LOCATIONS,
  RESTROOM_ZONES,
  buildRestroomRows,
  getRowHealth,
} from "../constants/restroomsData.js"

const COL_NAME = "restroom_inspections"
const META_COL = "restroom_status"

export function useRestrooms(notify) {
  const [savedMap, setSavedMap] = useState({})
  const [customRows, setCustomRows] = useState([])
  const [restroomMeta, setRestroomMeta] = useState({}) // restroomKey -> { confirmed, inspector, lastRoundDate, roundsCount }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub1 = onSnapshot(
      collection(db, COL_NAME),
      (snap) => {
        const map = {}
        const customs = []
        snap.docs.forEach((d) => {
          const data = d.data()
          if (data.isCustom) {
            customs.push({ id: d.id, ...data })
          } else {
            map[d.id] = { id: d.id, ...data }
          }
        })
        setSavedMap(map)
        setCustomRows(customs)
        setLoading(false)
      },
      (err) => {
        console.error("Restroom inspections error:", err)
        setError(err.message)
        setLoading(false)
      }
    )

    const unsub2 = onSnapshot(
      collection(db, META_COL),
      (snap) => {
        const meta = {}
        snap.docs.forEach((d) => {
          meta[d.id] = d.data()
        })
        setRestroomMeta(meta)
      },
      (err) => {
        console.error("Restroom meta error:", err)
      }
    )

    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  const rows = useMemo(() => buildRestroomRows(savedMap, customRows), [savedMap, customRows])

  // حساب الإحصائيات العليا وجدول تغطية المناطق
  const dashboard = useMemo(() => {
    const byRestroom = {}
    for (const loc of RESTROOM_LOCATIONS) {
      byRestroom[loc.restroomKey] = {
        ...loc,
        meta: restroomMeta[loc.restroomKey] || {},
        totalComponents: 0,
        inspectedComponents: 0,
        okComponents: 0,
        defectComponents: 0,
        pendingComponents: 0,
        badMirrors: 0,
      }
    }

    let inspectedComponents = 0
    let okComponents = 0
    let defectComponents = 0
    let pendingComponents = 0

    for (const r of rows) {
      const health = getRowHealth(r)
      const rr = byRestroom[r.restroomKey]
      if (rr) {
        rr.totalComponents++
        if (health === "ok") {
          rr.inspectedComponents++
          rr.okComponents++
        } else if (health === "defect") {
          rr.inspectedComponents++
          rr.defectComponents++
          if (r.component === "المرايا") {
            rr.badMirrors += Number(r.defectiveCount || 0) + Number(r.missingCount || 0) || 1
          }
        } else {
          rr.pendingComponents++
        }
      }

      if (health === "ok") {
        inspectedComponents++
        okComponents++
      } else if (health === "defect") {
        inspectedComponents++
        defectComponents++
      } else {
        pendingComponents++
      }
    }

    const restroomList = Object.values(byRestroom).map((rr) => {
      const isConfirmed = Boolean(rr.meta?.confirmed) || (rr.inspectedComponents > 0 && rr.pendingComponents === 0)
      const isInspected = rr.inspectedComponents > 0
      return {
        ...rr,
        isConfirmed,
        isInspected,
        roundsCount: rr.meta?.roundsCount || (isInspected ? 1 : 0),
      }
    })

    const confirmedRestrooms = restroomList.filter((r) => r.isConfirmed).length
    const pendingRestrooms = restroomList.length - confirmedRestrooms
    const totalRounds = restroomList.reduce((sum, r) => sum + (r.roundsCount || 0), 0)

    const zoneCoverage = RESTROOM_ZONES.map((zone) => {
      const zRestrooms = restroomList.filter((r) => r.building === zone)
      const confirmed = zRestrooms.filter((r) => r.isConfirmed).length
      const rounds = zRestrooms.reduce((s, r) => s + (r.roundsCount || 0), 0)
      const badMirrors = zRestrooms.reduce((s, r) => s + (r.badMirrors || 0), 0)
      const defects = zRestrooms.reduce((s, r) => s + (r.defectComponents || 0), 0)
      const inspected = zRestrooms.reduce((s, r) => s + (r.inspectedComponents || 0), 0)
      const totalComp = zRestrooms.reduce((s, r) => s + (r.totalComponents || 0), 0)
      return {
        zone,
        totalRestrooms: zRestrooms.length,
        confirmed,
        rounds,
        badMirrors,
        defects,
        inspected,
        totalComp,
      }
    })

    return {
      totalRestrooms: restroomList.length,
      confirmedRestrooms,
      pendingRestrooms,
      totalRounds,
      totalComponents: rows.length,
      inspectedComponents,
      okComponents,
      defectComponents,
      pendingComponents,
      restroomList,
      zoneCoverage,
    }
  }, [rows, restroomMeta])

  async function saveComponentRow(rowId, updates, userName = "") {
    const today = new Date().toLocaleDateString("ar-EG")
    const payload = {
      ...updates,
      inspectDate: updates.inspectDate || today,
      inspector: updates.inspector || userName || "مشرف الفحص",
      updatedAt: serverTimestamp(),
    }
    await setDoc(doc(db, COL_NAME, rowId), payload, { merge: true })
  }

  async function toggleRestroomConfirmed(restroomKey, confirmed, userName = "") {
    const prev = restroomMeta[restroomKey] || {}
    await setDoc(
      doc(db, META_COL, restroomKey),
      {
        confirmed,
        inspector: userName || prev.inspector || "مشرف الفحص",
        lastRoundDate: new Date().toLocaleDateString("ar-EG"),
        roundsCount: Math.max(1, (prev.roundsCount || 0) + (confirmed ? 1 : 0)),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    if (notify) {
      const loc = RESTROOM_LOCATIONS.find((l) => l.restroomKey === restroomKey)
      if (loc) {
        notify(
          "status",
          `${confirmed ? "تم تأكيد فحص" : "إعادة فتح فحص"} حمام: ${loc.building} - ${loc.direction} (${loc.floor} - ${loc.gender})`
        )
      }
    }
  }

  async function markAllRestroomOk(restroomKey, userName = "") {
    const targetRows = rows.filter((r) => r.restroomKey === restroomKey)
    const today = new Date().toLocaleDateString("ar-EG")
    const batch = writeBatch(db)

    targetRows.forEach((r) => {
      if (getRowHealth(r) === "pending") {
        const ref = doc(db, COL_NAME, r.id)
        if (r.inspectType === "حالة") {
          batch.set(
            ref,
            {
              conditionStatus: "سليم",
              defectiveCount: 0,
              missingCount: 0,
              inspectDate: today,
              inspector: userName || "مشرف الفحص",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } else {
          const tot = r.totalCount !== "" ? Number(r.totalCount) : 1
          batch.set(
            ref,
            {
              totalCount: tot,
              workingCount: tot,
              defectiveCount: 0,
              missingCount: 0,
              inspectDate: today,
              inspector: userName || "مشرف الفحص",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }
      }
    })
    await batch.commit()
  }

  async function importRestroomRowsBatch(importedItems, userName = "") {
    const today = new Date().toLocaleDateString("ar-EG")
    // Split into chunks of 400 for Firestore batch limit (500)
    for (let i = 0; i < importedItems.length; i += 400) {
      const chunk = importedItems.slice(i, i + 400)
      const batch = writeBatch(db)
      chunk.forEach((item) => {
        const ref = doc(db, COL_NAME, item.id)
        batch.set(
          ref,
          {
            ...item,
            inspectDate: item.inspectDate || today,
            inspector: item.inspector || userName || "مشرف الفحص",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      })
      await batch.commit()
    }
  }

  async function resetAllRestroomInspections() {
    const ids = Object.keys(savedMap).concat(customRows.map((c) => c.id))
    await Promise.all(ids.map((id) => deleteDoc(doc(db, COL_NAME, id))))
    const metaIds = Object.keys(restroomMeta)
    await Promise.all(metaIds.map((id) => deleteDoc(doc(db, META_COL, id))))
    if (notify) notify("delete", "تم تصفير بيانات فحص الحمامات")
  }

  return {
    rows,
    dashboard,
    loading,
    error,
    saveComponentRow,
    toggleRestroomConfirmed,
    markAllRestroomOk,
    importRestroomRowsBatch,
    resetAllRestroomInspections,
  }
}
