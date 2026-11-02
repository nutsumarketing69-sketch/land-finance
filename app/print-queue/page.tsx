'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PROMPTPAY_ID = '0994102559'

const STATUS_TEXT: Record<string, string> = {
  pending: 'รอพิมพ์',
  printing: 'กำลังพิมพ์',
  printed: 'พิมพ์แล้ว',
  failed: 'ไม่สำเร็จ',
}

export default function PrintQueuePage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [current, setCurrent] = useState<any | null>(null)
  const [targetBranch, setTargetBranch] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const load = async () => {
    const supabase = createClient()
    let query = supabase.from('print_jobs').select('*, branches(name)').order('created_at', { ascending: false }).limit(80)
    if (branchId) query = query.eq('branch_id', branchId)
    const [jobRes, branchRes] = await Promise.all([
      query,
      supabase.from('branches').select('id, name').order('name'),
    ])
    setJobs(jobRes.data || [])
    setBranches(branchRes.data || [])
  }

  useEffect(() => {
    load()
  }, [branchId])

  const shown = useMemo(() => {
    return jobs.filter((job) => {
      if (status !== 'all' && job.status !== status) return false
      const p = job.payload || {}
      const text = `${job.bill_no || ''} ${p.customer || ''} ${p.plate || ''} ${p.branchName || ''}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      return true
    })
  }, [jobs, status, q])

  const openJob = (job: any) => {
    setCurrent(job)
    setTargetBranch(job.branch_id || '')
    setMsg('')
  }

  const payload = current?.payload || {}
  const items = Array.isArray(payload.items) ? payload.items : []
  const subtotal = Number(payload.subtotal ?? items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.qty || 1), 0))
  const discount = Number(payload.discount || 0)
  const total = Number(payload.total ?? Math.max(0, subtotal - discount))
  const branchName = branches.find((b) => b.id === targetBranch)?.name || payload.branchName || current?.branches?.name || ''
  const headerTitle = branchName ? `รัษฎาแอร์ ${branchName}` : payload.headerTitle || 'รัษฎาแอร์'
  const qrUrl = total > 0 ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}` : ''

  const markPrinted = async () => {
    if (!current) return
    const supabase = createClient()
    await supabase.from('print_jobs').update({ status: 'printed' }).eq('id', current.id)
    setCurrent({ ...current, status: 'printed' })
    load()
  }

  const printHere = async () => {
    window.print()
    await markPrinted()
  }

  const sendToBranch = async () => {
    if (!current) return
    if (!targetBranch) {
      setMsg('เลือกสาขาก่อนส่งพิมพ์')
      return
    }
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('print_jobs').insert({
      branch_id: targetBranch,
      bill_no: current.bill_no,
      status: 'pending',
      payload: {
        ...payload,
        headerTitle,
        branchName,
      },
    })
    setSending(false)
    if (error) {
      setMsg('ส่งพิมพ์ไม่สำเร็จ')
      return
    }
    setMsg(`ส่งพิมพ์ไป${headerTitle} แล้ว เครื่องสาขาจะพิมพ์เอง`)
    load()
  }

  return (
    <>
      <style jsx global>{`
        .bill-sheet {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          color: #111;
          padding: 16px 18px 20px;
          font-family: "Leelawadee UI", Tahoma, sans-serif;
          font-size: 12px;
          line-height: 1.35;
        }
        .bill-sheet select {
          background: #fff !important;
          color: #111 !important;
          border: 1px solid #ccc !important;
          border-radius: 2px;
        }
        .bill-table { width: 100%; border-collapse: collapse; }
        .bill-table th, .bill-table td {
          border: 1px solid #222;
          padding: 4px 6px;
          font-size: 12px;
        }
        .bill-table th { background: #f3f3f3; font-weight: 600; }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .bill-sheet { max-width: none !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
          .bill-table th, .bill-table td { padding: 3px 6px !important; font-size: 11px !important; }
        }
      `}</style>

      {!current && (
        <div className="no-print p-6 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">คิวพิมพ์บิล</h1>
          <p className="text-sm text-gray-400 mb-4">เลือกบิลของสาขา แล้วพิมพ์ที่เครื่องนี้ หรือส่งไปเครื่องพิมพ์สาขา</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
              <option value="">ทุกสาขา</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอพิมพ์</option>
              <option value="printing">กำลังพิมพ์</option>
              <option value="printed">พิมพ์แล้ว</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นเลขบิล ชื่อลูกค้า ป้ายทะเบียน" className="flex-1 min-w-[220px] border border-gray-600 bg-gray-800 rounded p-2 text-white" />
            <button onClick={load} className="bg-gray-700 text-white px-4 rounded">รีเฟรช</button>
          </div>
          <div className="space-y-2">
            {shown.map((job) => {
              const p = job.payload || {}
              return (
                <button key={job.id} onClick={() => openJob(job)} className="w-full text-left border border-gray-700 rounded-lg px-4 py-3 bg-gray-900 hover:border-blue-500">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-semibold">{job.bill_no} — {p.customer || '-'} | {p.plate || '-'}</div>
                      <div className="text-xs text-gray-400">{job.branches?.name || p.branchName || '-'} · {String(job.created_at || '').replace('T', ' ').slice(0, 16)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{Number(p.total || 0).toLocaleString()}</div>
                      <div className="text-xs text-amber-300">{STATUS_TEXT[job.status] || job.status}</div>
                    </div>
                  </div>
                </button>
              )
            })}
            {shown.length === 0 && <p className="text-gray-400">ไม่มีบิลในเงื่อนไขนี้</p>}
          </div>
        </div>
      )}

      {current && (
        <div className="bill-sheet">
          <div className="flex justify-between items-start">
            <div className="border-2 border-red-600 px-2.5 py-1">
              <div className="text-red-600 font-black text-lg tracking-wider leading-none">RATSADA</div>
            </div>
            <div className="text-right text-[11px] leading-snug">
              <div>เลขที่ {current.bill_no}</div>
              <div>{payload.date || String(current.created_at || '').slice(0, 10)}</div>
            </div>
          </div>

          <div className="text-center mt-3 mb-1">
            <h1 className="text-[15px] font-bold leading-tight">{headerTitle}</h1>
            <p className="text-[9px] text-gray-700 mt-1">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
            <p className="text-[9px] text-gray-700">Tel. 099-4102559 , 076-602429 &nbsp; Email. ratsada_air@hotmail.com</p>
          </div>
          <h2 className="text-center font-bold text-[13px] mt-2 mb-3 border-b border-black pb-1">ใบเสร็จรับเงิน / Receipt</h2>

          <div className="no-print mb-3">
            <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className="w-full p-2 text-sm">
              <option value="">-- เลือกสาขาที่จะพิมพ์ --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="text-[11px] mb-2 leading-snug">
            <div>ลูกค้า: {payload.customer || '-'} &nbsp;|&nbsp; โทร: {payload.phone || '-'}</div>
            <div>รถ: {payload.car || '-'} &nbsp;|&nbsp; ทะเบียน: {payload.plate || '-'} &nbsp;|&nbsp; ไมล์: {payload.mileage || '-'}</div>
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
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td className="text-center">{item.qty}</td>
                  <td className="text-right">{Number(item.price || 0).toLocaleString()}</td>
                  <td className="text-right">{(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-3">
            <div>
              {qrUrl && (
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

          {payload.note ? <div className="mt-2 text-[11px]">หมายเหตุ: {payload.note}</div> : null}

          <div className="flex justify-between text-[10px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3 pt-5">ช่างซ่อม<br />{payload.date || ''}</div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ผู้รับเงิน
            </div>
          </div>

          <div className="text-center mt-5 no-print flex gap-3 justify-center flex-wrap">
            <button onClick={() => setCurrent(null)} className="bg-gray-200 text-black px-5 py-2 rounded text-sm">กลับไปรายการ</button>
            <button onClick={printHere} className="bg-blue-600 text-white px-5 py-2 rounded text-sm">พิมพ์ที่เครื่องนี้</button>
            <button onClick={sendToBranch} disabled={sending} className="bg-green-600 text-white px-5 py-2 rounded text-sm disabled:opacity-50">
              {sending ? 'กำลังส่ง...' : 'ส่งพิมพ์ไปสาขานี้'}
            </button>
          </div>
          {msg && <p className="text-center mt-2 no-print text-sm">{msg}</p>}
        </div>
      )}
    </>
  )
}
