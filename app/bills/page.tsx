'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'
import { voidBill } from '@/lib/void-bill'

export default function BillsPage() {
  const { can, showPrice } = useAccess()
  const canVoid = can('void_bill')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [capped, setCapped] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [note, setNote] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchBills('')
  }, [])

  const fetchBills = async (word: string) => {
    const supabase = createClient()
    const q = word.trim().replace(/[,()%_]/g, '')
    let query = supabase.from('bills').select('*, branches(name)').order('created_at', { ascending: false }).limit(40)
    if (q) {
      query = supabase
        .from('bills')
        .select('*, branches(name)')
        .or(`bill_no.ilike.%${q}%,customer_name.ilike.%${q}%,license_plate.ilike.%${q}%,car_info.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(40)
    }
    const { data, error } = await query
    const rows = data || []
    setBills(rows)
    setCapped(!!q && rows.length >= 40)
    setNote(error ? error.message : '')
    setLoading(false)
  }

  const cancel = async (bill: any) => {
    if (bill.voided_at) return
    const reason = window.prompt('เหตุผลที่ยกเลิกบิลนี้')
    if (reason == null) return
    if (!reason.trim()) { setNote('ใส่เหตุผลก่อนยกเลิก'); return }
    setBusyId(bill.id)
    const result = await voidBill(bill, reason)
    setBusyId('')
    setNote(result.error || (result.restored ? 'ยกเลิกบิลแล้ว และคืนสต็อก' : 'ยกเลิกบิลแล้ว บิลนี้ไม่นับในยอดขาย'))
    if (!result.error) fetchBills(search)
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-2">ประวัติบิล</h1>
      <p className="text-sm text-gray-400 mb-4">เปิดใบจริงเพื่อพิมพ์ซ้ำหรือแก้ บิลที่ยกเลิกยังอยู่ในประวัติ แต่ไม่นับยอดขาย</p>

      <input
        type="text"
        placeholder="เลขที่บิล เช่น 69-031 หรือป้าย หรือชื่อลูกค้า"
        value={search}
        onChange={(e) => {
          const value = e.target.value
          setSearch(value)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => fetchBills(value), 250)
        }}
        className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-3 text-white text-lg placeholder-gray-400"
      />
      {capped && <p className="text-amber-300 text-sm mb-4">แสดง 40 ใบแรก พิมพ์เพิ่มอีกตัว</p>}
      {note && <p className="text-amber-200 text-sm mb-4">{note}</p>}

      {bills.length === 0 ? (
        <p className="text-gray-400 text-center py-8">ไม่พบบิล</p>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                <div>
                  <div className="font-semibold">
                    {bill.bill_no}
                    {bill.voided_at && <span className="ml-2 text-xs bg-red-700 text-white rounded-full px-2 py-0.5">ยกเลิก</span>}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {bill.customer_name || '-'} | {bill.license_plate || '-'}
                  </div>
                  <div className="text-sm text-gray-400">{bill.car_info || '-'}</div>
                  <div className="text-xs text-gray-500 mt-1">{bill.branches?.name || '-'}</div>
                  {bill.voided_at && bill.void_reason ? <div className="text-xs text-red-300 mt-1">เหตุผล: {bill.void_reason}</div> : null}
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{showPrice ? `${Number(bill.total || 0).toLocaleString()} บาท` : '—'}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(bill.created_at).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}
                  </div>
                </div>
              </div>

              {bill.items && bill.items.length > 0 && (
                <div className="mt-3 text-sm text-gray-300 border-t border-gray-700 pt-2">
                  {bill.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.name} x {item.qty}</span>
                      <span>{showPrice ? (Number(item.price || 0) * (item.qty || 1)).toLocaleString() : '—'}</span>
                    </div>
                  ))}
                  {bill.items.length > 3 && (
                    <div className="text-xs text-gray-500">+ อีก {bill.items.length - 3} รายการ</div>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/receipt?bill=${bill.id}`} className="text-sm bg-white text-black px-4 py-2 rounded font-medium">เปิดใบจริง</a>
                {canVoid && !bill.voided_at && (
                  <button onClick={() => cancel(bill)} disabled={busyId === bill.id} className="text-sm bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50">
                    {busyId === bill.id ? 'กำลังยกเลิก...' : 'ยกเลิกบิล'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
