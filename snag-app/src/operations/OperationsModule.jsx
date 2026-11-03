import React, { useEffect, useState } from 'react'
import { useOperations } from './useOperations.js'
import { todayCairo, periodRange } from './model.js'
import { OperationsPanel } from './OperationsPanel.jsx'

export default function OperationsModule({ currentUser }) {
  const [today, setToday] = useState(todayCairo())
  const [mode, setMode] = useState('today'), [period, setPeriod] = useState('week'), [anchor, setAnchor] = useState(today)
  useEffect(() => { const timer = setInterval(() => setToday(todayCairo()), 30000); return () => clearInterval(timer) }, [])
  const [start, end] = periodRange(mode === 'reports' ? anchor : today, mode === 'reports' ? period : 'day')
  const store = useOperations(currentUser, start, end)
  return <OperationsPanel {...{ currentUser, today, mode, setMode, period, setPeriod, anchor, setAnchor, start, end, store }} />
}

