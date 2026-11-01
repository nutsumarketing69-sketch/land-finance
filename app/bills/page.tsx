'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBill, setSelectedBill] = useState<any>(null)

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

  const printBill = (bill: any) => {
    setSelectedBill(bill)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

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
                    <div className="text-sm text-gray-400">{bill.car_info || '-'}</div>
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
                    {bill.items.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.name} x {item.qty}</span>
                        <span>{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                      </div>
                    ))}
                    {bill.items.length > 3 && (
                      <div className="text-xs text-gray-500">+ อีก {bill.items.length - 3} รายการ</div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSelectedBill(bill)}
                    className="text-xs bg-blue-600 px-3 py-1 rounded"
                  >
                    ดูรายละเอียด
                  </button>
                  <button
                    onClick={() => printBill(bill)}
                    className="text-xs bg-green-600 px-3 py-1 rounded"
                  >
                    พิมพ์
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* พื้นที่พิมพ์ */}
      {selectedBill && (
        <div id="print-area" className="hidden print:block max-w-[210mm] mx-auto bg-white text-black p-4 text-[10px]">
          <div className="flex justify-between mb-2">
            <div className="border-2 border-red-600 px-2 py-1">
              <div className="text-red-600 font-bold text-base">RATSADA</div>
            </div>
            <div>เลขที่ {selectedBill.bill_no}</div>
          </div>
          <div className="text-center mb-2">
            <h1 className="text-sm font-bold">รัษฎาแอร์ สนามบิน</h1>
          </div>
          <h2 className="text-base font-bold text-center mb-3">ใบเสร็จรับเงิน/Receipt</h2>
          <div className="text-right mb-2">{new Date(selectedBill.created_at).toLocaleDateString('th-TH')}</div>
          <div className="mb-2 text-[9px]">
            <div>ลูกค้า: {selectedBill.customer_name || '-'}</div>
            <div>รถ: {selectedBill.car_info || '-'} | ทะเบียน: {selectedBill.license_plate || '-'}</div>
          </div>
          <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">รายการ</th>
                <th className="border border-black p-1 w-12">จำนวน</th>
                <th className="border border-black p-1 w-16">ราคา</th>
                <th className="border border-black p-1 w-16">รวม</th>
              </tr>
            </thead>
            <tbody>
              {selectedBill.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="border border-black p-1">{item.name}</td>
                  <td className="border border-black p-1 text-center">{item.qty}</td>
                  <td className="border border-black p-1 text-right">{Number(item.price).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">{(Number(item.price) * item.qty).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="border border-black p-1 text-right">รวมทั้งสิ้น</td>
                <td className="border border-black p-1 text-right">{Number(selectedBill.total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
