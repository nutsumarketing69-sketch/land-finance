'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [printBill, setPrintBill] = useState<any>(null)
  const [capped, setCapped] = useState(false)
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
    const { data } = await query
    const rows = data || []
    setBills(rows)
    setCapped(!!q && rows.length >= 40)
    setLoading(false)
  }

  const filtered = bills

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

      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
        <h1 className="text-2xl font-bold mb-2">ประวัติบิล</h1>
        <p className="text-sm text-gray-400 mb-4">พิมพ์ป้าย ชื่อ หรือเลขบิล แม้แค่ตัวเดียว</p>

        <input
          type="text"
          placeholder="เช่น 1 หรือ ก หรือ ชื่อลูกค้า"
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

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">ไม่พบบิล</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((bill) => (
              <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
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
                    className="text-sm bg-blue-600 px-4 py-2 rounded"
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
