'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'
import SectionBar from '@/app/components/SectionBar'

function localDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function ReportPage() {
  const { showPrice } = useAccess()
  const money = (value: number) => (showPrice ? Number(value || 0).toLocaleString() : '—')
  const [date, setDate] = useState('')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const today = localDate()
    setDate(today)
    fetchReport(today)
  }, [])

  const fetchReport = async (value = date) => {
    if (!value) return
    setLoading(true)
    const supabase = createClient()
    const start = new Date(`${value}T00:00:00`)
    const end = new Date(`${value}T23:59:59`)
    const { data, error } = await supabase
      .from('bills')
      .select('id, bill_no, customer_name, license_plate, car_info, total, created_at, branches(name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .is('voided_at', null)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!error) setBills(data || [])
    setLoaded(true)
    setLoading(false)
  }

  const total = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0)
  const byBranch: Record<string, number> = {}
  bills.forEach((bill) => {
    const name = bill.branches?.name || 'ไม่ระบุสาขา'
    byBranch[name] = (byBranch[name] || 0) + Number(bill.total || 0)
  })

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <SectionBar desk="money" />
      <h1 className="text-2xl font-bold mb-2">รายงานประจำวัน</h1>
      <p className="text-sm text-gray-400 mb-4">ยอดจากบิลที่บันทึกในวันที่เลือก ไม่รวมบิลที่ยกเลิก</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-600 bg-gray-800 p-3 rounded text-white"
        />
        <button
          onClick={() => fetchReport()}
          disabled={loading || !date}
          className="bg-blue-600 text-white px-4 py-3 rounded"
        >
          {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 border border-gray-700 rounded text-center bg-gray-900">
          <div className="text-2xl font-bold">{bills.length}</div>
          <div className="text-sm text-gray-400">จำนวนบิล</div>
        </div>
        <div className="p-4 border border-gray-700 rounded text-center bg-gray-900">
          <div className="text-xl sm:text-2xl font-bold text-green-400 break-words">{money(total)}</div>
          <div className="text-sm text-gray-400">ยอดสุทธิ</div>
        </div>
      </div>

      {Object.keys(byBranch).length > 0 && (
        <div className="border border-gray-700 rounded p-4 mb-4 bg-gray-900">
          {Object.entries(byBranch).map(([name, amount]) => (
            <div key={name} className="flex justify-between gap-3 text-sm py-1">
              <span className="break-words">{name}</span>
              <span>{money(amount)}</span>
            </div>
          ))}
        </div>
      )}

      {loaded && bills.length === 0 ? (
        <p className="text-gray-500">ไม่มีบิลในวันนี้</p>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <a key={bill.id} href={`/history?plate=${encodeURIComponent(bill.license_plate || '')}`} className="block border border-gray-700 rounded p-4 bg-gray-900">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div className="font-medium break-words">{bill.license_plate || '-'} · {bill.customer_name || '-'}</div>
                <div className="font-semibold">{money(Number(bill.total || 0))} บาท</div>
              </div>
              <div className="text-sm text-gray-400 break-words">{bill.car_info || ''}</div>
              <div className="text-sm text-gray-400">{bill.branches?.name || '-'} · {bill.bill_no}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
