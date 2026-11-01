'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setBills(data || [])
    setLoading(false)
  }

  const filtered = bills.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.bill_no?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.license_plate?.toLowerCase().includes(q) ||
      b.car_info?.toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ประวัติบิล</h1>

      <input
        type="text"
        placeholder="ค้นหา เลขที่บิล, ชื่อลูกค้า, ป้ายทะเบียน..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-6 text-white placeholder-gray-400"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-8">ไม่พบบิล</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((bill) => (
            <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{bill.bill_no}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {bill.customer_name || '-'} | {bill.license_plate || '-'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {bill.car_info || '-'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{Number(bill.total || 0).toLocaleString()} บาท</div>
                  <div className="text-xs text-gray-400">
                    {new Date(bill.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>

              {bill.items && bill.items.length > 0 && (
                <div className="mt-3 text-sm text-gray-300 border-t border-gray-700 pt-2">
                  {bill.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.name} x {item.qty}</span>
                      <span>{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                    </div>
                  ))}
                  {bill.discount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>ส่วนลด</span>
                      <span>-{Number(bill.discount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {bill.note && (
                <div className="mt-2 text-xs text-gray-500">หมายเหตุ: {bill.note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
