import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, where, runTransaction, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { canUser, hasPrivilege } from '../constants/permissions.js'
import { REFERENCE_PLANS } from './templates.js'
import { occurrenceId, validateExecution, todayCairo } from './model.js'

export function useOperations(user, start, end) {
  const [overrides, setOverrides] = useState([]), [records, setRecords] = useState({})
  const [error, setError] = useState(''), [plansReady, setPlansReady] = useState(false), [recordsReady, setRecordsReady] = useState(false)
  useEffect(() => {
    setPlansReady(false); setOverrides([]); setError('')
    if (!user?.approved || !canUser(user, 'operations', 'view')) return
    return onSnapshot(collection(db, 'operations_plans'), snap => { setOverrides(snap.docs.map(d => ({ ...d.data(), id: d.id }))); setPlansReady(true) }, err => { setError(err.message); setPlansReady(false) })
  }, [user?.uid, user?.approved, user?.permissions])
  useEffect(() => {
    setRecordsReady(false); setRecords({})
    if (!user?.approved || !canUser(user, 'operations', 'view')) return
    return onSnapshot(query(collection(db, 'operations_execution'), where('date', '>=', start), where('date', '<=', end)), snap => { setRecords(Object.fromEntries(snap.docs.map(d => [d.id, d.data()]))); setRecordsReady(true) }, err => { setError(err.message); setRecordsReady(false) })
  }, [user?.uid, user?.approved, user?.permissions, start, end])
  const plans = useMemo(() => {
    const map = new Map(REFERENCE_PLANS.map(p => [p.id, p]))
    overrides.forEach(p => map.set(p.id, { ...map.get(p.id), ...p }))
    return [...map.values()]
  }, [overrides])
  const actor = { uid: user.uid, name: user.displayName || user.email }
  const manager = canUser(user, 'operations', 'edit') && hasPrivilege(user, 'canManageLocations')
  async function savePlan(plan) {
    if (!manager) throw new Error('تعديل الخطة يتطلب صلاحية إدارة الخطط')
    await runTransaction(db, async tx => {
      const ref = doc(db, 'operations_plans', plan.id), old = await tx.get(ref)
      if (old.exists()) throw new Error('الخطة مفعلة بالفعل؛ أنشئ بندًا جديدًا للتعديلات المستقبلية')
      tx.set(ref, { ...plan, enabled: true, review: '', start: todayCairo(), updatedBy: actor, updatedAt: serverTimestamp() })
    })
  }
  async function saveExecution(row, data) {
    const reviewer = canUser(user, 'operations', 'edit') && hasPrivilege(user, 'canEditAll')
    data = { ...data, quality: reviewer ? data.quality : 'unreviewed' }
    validateExecution(data)
    if (row.date > todayCairo()) throw new Error('لا يمكن تسجيل تنفيذ ليوم مستقبلي')
    const id = occurrenceId(row.planId, row.date)
    await runTransaction(db, async tx => {
      const ref = doc(db, 'operations_execution', id), snap = await tx.get(ref), old = snap.exists() ? snap.data() : null
      if ((old?.revision || 0) !== (row.revision || 0)) throw new Error('عدّل مستخدم آخر هذا البند؛ أغلق النافذة وأعد فتحه')
      if (!canUser(user, 'operations', old ? 'status' : 'add')) throw new Error('ليس لديك صلاحية تسجيل التنفيذ')
      if (old && old.createdBy?.uid !== user.uid && !hasPrivilege(user, 'canEditAll')) throw new Error('تعديل تسجيل مستخدم آخر يتطلب صلاحية إضافية')
      const plan = plans.find(p => p.id === row.planId)
      const now = new Date().toISOString()
      tx.set(ref, { ...data, date: row.date, planId: row.planId, plan: old?.plan || plan, revision: (old?.revision || 0) + 1,
        createdBy: old?.createdBy || actor, updatedBy: actor, updatedAt: serverTimestamp(),
        history: [...(old?.history || []), { at: now, actor, status: data.status, quality: data.quality, reason: data.reason, action: data.action, owner: data.owner, actualDate: data.actualDate, followup: data.followup, notes: data.notes, evidence: data.evidence }] })
    })
  }
  async function activatePlans(selected) {
    if (!manager) throw new Error('لا تملك صلاحية إدارة الخطط')
    // Only unchanged, unambiguous reference plans can be activated in a batch.
    const clean = selected.filter(p => !p.enabled && !p.review)
    for (let i = 0; i < clean.length; i += 200) {
      const batch = writeBatch(db)
      clean.slice(i, i + 200).forEach(plan => batch.set(doc(db, 'operations_plans', plan.id), { ...plan, enabled: true, start: todayCairo(), updatedBy: actor, updatedAt: serverTimestamp() }))
      await batch.commit()
    }
  }
  async function retirePlan(plan) {
    if (!manager) throw new Error('لا تملك صلاحية إدارة الخطط')
    await runTransaction(db, async tx => {
      const ref = doc(db, 'operations_plans', plan.id), snap = await tx.get(ref)
      if (!snap.exists()) throw new Error('الخطة غير مفعلة')
      tx.update(ref, { end: todayCairo(), updatedBy: actor, updatedAt: serverTimestamp() })
    })
  }
  return { plans, records, error, loading: !plansReady || !recordsReady, savePlan, saveExecution, activatePlans, retirePlan, manager }
}
