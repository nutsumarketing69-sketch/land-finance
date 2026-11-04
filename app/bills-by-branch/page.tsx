'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'
import SectionBar from '@/app/components/SectionBar'

export default function BillsByBranchPage() {
  const { showPrice } = useAccess()
  const money = (value: number) => (showPrice ? Number(value || 0).toLocaleString() : '—')
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ count: 0, total: 0 })
  const [q, setQ] = useState('')

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  const fetchBills = async () => {
    if (!selectedBranch) return
    setLoading(true)
    const supabase = createClient()

    const word = q.trim().replace(/[,()%_]/g, '')
    let query = supabase
      .from('bills')
      .select('*')
      .eq('branch_id', selectedBranch)
      .order('created_at', { ascending: false })
      .limit(40)
    if (word) {
      query = query.or(`bill_no.ilike.%${word}%,customer_name.ilike.%${word}%,license_plate.ilike.%${word}%`)
    }
    const { data } = await query

    const list = data || []
    setBills(list)

    const total = list.reduce((sum, b) => sum + Number(b.total || 0), 0)
    setSummary({ count: list.length, total })
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <SectionBar desk="lookup" />
      <h1 className="text-2xl font-bold mb-6">บิลแยกตามสาขา</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">เลือกสาขา</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full border border-gray-600 bg-gray-800 p-3 rounded text-white"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchBills}
          disabled={loading || !selectedBranch}
          className="bg-blue-600 text-white px-5 py-3 rounded disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ดูบิล'}
        </button>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ป้าย ชื่อ หรือเลขบิล แล้วกดดูบิล" className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-4 text-white text-lg" />

      {selectedBranch && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
            <div className="text-2xl font-bold">{summary.count}</div>
            <div className="text-sm text-gray-400">จำนวนบิล</div>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
            <div className="text-2xl font-bold">{money(summary.total)}</div>
            <div className="text-sm text-gray-400">ยอดรวม (บาท)</div>
          </div>
        </div>
      )}

      {bills.length === 0 && selectedBranch && !loading ? (
        <p className="text-gray-400">ไม่มีบิลในสาขานี้</p>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div>
                  <div className="font-semibold">{bill.bill_no}</div>
                  <div className="text-sm text-gray-400">
                    {bill.customer_name || '-'} | {bill.license_plate || '-'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{money(Number(bill.total || 0))} บาท</div>
                  <div className="text-xs text-gray-400">
                    {new Date(bill.created_at).toLocaleDateString('th-TH')}
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
