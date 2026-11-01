'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PrintQueuePage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [printBill, setPrintBill] = useState<any>(null)

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

    // ดึงบิลของสาขานี้ที่ยังไม่พิมพ์ (หรือทั้งหมดล่าสุด)
    const { data } = await supabase
      .from('bills')
      .select('*, branches(name)')
      .eq('branch_id', selectedBranch)
      .order('created_at', { ascending: false })
      .limit(20)

    setBills(data || [])
    setLoading(false)
  }

  const handlePrint = (bill: any) => {
    setPrintBill(bill)
    setTimeout(() => {
      window.print()
      setPrintBill(null)
    }, 500)
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">คิวพิมพ์บิล</h1>
        <p className="text-sm text-gray-400 mb-6">พนักงานที่สาขาเปิดหน้านี้เพื่อพิมพ์บิลที่ผู้จัดการออกให้</p>

        <div className="flex gap-3 mb-6 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">เลือกสาขา</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border border-gray-600 bg-gray-800 p-2 rounded text-white"
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
            className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'กำลังโหลด...' : 'โหลดบิล'}
          </button>
        </div>

        {bills.length === 0 && selectedBranch && !loading ? (
          <p className="text-gray-400">ไม่มีบิลในสาขานี้</p>
        ) : (
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{bill.bill_no}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {bill.customer_name || '-'} | {bill.license_plate || '-'}
                    </div>
                    <div className="text-sm text-gray-400">{bill.car_info || '-'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(bill.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{Number(bill.total || 0).toLocaleString()} บาท</div>
                    <button
                      onClick={() => handlePrint(bill)}
                      className="mt-2 bg-green-600 text-white text-sm px-4 py-1.5 rounded"
                    >
                      พิมพ์บิล
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {printBill && (
        <div id="print-area" className="hidden print:block max-w-[210mm] mx-auto bg-white text-black p-5 text-[11px]">
          <div className="flex justify-between items-start mb-4">
            <div className="border-2 border-red-600 px-3 py-1">
              <div className="text-red-600 font-black text-lg">RATSADA</div>
            </div>
            <div className="text-right text-[10px]">
              <div>เลขที่ {printBill.bill_no}</div>
              <div>{new Date(printBill.created_at).toLocaleDateString('th-TH')}</div>
            </div>
          </div>

          <div className="text-center mb-3">
            <h1 className="text-base font-bold">รัษฎาแอร์ {printBill.branches?.name || ''}</h1>
            <p className="text-[8px]">Tel. 099-4102559 , 076-602429</p>
          </div>

          <h2 className="text-center font-bold text-sm mb-4 border-b border-black pb-1">ใบเสร็จรับเงิน / Receipt</h2>

          <div className="text-[10px] mb-3">
            <div>ลูกค้า: {printBill.customer_name || '-'} | โทร: {printBill.phone || '-'}</div>
            <div>รถ: {printBill.car_info || '-'} | ทะเบียน: {printBill.license_plate || '-'}</div>
          </div>

          <table className="w-full border-collapse border border-black text-[10px] mb-3">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">รายการ</th>
                <th className="border border-black p-1 w-14 text-center">จำนวน</th>
                <th className="border border-black p-1 w-20 text-right">ราคา</th>
                <th className="border border-black p-1 w-20 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {printBill.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="border border-black p-1">{item.name}</td>
                  <td className="border border-black p-1 text-center">{item.qty}</td>
                  <td className="border border-black p-1 text-right">{Number(item.price).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">{(Number(item.price) * item.qty).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="border border-black p-1 text-right">รวมทั้งสิ้น</td>
                <td className="border border-black p-1 text-right">{Number(printBill.total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between text-[9px] mt-10">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-24 mx-auto mb-1 h-6"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3">ช่างซ่อม</div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-24 mx-auto mb-1 h-6"></div>
              ผู้รับเงิน
            </div>
          </div>
        </div>
      )}
    </>
  )
}
