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
      const img = document.querySelector('#print-area img') as HTMLImageElement | null
      let done = false
      const go = () => {
        if (done) return
        done = true
        window.print()
      }
      if (img && !img.complete) {
        img.onload = go
        img.onerror = go
        setTimeout(go, 1500)
      } else {
        setTimeout(go, 250)
      }
    }, 60)
  }

  const getQrUrl = (amount: number) => {
    if (!amount || amount <= 0) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${amount}`)}`
  }

  const branchName = printBill?.branches?.name || ''
  const headerTitle = branchName ? `รัษฎาแอร์ ${branchName}` : 'รัษฎาแอร์'
  const billDate = printBill ? new Date(printBill.created_at).toLocaleDateString('th-TH') : ''
  const rows = Array.isArray(printBill?.items) ? printBill.items : []
  const subtotal = rows.reduce(
    (sum: number, item: any) => sum + Number(item.price || 0) * (item.qty || 1),
    0
  )
  const total = Number(printBill?.total || 0)
  const discount = Number(printBill?.discount || 0)
  const qrUrl = getQrUrl(total)

  return (
    <>
      <style jsx global>{`
        .bill-sheet {
          max-width: 210mm;
          margin: 16px auto;
          background: #fff;
          color: #111;
          padding: 16px 18px 20px;
          font-family: "Leelawadee UI", Tahoma, sans-serif;
          font-size: 12px;
          line-height: 1.35;
        }
        .bill-table {
          width: 100%;
          border-collapse: collapse;
        }
        .bill-table th,
        .bill-table td {
          border: 1px solid #222;
          padding: 4px 6px;
          font-size: 12px;
          vertical-align: middle;
        }
        .bill-table th {
          background: #f3f3f3;
          font-weight: 600;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .bill-sheet {
            max-width: none !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .bill-table th,
          .bill-table td {
            padding: 3px 6px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto no-print">
        <h1 className="text-2xl font-bold mb-2">คิวพิมพ์บิล</h1>
        <p className="text-sm text-gray-400 mb-6">
          เลือกสาขา แล้วกดพิมพ์ บิลจะออกเหมือนต้นฉบับที่ผู้จัดการทำให้ทุกอย่าง
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
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
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
        <div id="print-area" className="bill-sheet">
          <div className="flex justify-between items-start">
            <div className="border-2 border-red-600 px-2.5 py-1">
              <div className="text-red-600 font-black text-lg tracking-wider leading-none">RATSADA</div>
            </div>
            <div className="text-right text-[11px] leading-snug">
              <div>เลขที่ {printBill.bill_no}</div>
              <div>{billDate}</div>
            </div>
          </div>

          <div className="text-center mt-3 mb-1">
            <h1 className="text-[15px] font-bold leading-tight">{headerTitle}</h1>
            <p className="text-[9px] text-gray-700 mt-1">
              201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110
            </p>
            <p className="text-[9px] text-gray-700">
              Tel. 099-4102559 , 076-602429 &nbsp; Email. ratsada_air@hotmail.com
            </p>
          </div>

          <h2 className="text-center font-bold text-[13px] mt-2 mb-3 border-b border-black pb-1">
            ใบเสร็จรับเงิน / Receipt
          </h2>

          <div className="text-[11px] mb-2 leading-snug">
            <div>
              ลูกค้า: {printBill.customer_name || '-'} &nbsp;|&nbsp; โทร: {printBill.phone || '-'}
            </div>
            <div>
              รถ: {printBill.car_info || '-'} &nbsp;|&nbsp; ทะเบียน: {printBill.license_plate || '-'} &nbsp;|&nbsp; ไมล์:{' '}
              {printBill.mileage || '-'}
            </div>
          </div>

          <table className="bill-table">
            <thead>
              <tr>
                <th className="text-left">รายการ</th>
                <th className="w-14 text-center">จำนวน</th>
                <th className="w-20 text-right">ราคา</th>
                <th className="w-20 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td className="text-center">{item.qty}</td>
                  <td className="text-right">{Number(item.price || 0).toLocaleString()}</td>
                  <td className="text-right">
                    {(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-3">
            <div>
              {total > 0 && qrUrl && (
                <div className="text-center">
                  <p className="text-[9px] mb-1 text-gray-600">สแกนจ่าย PromptPay</p>
                  <img src={qrUrl} alt="QR PromptPay" className="border mx-auto" width={80} height={80} />
                  <p className="text-[9px] mt-0.5">{total.toLocaleString()} บาท</p>
                </div>
              )}
            </div>
            <div className="text-right text-[12px] leading-snug">
              <div>ยอดรวม: {subtotal.toLocaleString()} บาท</div>
              <div>ส่วนลด: {discount.toLocaleString()} บาท</div>
              <div className="font-bold text-[13px] mt-1">รวมทั้งสิ้น: {total.toLocaleString()} บาท</div>
            </div>
          </div>

          {printBill.note ? <div className="mt-2 text-[11px]">หมายเหตุ: {printBill.note}</div> : null}

          <div className="flex justify-between text-[10px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3 pt-5">
              ช่างซ่อม
              <br />
              {billDate}
            </div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ผู้รับเงิน
            </div>
          </div>
        </div>
      )}
    </>
  )
}
