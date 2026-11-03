'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

  const waitForImages = async () => {
    const started = Date.now()
    while (Date.now() - started < 5000) {
      const imgs = [...document.querySelectorAll('#print-area img')] as HTMLImageElement[]
      const pending = imgs.filter((img) => !(img.complete && img.naturalWidth > 0))
      if (imgs.length > 0 && pending.length === 0) {
        await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve())))
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
  }

  const printPayload = async (payload: any, jobId?: string) => {
    printingRef.current = true
    setStatus('กำลังโหลด QR ก่อนพิมพ์...')
    flushSync(() => setBill(payload))
    await waitForImages()
    setStatus('กำลังพิมพ์...')
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
  const qrData = String(bill?.promptpay || '')
  const qrUrl =
    bill?.showQr !== false && qrData
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&ecc=M&data=${encodeURIComponent(qrData)}`
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
          padding: 12px 14px 16px;
          font-family: "Leelawadee UI", Tahoma, sans-serif;
          border-top: 4px solid #d00000;
        }
        .bill-head { display:flex; gap:12px; align-items:center; }
        .bill-logo { width:190px; height:auto; object-fit:contain; }
        .bill-shop { flex:1; text-align:right; }
        .bill-shop h1 { margin:0; font-size:22px; color:#111; }
        .bill-shop p { margin:0; font-size:11px; line-height:1.35; }
        .bill-doc { text-align:center; font-size:18px; margin:6px 0 2px; }
        .bill-who { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; font-size:15px; line-height:1.45; }
        .bill-meta { text-align:right; white-space:nowrap; }
        .bill-strong { font-weight:700; }
        .bill-table { width:100%; border-collapse:collapse; margin-top:6px; }
        .bill-table th, .bill-table td { border:1px solid #222; padding:3px 5px; font-size:12px; vertical-align:middle; color:#111; }
        .bill-table th { background:#f5f5f5; }
        .bill-foot { display:flex; justify-content:space-between; gap:16px; margin-top:8px; align-items:flex-start; }
        .bill-sum { text-align:right; min-width:210px; line-height:1.7; font-size:13px; }
        .bill-grand { font-size:16px; font-weight:700; }
        .bill-warn { color:#b00000; font-size:12px; }
        .bill-pp { width:112px; border:1.5px solid #0b3b8c; }
        .bill-pp img { display:block; width:92px; height:92px; margin:2px auto; }
        .bill-pp-foot { background:#1a73c7; color:#fff; text-align:center; font-size:9px; line-height:1.3; padding:3px 2px; }
        .bill-signs { display:grid; grid-template-columns:1fr 1fr 1fr; margin-top:18px; text-align:center; font-size:12px; }
        .bill-signs i { display:block; width:150px; border-bottom:1px solid #111; margin:22px auto 4px; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; color: #111 !important; }
          .no-print { display: none !important; }
          .bill-sheet { max-width: none !important; margin: 0 !important; padding: 0 !important; border-top: 0 !important; color: #111 !important; }
          .bill-who { font-size: 15px !important; }
          .bill-table th, .bill-table td { padding: 3px 5px !important; font-size: 12px !important; }
          .bill-pp, .bill-pp-foot, .bill-pp b { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          <div className="bill-head">
            <img src="/ratsada-logo.png" alt="RATSADA" className="bill-logo" />
            <div className="bill-shop">
              <h1>{bill.title || bill.headerTitle || 'รัษฎาแอร์'}</h1>
              {bill.address ? <p>{bill.address}</p> : null}
              <p>
                Tel. {bill.shopPhone || '099-4102559'} Email. {bill.email || 'ratsada_air@hotmail.com'}
                {bill.showShopTax && bill.shopTax ? ` เลขผู้เสียภาษีอากร ${bill.shopTax}` : ''}
              </p>
            </div>
          </div>
          <h2 className="bill-doc">{bill.docTitle || 'ใบเสร็จรับเงิน/Receipt'}</h2>
          <div className="bill-who">
            <div>
              {bill.customerType === 'company' ? (
                <>
                  <div className="bill-strong">{bill.customer || ''}</div>
                  <div>ที่อยู่: {bill.customerAddress || ''}</div>
                  <div>เลขที่ผู้เสียภาษี {bill.customerTax || ''} โทร: {bill.phone || ''}</div>
                </>
              ) : (
                <div>ลูกค้า: {bill.customer || ''} โทร: {bill.phone || ''}</div>
              )}
              <div>
                รุ่นรถ: {bill.brand || ''} {bill.model || ''} ทะเบียน: {bill.plate || bill.license_plate || ''} เลขที่ไมล์: {bill.mileage ? `${bill.mileage} km.` : ''}
                {bill.color ? ` สี: ${bill.color}` : ''}
              </div>
              <div>ชำระโดย: {bill.payLabel || 'เงินสด'}{bill.chequeNo ? ` ${bill.chequeNo}` : ''}</div>
            </div>
            <div className="bill-meta">
              <div>เลขที่ {bill.billNo || bill.bill_no}</div>
              <div>วันที่ {bill.dateText || bill.date}</div>
            </div>
          </div>
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: 36 }} className="text-center">ลำดับ</th>
                <th className="text-left">รายการ</th>
                <th style={{ width: 70 }} className="text-center">จำนวน</th>
                <th style={{ width: 90 }} className="text-right">ราคา/หน่วย</th>
                <th style={{ width: 100 }} className="text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="text-center">{i + 1}</td>
                  <td>{item.name}</td>
                  <td className="text-center">{item.qty}</td>
                  <td className="text-right">{Number(item.price || 0).toLocaleString()}</td>
                  <td className="text-right">{(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bill-foot">
            <div>
              {qrUrl ? (
                <div className="bill-pp">
                  <div style={{ margin: 4, border: '1.5px solid #0b3b8c', textAlign: 'center', padding: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}><b style={{ background: '#0b3b8c', color: '#fff', padding: '0 2px' }}>Prompt</b><span style={{ color: '#0b3b8c' }}>Pay</span></div>
                  </div>
                  <img src={qrUrl} alt="PromptPay" />
                  <div className="bill-pp-foot">พร้อมเพย์ 099-410-2559<br />{total.toLocaleString()} บาท</div>
                </div>
              ) : null}
              {bill.note ? <div style={{ marginTop: 4 }}>{bill.note}</div> : null}
              {bill.warrantyText ? <div className="bill-warn">{bill.warrantyText}</div> : null}
            </div>
            <div className="bill-sum">
              <div>ยอดรวม {Number(bill.subtotal || 0).toLocaleString()} บาท</div>
              <div>ส่วนลด {Number(bill.discount || 0).toLocaleString()}</div>
              <div className="bill-grand">รวมทั้งสิ้น {total.toLocaleString()} บาท</div>
              {bill.words ? <div style={{ fontSize: 12 }}>{bill.words}</div> : null}
            </div>
          </div>
          <div className="bill-signs">
            <div><i></i>ตรวจรับงานซ่อม</div>
            <div><i></i>ช่างซ่อม<div>{bill.technician || ''}</div><div>{bill.signDate || ''}</div></div>
            <div><i></i>ผู้รับเงิน</div>
          </div>
        </div>
      )}
    </>
  )
}
