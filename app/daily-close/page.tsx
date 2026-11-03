'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DailyClosePage() {
  const [date, setDate] = useState('')
  const [dateLabel, setDateLabel] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const now = new Date()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    setDate(`${now.getFullYear()}-${m}-${d}`)
    setDateLabel(now.toLocaleDateString('th-TH'))

    const supabase = createClient()
    supabase.from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
  }, [])

  const onChangeDate = (value: string) => {
    setDate(value)
    const [y, m, d] = value.split('-').map(Number)
    if (y && m && d) setDateLabel(new Date(y, m - 1, d).toLocaleDateString('th-TH'))
  }

  const load = async () => {
    if (!date) return
    setLoading(true)
    const supabase = createClient()
    const start = new Date(`${date}T00:00:00`)
    const end = new Date(`${date}T23:59:59`)

    let billQuery = supabase
      .from('bills')
      .select('*, branches(name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
    if (branchId) billQuery = billQuery.eq('branch_id', branchId)

    let jobQuery = supabase
      .from('jobs')
      .select('id, status, symptom, vehicles(license_plate), branches(name)')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30)
    if (branchId) jobQuery = jobQuery.eq('branch_id', branchId)

    const [billRes, jobRes] = await Promise.all([billQuery, jobQuery])
    setBills(billRes.data || [])
    setPending(jobRes.data || [])

    const partRes = await supabase
      .from('parts_services')
      .select('name, stock, min_stock')
      .order('stock', { ascending: true })
      .limit(40)

    const rows = partRes.error ? [] : partRes.data || []
    const lows = rows.filter((p: any) => Number(p.stock || 0) <= Number(p.min_stock ?? 0)).slice(0, 12)
    setLowStock(lows)
    setLoaded(true)
    setLoading(false)
  }

  const gross = bills.reduce((sum, b) => sum + Number(b.total || 0) + Number(b.discount || 0), 0)
  const discount = bills.reduce((sum, b) => sum + Number(b.discount || 0), 0)
  const net = bills.reduce((sum, b) => sum + Number(b.total || 0), 0)

  const byBranch = branches
    .map((b) => {
      const list = bills.filter((bill) => bill.branch_id === b.id)
      return {
        name: b.name,
        count: list.length,
        total: list.reduce((sum, bill) => sum + Number(bill.total || 0), 0),
      }
    })
    .filter((b) => !branchId || b.name === branches.find((x) => x.id === branchId)?.name)

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet, .sheet * { color: #111 !important; background: #fff !important; }
        }
      `}</style>

      <div className="sheet p-4 sm:p-6 max-w-4xl mx-auto pb-24">
        <div className="no-print flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">วันที่</label>
            <input type="date" value={date} onChange={(e) => onChangeDate(e.target.value)} className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">สาขา</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white">
              <option value="">ทุกสาขา</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading || !date} className="bg-blue-600 text-white px-5 py-3 rounded disabled:opacity-50">
            {loading ? 'กำลังโหลด...' : 'ดูยอด'}
          </button>
          <button onClick={() => window.print()} className="bg-gray-700 text-white px-5 py-3 rounded">พิมพ์สรุป</button>
        </div>

        <h1 className="text-2xl font-bold">ปิดยอดประจำวัน</h1>
        <p className="text-sm text-gray-400 mb-5">
          {dateLabel || '-'}
          {branchId ? ` — ${branches.find((b) => b.id === branchId)?.name}` : ' — ทุกสาขา'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="border border-gray-700 rounded-lg p-4"><div className="text-2xl font-bold">{bills.length}</div><div className="text-xs text-gray-400">จำนวนบิล</div></div>
          <div className="border border-gray-700 rounded-lg p-4"><div className="text-2xl font-bold">{gross.toLocaleString()}</div><div className="text-xs text-gray-400">ยอดก่อนลด</div></div>
          <div className="border border-gray-700 rounded-lg p-4"><div className="text-2xl font-bold">{discount.toLocaleString()}</div><div className="text-xs text-gray-400">ส่วนลด</div></div>
          <div className="border border-gray-700 rounded-lg p-4"><div className="text-xl sm:text-2xl font-bold text-green-400 break-words">{net.toLocaleString()}</div><div className="text-xs text-gray-400">ยอดสุทธิ</div></div>
        </div>

        {!branchId && loaded && (
          <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="py-2">สาขา</th>
                <th className="py-2 text-right">บิล</th>
                <th className="py-2 text-right">ยอดสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {byBranch.map((b) => (
                <tr key={b.name} className="border-b border-gray-800">
                  <td className="py-2">{b.name}</td>
                  <td className="py-2 text-right">{b.count}</td>
                  <td className="py-2 text-right">{b.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <h2 className="font-semibold mb-2">บิลวันนี้</h2>
        {loaded && bills.length === 0 ? <p className="text-gray-400 mb-6">ไม่มีบิลในวันที่เลือก</p> : (
          <div className="space-y-2 mb-6">
            {bills.map((bill) => (
              <div key={bill.id} className="flex flex-col gap-1 sm:flex-row sm:justify-between border border-gray-800 rounded-lg px-3 py-2 text-sm">
                <div>
                  <div>{bill.bill_no} — {bill.customer_name || '-'} | {bill.license_plate || '-'}</div>
                  <div className="text-xs text-gray-400">{bill.branches?.name || '-'}</div>
                </div>
                <div className="font-semibold">{Number(bill.total || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-semibold mb-2">งานที่ยังไม่เสร็จ ({pending.length})</h2>
        <div className="space-y-1 mb-6 text-sm">
          {pending.map((job) => (
            <div key={job.id} className="text-gray-300">{job.vehicles?.license_plate || '-'} — {job.symptom || 'ไม่ระบุอาการ'} ({job.branches?.name || '-'})</div>
          ))}
          {loaded && pending.length === 0 && <p className="text-gray-400">ไม่มีงานค้าง</p>}
        </div>

        <h2 className="font-semibold mb-2">อะไหล่ถึงจุดสั่งซื้อ</h2>
        <div className="space-y-1 text-sm">
          {lowStock.map((p, i) => (
            <div key={i} className="flex justify-between"><span>{p.name}</span><span>เหลือ {p.stock ?? 0}</span></div>
          ))}
          {loaded && lowStock.length === 0 && <p className="text-gray-400">ไม่มีรายการต่ำกว่าจุดสั่งซื้อ</p>}
        </div>
      </div>
    </>
  )
}
