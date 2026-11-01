'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PrintQueuePage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [printBill, setPrintBill] = useState<any>(null)

  const PROMPTPAY_ID = '0994102559'

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
    const { data } = await supabase
      .from('bills')
      .select('*, branches(name)')
      .eq('branch_id', selectedBranch)
      .order('created_at', { ascending: false })
      .limit(30)
    setBills(data || [])
    setLoading(false)
  }

  const handlePrint = (bill: any) => {
    setPrintBill(bill)
    setTimeout(() => {
      window.print()
    }, 600)
  }

  const getQrUrl = (total: number) => {
    if (!total || total <= 0) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}`
  }

  const branchName = printBill?.branches?.name || ''
  const headerTitle = branchName ? `รัษฎาแอร์ ${branchName}` : 'รัษฎาแอร์'
  const billDate = printBill
    ? new Date(printBill.created_at).toLocaleDateString('th-TH')
    : ''
  const subtotal = printBill?.items
    ? printBill.items.reduce(
        (sum: number, item: any) => sum + Number(item.price || 0) * (item.qty || 1),
        0
      )
    : 0

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 7mm 8mm; }
          html, body {
            background: white !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          #print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto no-print">
        <h1 className="text-2xl font-bold mb-2">คิวพิมพ์บิล</h1>
        <p className="text-sm text-gray-400 mb-2">
          พนักงานที่สาขาเปิดหน้านี้ เลือกสาขา แล้วกดพิมพ์บิลได้ทันที
        </p>
        <p className="text-xs text-amber-400 mb-6">
          ตอนพิมพ์ ให้ปิด Headers and footers ในหน้าต่างพิมพ์ บิลจะอยู่หน้าเดียวได้ถึงประมาณ 24 รายการ
        </p>

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
                <div className="flex justify-between items-start gap-4">
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
                  <div className="text-right shrink-0">
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
        <div id="print-area" className="max-w-[210mm] mx-auto bg-white text-black px-4 py-3 text-[10px] leading-tight font-sans">
          <div className="flex justify-between items-start">
            <div className="border-2 border-red-600 px-2 py-0.5">
              <div className="text-red-600 font-black text-base tracking-wider leading-none">RATSADA</div>
            </div>
            <div className="text-right text-[9px] leading-snug">
              <div>เลขที่ {printBill.bill_no}</div>
              <div>{billDate}</div>
            </div>
          </div>

          <div className="text-center mt-2 mb-1">
            <h1 className="text-[13px] font-bold leading-tight">{headerTitle}</h1>
            <p className="text-[8px] text-gray-700 mt-0.5">
              201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110
            </p>
            <p className="text-[8px] text-gray-700">
              Tel. 099-4102559 , 076-602429 &nbsp; Email. ratsada_air@hotmail.com
            </p>
          </div>

          <h2 className="text-center font-bold text-[12px] mt-1 mb-2 border-b border-black pb-1">
            ใบเสร็จรับเงิน / Receipt
          </h2>

          <div className="text-[9px] mb-2 leading-snug">
            <div>ลูกค้า: {printBill.customer_name || '-'} &nbsp;|&nbsp; โทร: {printBill.phone || '-'}</div>
            <div>
              รถ: {printBill.car_info || '-'} &nbsp;|&nbsp; ทะเบียน: {printBill.license_plate || '-'} &nbsp;|&nbsp; ไมล์: {printBill.mileage || '-'}
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-left font-semibold">รายการ</th>
                <th className="border border-black px-1 py-0.5 w-12 text-center font-semibold">จำนวน</th>
                <th className="border border-black px-1 py-0.5 w-16 text-right font-semibold">ราคา</th>
                <th className="border border-black px-1 py-0.5 w-16 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {(printBill.items || []).map((item: any, i: number) => (
                <tr key={i}>
                  <td className="border border-black px-1 py-px">{item.name}</td>
                  <td className="border border-black px-1 py-px text-center">{item.qty}</td>
                  <td className="border border-black px-1 py-px text-right">{Number(item.price || 0).toLocaleString()}</td>
                  <td className="border border-black px-1 py-px text-right">
                    {(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-2">
            <div>
              {Number(printBill.total) > 0 && (
                <div className="text-center">
                  <p className="text-[8px] mb-0.5 text-gray-700">สแกนจ่าย PromptPay</p>
                  <img
                    src={getQrUrl(Number(printBill.total))}
                    alt="QR PromptPay"
                    className="border mx-auto"
                    width={72}
                    height={72}
                  />
                  <p className="text-[8px] mt-0.5">{Number(printBill.total).toLocaleString()} บาท</p>
                </div>
              )}
            </div>
            <div className="text-right text-[11px] leading-snug">
              <div>ยอดรวม: {subtotal.toLocaleString()} บาท</div>
              {Number(printBill.discount || 0) > 0 && (
                <div>ส่วนลด: {Number(printBill.discount).toLocaleString()} บาท</div>
              )}
              <div className="font-bold text-[12px] mt-0.5">
                รวมทั้งสิ้น: {Number(printBill.total || 0).toLocaleString()} บาท
              </div>
            </div>
          </div>

          {printBill.note ? (
            <div className="mt-1.5 text-[9px]">หมายเหตุ: {printBill.note}</div>
          ) : null}

          <div className="flex justify-between text-[9px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-24 mx-auto mb-1 h-6"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3 pt-4">
              ช่างซ่อม<br />{billDate}
            </div>
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
