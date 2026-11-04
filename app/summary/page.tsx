'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SectionBar from '@/app/components/SectionBar'

type Bill = {
  id: string
  bill_no: string
  branch_id: string | null
  total: number
  discount: number
  created_at: string
  voided_at: string | null
  license_plate: string | null
  customer_name: string | null
}

function bangkokDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function shiftMonth(day: string, delta: number) {
  const [year, month] = day.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export default function SummaryPage() {
  const today = bangkokDate()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createClient().from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
  }, [])

  const load = async (start = from, end = to, branch = branchId) => {
    setLoading(true)
    setMsg('')
    const supabase = createClient()
    const all: Bill[] = []
    for (let offset = 0; ; offset += 1000) {
      let query = supabase
        .from('bills')
        .select('id, bill_no, branch_id, total, discount, created_at, voided_at, license_plate, customer_name')
        .gte('created_at', `${start}T00:00:00+07:00`)
        .lte('created_at', `${end}T23:59:59.999+07:00`)
        .order('created_at', { ascending: false })
        .range(offset, offset + 999)
      if (branch) query = query.eq('branch_id', branch)
      const res = await query
      if (res.error) {
        setMsg(res.error.message)
        setLoading(false)
        return
      }
      all.push(...((res.data || []) as Bill[]))
      if (!res.data || res.data.length < 1000) break
    }
    setBills(all)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const view = useMemo(() => {
    const live = bills.filter((bill) => !bill.voided_at)
    const net = live.reduce((sum, bill) => sum + Number(bill.total || 0), 0)
    const discount = live.reduce((sum, bill) => sum + Number(bill.discount || 0), 0)
    const byBranch = new Map<string, { count: number; total: number }>()
    const byDay = new Map<string, { count: number; total: number }>()
    live.forEach((bill) => {
      const branch = bill.branch_id || 'none'
      const day = bangkokDate(new Date(bill.created_at))
      const branchRow = byBranch.get(branch) || { count: 0, total: 0 }
      branchRow.count += 1
      branchRow.total += Number(bill.total || 0)
      byBranch.set(branch, branchRow)
      const dayRow = byDay.get(day) || { count: 0, total: 0 }
      dayRow.count += 1
      dayRow.total += Number(bill.total || 0)
      byDay.set(day, dayRow)
    })
    return { live, net, discount, byBranch, byDay, voids: bills.length - live.length }
  }, [bills])

  const branchName = (id: string) => branches.find((item) => item.id === id)?.name || (id === 'none' ? 'ไม่ระบุสาขา' : 'สาขาที่ลบแล้ว')

  const apply = (start: string, end: string) => {
    setFrom(start)
    setTo(end)
    void load(start, end, branchId)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <SectionBar desk="money" />
      <h1 className="text-2xl font-bold">สรุปทุกสาขา</h1>
      <p className="mt-2 text-sm text-gray-300">ดูรวมทุกสาขาหรือแยกสาขา เป็นรายวัน รายเดือน รายปี หรือเลือกช่วงวันที่เอง บิลที่ยกเลิกไม่นับในยอดเงิน</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-gray-800 px-4 py-2" onClick={() => apply(today, today)}>วันนี้</button>
        <button className="rounded-full bg-gray-800 px-4 py-2" onClick={() => apply(today.slice(0, 8) + '01', today)}>เดือนนี้</button>
        <button className="rounded-full bg-gray-800 px-4 py-2" onClick={() => apply(`${today.slice(0, 4)}-01-01`, today)}>ปีนี้</button>
        <button className="rounded-full bg-gray-800 px-4 py-2" onClick={() => apply(shiftMonth(today, -1), today)}>ตั้งแต่ต้นเดือนก่อน</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="text-sm text-gray-300">จากวันที่
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white" />
        </label>
        <label className="text-sm text-gray-300">ถึงวันที่
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white" />
        </label>
        <label className="text-sm text-gray-300">สาขา
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2 text-white">
            <option value="">ทุกสาขารวมกัน</option>
            {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button onClick={() => load()} className="mt-5 rounded bg-red-600 px-4 py-2 font-semibold">{loading ? 'กำลังรวม...' : 'ดูสรุป'}</button>
      </div>
      {msg && <p className="mt-3 text-amber-200">{msg}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-700 p-4"><div className="text-xs text-gray-400">บิลที่นับ</div><div className="text-2xl font-bold">{view.live.length.toLocaleString()}</div></div>
        <div className="rounded-xl border border-gray-700 p-4"><div className="text-xs text-gray-400">ยอดสุทธิ</div><div className="text-2xl font-bold text-green-400">{view.net.toLocaleString()}</div></div>
        <div className="rounded-xl border border-gray-700 p-4"><div className="text-xs text-gray-400">ส่วนลด</div><div className="text-2xl font-bold">{view.discount.toLocaleString()}</div></div>
        <div className="rounded-xl border border-gray-700 p-4"><div className="text-xs text-gray-400">บิลยกเลิก ไม่นับยอด</div><div className="text-2xl font-bold text-red-300">{view.voids.toLocaleString()}</div></div>
      </div>
      <h2 className="mt-6 font-semibold">แยกสาขา</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400"><tr><th className="py-2">สาขา</th><th>จำนวนบิล</th><th>ยอดสุทธิ</th></tr></thead>
          <tbody>
            {[...view.byBranch.entries()].map(([id, row]) => (
              <tr key={id} className="border-t border-gray-800"><td className="py-2">{branchName(id)}</td><td>{row.count}</td><td>{row.total.toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-6 font-semibold">แยกตามวัน</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400"><tr><th className="py-2">วันที่</th><th>จำนวนบิล</th><th>ยอดสุทธิ</th></tr></thead>
          <tbody>
            {[...view.byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, row]) => (
              <tr key={day} className="border-t border-gray-800"><td className="py-2">{day}</td><td>{row.count}</td><td>{row.total.toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-6 font-semibold">บิลในช่วงนี้</h2>
      <div className="mt-2 space-y-2">
        {view.live.slice(0, 40).map((bill) => (
          <a key={bill.id} href={`/receipt?bill=${bill.id}`} className="flex items-center justify-between rounded-xl border border-gray-800 px-3 py-2 text-sm">
            <span>{bill.bill_no} · {bill.license_plate || '-'} · {bill.customer_name || '-'}</span>
            <span>{Number(bill.total || 0).toLocaleString()}</span>
          </a>
        ))}
        {view.live.length > 40 && <p className="text-sm text-gray-400">แสดง 40 บิลล่าสุดจาก {view.live.length} บิล ยอดด้านบนนับครบทุกใบ</p>}
      </div>
    </div>
  )
}
