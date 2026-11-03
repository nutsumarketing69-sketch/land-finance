'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SalesPage() {
  const [date, setDate] = useState('')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ count: 0, total: 0 })

  useEffect(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setDate(today)
    fetchSales(today)
  }, [])

  const fetchSales = async (value = date) => {
    if (!value) return
    setLoading(true)
    const supabase = createClient()

    const start = new Date(value + 'T00:00:00')
    const end = new Date(value + 'T23:59:59')

    const { data } = await supabase
      .from('bills')
      .select('*, branches(name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const list = data || []
    setBills(list)

    const total = list.reduce((sum, b) => sum + Number(b.total || 0), 0)
    setSummary({ count: list.length, total })
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">สรุปยอดขายรายวัน</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-end">
        <div>
          <label className="block text-sm text-gray-400 mb-1">เลือกวันที่</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-600 bg-gray-800 p-3 rounded text-white"
          />
        </div>
        <button
          onClick={() => fetchSales()}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-3 rounded disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ดูสรุป'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold">{summary.count}</div>
          <div className="text-sm text-gray-400">จำนวนบิล</div>
        </div>
        <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
          <div className="text-xl sm:text-3xl font-bold text-green-400 break-words">{summary.total.toLocaleString()}</div>
          <div className="text-sm text-gray-400">ยอดรวม (บาท)</div>
        </div>
      </div>

      {bills.length === 0 && !loading ? (
        <p className="text-gray-400">ไม่มีบิลในวันที่เลือก</p>
      ) : (
        <div className="space-y-2">
          {bills.map((bill) => (
            <div key={bill.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div>
                  <div className="font-medium">{bill.bill_no}</div>
                  <div className="text-gray-400">{bill.customer_name || '-'} | {bill.license_plate || '-'}</div>
                  <div className="text-gray-400 text-xs">{bill.branches?.name || '-'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{Number(bill.total || 0).toLocaleString()} บาท</div>
                  <div className="text-xs text-gray-400">
                    {new Date(bill.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
