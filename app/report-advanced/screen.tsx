'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function AdvancedReportPage() {
  const { showPrice } = useAccess()
  const money = (value: number) => (showPrice ? Number(value || 0).toLocaleString() : '—')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState({
    count: 0,
    total: 0,
    byBranch: {} as Record<string, number>,
    items: [] as { name: string; qty: number; total: number }[],
    latest: [] as any[],
  })

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(localDate(firstDay))
    setEndDate(localDate(today))
  }, [])

  const fetchReport = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    const supabase = createClient()
    const rows: any[] = []
    let capped = false
    for (let from = 0; from < 3000; from += 1000) {
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_no, customer_name, license_plate, total, created_at, items, branches(name)')
        .gte('created_at', new Date(`${startDate}T00:00:00`).toISOString())
        .lte('created_at', new Date(`${endDate}T23:59:59`).toISOString())
        .is('voided_at', null)
        .order('created_at', { ascending: false })
        .range(from, from + 999)
      if (error || !data?.length) break
      rows.push(...data)
      if (data.length < 1000) break
      if (rows.length >= 3000) {
        capped = true
        break
      }
    }

    const byBranch: Record<string, number> = {}
    const itemMap: Record<string, { qty: number; total: number }> = {}
    let total = 0
    rows.forEach((bill) => {
      total += Number(bill.total || 0)
      const branch = bill.branches?.name || 'ไม่ระบุสาขา'
      byBranch[branch] = (byBranch[branch] || 0) + Number(bill.total || 0)
      const lines = Array.isArray(bill.items) ? bill.items : []
      lines.forEach((item: any) => {
        const name = String(item?.name || '').trim() || 'ไม่ระบุรายการ'
        if (!itemMap[name]) itemMap[name] = { qty: 0, total: 0 }
        const qty = Number(item?.qty || 1)
        itemMap[name].qty += qty
        itemMap[name].total += Number(item?.price || 0) * qty
      })
    })

    setSummary({
      count: rows.length,
      total,
      byBranch,
      items: Object.entries(itemMap)
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20),
      latest: rows.slice(0, 30),
    })
    setNote(capped ? 'ช่วงนี้มีบิลมากกว่า 3,000 ใบ ยอดนี้เป็นแค่ชุดแรก เลือกช่วงวันที่สั้นลง' : '')
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-2">รายงานขั้นสูง</h1>
      <p className="text-sm text-gray-400 mb-4">สรุปยอดขายจากบิล ตามสาขาและรายการอะไหล่ ไม่รวมบิลที่ยกเลิก</p>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">วันที่เริ่ม</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-600 bg-gray-800 p-3 rounded text-white" />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">วันที่สิ้นสุด</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-600 bg-gray-800 p-3 rounded text-white" />
        </div>
        <button onClick={fetchReport} disabled={loading} className="bg-blue-600 text-white px-5 py-3 rounded disabled:opacity-50">
          {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
        </button>
      </div>

      {note && <p className="text-amber-300 text-sm mb-4">{note}</p>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
          <div className="text-2xl font-bold text-blue-400">{summary.count}</div>
          <div className="text-sm text-gray-400 mt-1">จำนวนบิล</div>
        </div>
        <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
          <div className="text-xl sm:text-2xl font-bold text-green-400 break-words">{money(summary.total)}</div>
          <div className="text-sm text-gray-400 mt-1">ยอดสุทธิ</div>
        </div>
      </div>

      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-4">
        <div className="text-sm font-semibold mb-2">แยกตามสาขา</div>
        {Object.keys(summary.byBranch).length === 0 ? <p className="text-gray-500 text-sm">กดดูรายงาน</p> : (
          Object.entries(summary.byBranch).map(([name, amount]) => (
            <div key={name} className="flex justify-between gap-3 text-sm py-1">
              <span className="break-words">{name}</span>
              <span className="font-medium">{money(amount)}</span>
            </div>
          ))
        )}
      </div>

      <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mb-6">
        <div className="text-sm font-semibold mb-2">รายการที่ขายมากสุด</div>
        {summary.items.length === 0 ? <p className="text-gray-500 text-sm">-</p> : summary.items.map((item) => (
          <div key={item.name} className="flex justify-between gap-3 text-sm py-1">
            <span className="break-words">{item.name} · {item.qty}</span>
            <span className="shrink-0">{money(item.total)}</span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-3">บิลล่าสุดในช่วงนี้</h2>
      {summary.latest.length === 0 ? <p className="text-gray-500">ไม่มีข้อมูลในช่วงเวลานี้</p> : (
        <div className="space-y-2">
          {summary.latest.map((bill) => (
            <a key={bill.id} href={`/history?plate=${encodeURIComponent(bill.license_plate || '')}`} className="block border border-gray-700 rounded p-3 text-sm bg-gray-900">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div className="font-medium break-words">{bill.license_plate || '-'} · {bill.customer_name || '-'}</div>
                <div>{money(Number(bill.total || 0))} บาท</div>
              </div>
              <div className="text-gray-400">{bill.branches?.name || '-'} · {(bill.created_at || '').slice(0, 10)}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
// shown inside the desk without loading a new page
