'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'
import { voidBill } from '@/lib/void-bill'

export default function BillsPage() {
  const { can, showPrice } = useAccess()
  const canVoid = can('void_bill')
  const [bills, setBills] = useState<any[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [branch, setBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [capped, setCapped] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [note, setNote] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBills = async (word: string, branchId = branch) => {
    setLoading(true)
    const supabase = createClient()
    const q = word.trim().replace(/[,()%_]/g, '')
    let query = supabase.from('bills').select('*, branches(name)').order('created_at', { ascending: false }).limit(40)
    if (branchId) query = query.eq('branch_id', branchId)
    if (q) query = query.or(`bill_no.ilike.%${q}%,customer_name.ilike.%${q}%,license_plate.ilike.%${q}%,car_info.ilike.%${q}%`)
    const { data, error } = await query
    const rows = data || []
    setBills(rows)
    setCapped(rows.length >= 40)
    setNote(error ? error.message : '')
    setLoading(false)
  }

  useEffect(() => {
    createClient().from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
    void fetchBills('')
  }, [])

  const pickBranch = (id: string) => {
    setBranch(id)
    void fetchBills(search, id)
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
    if (!result.error) void fetchBills(search, branch)
  }

  const live = bills.filter((bill) => !bill.voided_at)
  const total = live.reduce((sum, bill) => sum + Number(bill.total || 0), 0)
  const branchName = branches.find((item) => item.id === branch)?.name || 'ทุกสาขา'

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-2">ประวัติบิล</h1>
      <p className="text-sm text-gray-400 mb-4">เลือกสาขาแล้วรายการด้านล่างเปลี่ยนทันที เปิดใบจริงเพื่อพิมพ์ซ้ำหรือแก้ และดูรายการในบิลได้จากใบนี้</p>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => pickBranch('')} className={`shrink-0 rounded-full px-4 py-2 text-sm ${branch === '' ? 'bg-red-600 font-semibold text-white' : 'border border-gray-600 text-gray-100'}`}>ทุกสาขา</button>
        {branches.map((item) => (
          <button key={item.id} type="button" onClick={() => pickBranch(item.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${branch === item.id ? 'bg-red-600 font-semibold text-white' : 'border border-gray-600 text-gray-100'}`}>{item.name}</button>
        ))}
      </div>

      <input
        type="text"
        placeholder="เลขที่บิล เช่น 69-031 หรือป้าย หรือชื่อลูกค้า"
        value={search}
        onChange={(e) => {
          const value = e.target.value
          setSearch(value)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => fetchBills(value, branch), 250)
        }}
        className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-3 text-white text-lg placeholder-gray-400"
      />
      <p className="mb-4 text-sm text-gray-300">
        {branchName} · {loading ? 'กำลังโหลด...' : `${bills.length} บิลที่แสดง`}
        {showPrice ? ` · ยอดที่ยังไม่ยกเลิก ${total.toLocaleString()} บาท` : ''}
      </p>
      {capped && <p className="text-amber-300 text-sm mb-4">แสดง 40 ใบแรก พิมพ์เพิ่มอีกตัวเพื่อให้แคบลง</p>}
      {note && <p className="text-amber-200 text-sm mb-4">{note}</p>}

      {!loading && bills.length === 0 ? (
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
                  {bill.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between gap-3">
                      <span className="break-words">{item.name} x {item.qty}</span>
                      <span className="shrink-0">{showPrice ? (Number(item.price || 0) * (item.qty || 1)).toLocaleString() : '—'}</span>
                    </div>
                  ))}
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
// bill history and the branch filter now live on this one page
// shown inside the desk without loading a new page
