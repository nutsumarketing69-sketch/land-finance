'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BranchPrinterPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [bill, setBill] = useState<any>(null)
  const [status, setStatus] = useState('กำลังเตรียม...')
  const [lastBill, setLastBill] = useState('')
  const printingRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('printer_branch_id') || ''
    if (saved) setBranchId(saved)
    const supabase = createClient()
    supabase.from('branches').select('*').order('name').then(({ data }) => {
      setBranches(data || [])
    })
  }, [])

  useEffect(() => {
    if (!branchId) return
    localStorage.setItem('printer_branch_id', branchId)
    const supabase = createClient()
    supabase.from('print_jobs').update({ status: 'pending' }).eq('branch_id', branchId).eq('status', 'printing')

    const tick = async () => {
      if (printingRef.current) return
      const hb = createClient()
      await hb.from('printer_heartbeats').upsert(
        { branch_id: branchId, last_seen: new Date().toISOString() },
        { onConflict: 'branch_id' }
      )
      await pullJob()
    }

    tick()
    const timer = setInterval(tick, 3000)
    return () => clearInterval(timer)
  }, [branchId])

  const pullJob = async () => {
    if (!branchId || printingRef.current) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      setStatus('ยังเชื่อมคิวพิมพ์ไม่ได้ ตรวจว่าสร้างตารางแล้ว')
      return
    }
    if (!data || data.length === 0) {
      setStatus('พร้อมรับงาน พักหน้านี้ไว้ได้เลย')
      return
    }

    const job = data[0]
    const { data: locked } = await supabase
      .from('print_jobs')
      .update({ status: 'printing' })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select()

    if (!locked || locked.length === 0) return
    await printPayload(job.payload, job.id)
  }

  const waitForImage = () =>
    new Promise<void>((resolve) => {
      const done = () => resolve()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const img = document.querySelector('#print-area img') as HTMLImageElement | null
          if (!img || img.complete) {
            done()
            return
          }
          img.onload = done
          img.onerror = done
          setTimeout(done, 1500)
        })
      })
    })

  const printPayload = async (payload: any, jobId?: string) => {
    printingRef.current = true
    setStatus('กำลังพิมพ์...')
    setBill(payload)
    await waitForImage()
    window.print()

    if (jobId) {
      const supabase = createClient()
      await supabase
        .from('print_jobs')
        .update({ status: 'printed', printed_at: new Date().toISOString() })
        .eq('id', jobId)
      setLastBill(payload?.bill_no || '')
    }

    setBill(null)
    printingRef.current = false
    setStatus('พร้อมรับงาน พักหน้านี้ไว้ได้เลย')
  }

  const branchName = branches.find((b) => b.id === branchId)?.name || ''
  const rows = Array.isArray(bill?.items) ? bill.items : []
  const total = Number(bill?.total || 0)
  const qrUrl =
    total > 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/0994102559/${total}`)}`
      : ''

  const testPrint = () => {
    printPayload({
      bill_no: 'TEST',
      date: new Date().toLocaleDateString('th-TH'),
      headerTitle: branchName ? `รัษฎาแอร์ ${branchName}` : 'รัษฎาแอร์',
      customer: 'ทดสอบระบบ',
      phone: '-',
      plate: '-',
      car: '-',
      mileage: '-',
      items: [{ name: 'ทดสอบเครื่องพิมพ์สาขา', qty: 1, price: 0 }],
      discount: 0,
      subtotal: 0,
      total: 0,
      note: 'ถ้ากระดาษนี้ออก แสดงว่าสาขานี้พร้อมรับบิลจากผู้จัดการ',
    })
  }

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
        .bill-table { width: 100%; border-collapse: collapse; }
        .bill-table th, .bill-table td {
          border: 1px solid #222;
          padding: 4px 6px;
          font-size: 12px;
          vertical-align: middle;
        }
        .bill-table th { background: #f3f3f3; font-weight: 600; }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .bill-sheet { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .bill-table th, .bill-table td { padding: 3px 6px !important; font-size: 11px !important; }
        }
      `}</style>

      <div className="no-print min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">เครื่องพิมพ์สาขา</h1>
          <p className="text-sm text-gray-400 mb-6">
            เปิดหน้านี้ค้างไว้ที่คอมสาขา ผู้จัดการกดส่งบิลจากที่ไหนก็ได้ เครื่องนี้จะพิมพ์เอง
          </p>

          {!branchId ? (
            <div className="space-y-3">
              <p className="font-medium">คอมเครื่องนี้เป็นสาขาไหน</p>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchId(b.id)}
                  className="block w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-3"
                >
                  {b.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="text-sm text-gray-400">สาขาที่รับพิมพ์</div>
              <div className="text-xl font-bold mt-1">{branchName || '...'}</div>
              <div className="mt-3 text-green-400">{status}</div>
              {lastBill && <div className="text-xs text-gray-500 mt-2">พิมพ์ล่าสุด {lastBill}</div>}
              <div className="flex gap-3 mt-5">
                <button onClick={testPrint} className="bg-blue-600 px-4 py-2 rounded text-sm">
                  ทดสอบพิมพ์
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('printer_branch_id')
                    setBranchId('')
                  }}
                  className="bg-gray-700 px-4 py-2 rounded text-sm"
                >
                  เปลี่ยนสาขา
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {bill && (
        <div id="print-area" className="bill-sheet">
          <div className="flex justify-between items-start">
            <div className="border-2 border-red-600 px-2.5 py-1">
              <div className="text-red-600 font-black text-lg tracking-wider leading-none">RATSADA</div>
            </div>
            <div className="text-right text-[11px] leading-snug">
              <div>เลขที่ {bill.bill_no}</div>
              <div>{bill.date}</div>
            </div>
          </div>

          <div className="text-center mt-3 mb-1">
            <h1 className="text-[15px] font-bold leading-tight">{bill.headerTitle || 'รัษฎาแอร์'}</h1>
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
            <div>ลูกค้า: {bill.customer || '-'} &nbsp;|&nbsp; โทร: {bill.phone || '-'}</div>
            <div>
              รถ: {bill.car || '-'} &nbsp;|&nbsp; ทะเบียน: {bill.plate || '-'} &nbsp;|&nbsp; ไมล์: {bill.mileage || '-'}
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
                  <td className="text-right">{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</td>
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
              <div>ยอดรวม: {Number(bill.subtotal || 0).toLocaleString()} บาท</div>
              <div>ส่วนลด: {Number(bill.discount || 0).toLocaleString()} บาท</div>
              <div className="font-bold text-[13px] mt-1">รวมทั้งสิ้น: {total.toLocaleString()} บาท</div>
            </div>
          </div>

          {bill.note ? <div className="mt-2 text-[11px]">หมายเหตุ: {bill.note}</div> : null}

          <div className="flex justify-between text-[10px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3 pt-5">
              ช่างซ่อม<br />{bill.date}
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
