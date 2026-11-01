'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [printBill, setPrintBill] = useState<any>(null)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('bills')
      .select('*, branches(name)')
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

  const handlePrint = (bill: any) => {
    setPrintBill(bill)
    setTimeout(() => {
      window.print()
      setPrintBill(null)
    }, 500)
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

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
                    <div className="text-xs text-gray-500 mt-1">{bill.branches?.name || '-'}</div>
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

                <div className="mt-3">
                  <button
                    onClick={() => handlePrint(bill)}
                    className="text-xs bg-blue-600 px-3 py-1 rounded"
                  >
                    พิมพ์บิล
                  </button>
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
