'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PROMPTPAY_ID = '0994102559'

function asItems(raw: any) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function PrintQueuePage() {
  const [bills, setBills] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [q, setQ] = useState('')
  const [current, setCurrent] = useState<any | null>(null)
  const [targetBranch, setTargetBranch] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [senders, setSenders] = useState<any[]>([])
  const [senderId, setSenderId] = useState('')

  const load = async (word = q) => {
    setLoading(true)
    const supabase = createClient()
    const branchRes = await supabase.from('branches').select('id, name').order('name')
    setBranches(branchRes.data || [])
    const people = await supabase.from('employees').select('id, full_name, nickname, role').in('role', ['admin', 'manager']).order('full_name')
    setSenders(people.data || [])

    const safe = word.trim().replace(/[,()%_]/g, '')
    let query = supabase.from('bills').select('*, branches(name)').order('created_at', { ascending: false }).limit(40)
    if (branchId) query = query.eq('branch_id', branchId)
    if (safe) query = query.or(`bill_no.ilike.%${safe}%,customer_name.ilike.%${safe}%,license_plate.ilike.%${safe}%`)
    let billRes = await query

    if (billRes.error) {
      let fallback = supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(40)
      if (branchId) fallback = fallback.eq('branch_id', branchId)
      billRes = await fallback
    }

    if (billRes.error) {
      setBills([])
      setMsg('โหลดบิลไม่สำเร็จ: ' + billRes.error.message)
    } else {
      setBills(billRes.data || [])
      setMsg('')
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => load(q), 250)
    return () => clearTimeout(timer)
  }, [branchId, q])

  const shown = bills

  const openBill = (bill: any) => {
    setCurrent(bill)
    setTargetBranch(bill.branch_id || '')
    setMsg('')
  }

  const items = asItems(current?.items)
  const discount = Number(current?.discount || 0)
  const lineSum = items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.qty || 1), 0)
  const total = Number(current?.total ?? Math.max(0, lineSum - discount))
  const subtotal = lineSum || total + discount
  const branchName = branches.find((b) => b.id === targetBranch)?.name || current?.branches?.name || ''
  const headerTitle = branchName ? `รัษฎาแอร์ ${branchName}` : 'รัษฎาแอร์'
  const when = String(current?.created_at || '').replace('T', ' ').slice(0, 16)
  const qrUrl = total > 0
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}`
    : ''

  const sendToBranch = async () => {
    if (!current) return
    if (!targetBranch) {
      setMsg('เลือกสาขาก่อนส่งพิมพ์')
      return
    }
    if (!senders.some((person) => person.id === senderId)) {
      setMsg('สั่งพิมพ์ไปสาขาได้เฉพาะแอดมินหรือผู้จัดการสาขา')
      return
    }
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('print_jobs').insert({
      branch_id: targetBranch,
      bill_no: current.bill_no,
      status: 'pending',
      payload: {
        bill_no: current.bill_no,
        date: when.slice(0, 10),
        headerTitle,
        branchName,
        customer: current.customer_name || '',
        phone: current.phone || '',
        plate: current.license_plate || '',
        car: current.car_info || '',
        mileage: current.mileage || '',
        items,
        discount,
        subtotal,
        total,
        note: current.note || '',
      },
    })
    setSending(false)
    setMsg(error ? 'ส่งพิมพ์ไม่สำเร็จ: ' + error.message : `ส่งพิมพ์ไป${headerTitle} แล้ว`)
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
        .bill-table th, .bill-table td { border: 1px solid #222; padding: 4px 6px; font-size: 12px; }
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
        <div className="no-print p-4 sm:p-6 max-w-5xl mx-auto pb-24">
          <h1 className="text-2xl font-bold mb-1">คิวพิมพ์บิล</h1>
          <p className="text-sm text-gray-400 mb-4">โหลดบิลที่บันทึกแล้วของแต่ละสาขา กดเข้าบิลแล้วพิมพ์ได้เลย</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
              <option value="">ทุกสาขา</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ป้าย ชื่อ หรือเลขบิล" className="flex-1 min-w-0 w-full sm:min-w-[220px] border border-gray-600 bg-gray-800 rounded p-3 text-white text-lg" />
            <button onClick={() => load()} className="bg-gray-700 text-white px-4 py-3 rounded">{loading ? 'กำลังโหลด...' : 'รีเฟรช'}</button>
          </div>
          {msg && <p className="mb-3 text-sm text-amber-300">{msg}</p>}
          <div className="space-y-2">
            {shown.map((bill) => (
              <button key={bill.id} onClick={() => openBill(bill)} className="w-full text-left border border-gray-700 rounded-lg px-4 py-3 bg-gray-900 hover:border-blue-500">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-3">
                  <div>
                    <div className="font-semibold">{bill.bill_no} — {bill.customer_name || '-'} | {bill.license_plate || '-'}</div>
                    <div className="text-xs text-gray-400">{bill.branches?.name || 'ไม่ได้เลือกสาขา'} · {String(bill.created_at || '').replace('T', ' ').slice(0, 16)}</div>
                  </div>
                  <div className="font-semibold">{Number(bill.total || 0).toLocaleString()}</div>
                </div>
              </button>
            ))}
            {!loading && shown.length === 0 && <p className="text-gray-400">ไม่มีบิลในสาขานี้ ลองเลือกทุกสาขา</p>}
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
              <div>{when}</div>
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
            <div>ลูกค้า: {current.customer_name || '-'} &nbsp;|&nbsp; โทร: {current.phone || '-'}</div>
            <div>รถ: {current.car_info || '-'} &nbsp;|&nbsp; ทะเบียน: {current.license_plate || '-'} &nbsp;|&nbsp; ไมล์: {current.mileage || '-'}</div>
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
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-center">ไม่มีรายการในบิลนี้</td></tr>
              )}
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

          {current.note ? <div className="mt-2 text-[11px]">หมายเหตุ: {current.note}</div> : null}

          <div className="flex justify-between text-[10px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3 pt-5">ช่างซ่อม<br />{when.slice(0, 10)}</div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ผู้รับเงิน
            </div>
          </div>

          <div className="text-center mt-5 no-print flex flex-col gap-3">
            <select value={senderId} onChange={(e) => setSenderId(e.target.value)} className="w-full p-3 text-base">
              <option value="">ผู้สั่งพิมพ์ไปสาขา (แอดมินหรือผู้จัดการ)</option>
              {senders.map((person) => <option key={person.id} value={person.id}>{person.nickname ? `${person.full_name} (${person.nickname})` : person.full_name}</option>)}
            </select>
            <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setCurrent(null)} className="bg-gray-200 text-black px-5 py-3 rounded">กลับไปรายการ</button>
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-3 rounded">พิมพ์ที่เครื่องนี้</button>
            <button onClick={sendToBranch} disabled={sending} className="bg-green-600 text-white px-5 py-3 rounded disabled:opacity-50">
              {sending ? 'กำลังส่ง...' : 'ส่งพิมพ์ไปสาขานี้'}
            </button>
            </div>
          </div>
          {msg && <p className="text-center mt-2 no-print text-sm">{msg}</p>}
        </div>
      )}
    </>
  )
}
