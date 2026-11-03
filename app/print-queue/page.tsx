'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

const PROMPTPAY_ID = '0994102559'
const SHOP_TAX = '3101701714063'
const SHOP_EMAIL = 'ratsada_air@hotmail.com'

const BRANCH_BOOK = [
  { key: 'เจ้าฟ้า', title: 'รัษฎาแอร์ เจ้าฟ้าสวนหลวง', address: 'ถนนเจ้าฟ้าสวนหลวง ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต', phone: '099-4102559', email: SHOP_EMAIL },
  { key: 'ท่าเรือ', title: 'รัษฎาแอร์ ท่าเรือ', address: '56/6 หมู่ที่ 5 ถนนเทพกระษัตรี ตำบลศรีสุนทร อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: SHOP_EMAIL },
  { key: 'สนามบิน', title: 'รัษฎาแอร์ สนามบิน', address: '201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: SHOP_EMAIL },
  { key: 'กู้กู', title: 'รัษฎาแอร์ กู้กู', address: '63/20 หมู่ที่ 3 ถนนร่วมพัฒนา ตำบลรัษฎา อำเภอเมือง จังหวัดภูเก็ต 83000', phone: '099-4102559 , 084-3057559', email: SHOP_EMAIL },
]

const DOC_TITLE: Record<string, string> = {
  receipt: 'ใบเสร็จรับเงิน/Receipt',
  delivery: 'ใบส่งของ/Delivery Bill',
  deposit: 'ใบรับเงินมัดจำ/Receive Deposit',
  quotation: 'ใบเสนอราคา/Quotation',
}

const PAY_LABEL: Record<string, string> = {
  cash: 'เงินสด',
  transfer: 'โอน',
  cheque: 'เช็ค',
  credit: 'ลูกหนี้เครดิต',
  unspecified: 'ไม่ระบุ',
}

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

function bookFor(name: string) {
  return BRANCH_BOOK.find((item) => name && name.includes(item.key)) || null
}

function unpackNote(raw: string) {
  const text = String(raw || '')
  const marker = text.lastIndexOf('[[meta]]')
  let body = marker >= 0 ? text.slice(0, marker) : text
  let meta: any = {}
  if (marker >= 0) {
    try { meta = JSON.parse(text.slice(marker + 8)) || {} } catch { meta = {} }
  }
  const lines = body.replace(/\s+$/, '').split('\n')
  while (lines.length && (/^ชำระโดย:/.test(lines[lines.length - 1].trim()) || /^ช่าง:/.test(lines[lines.length - 1].trim()))) {
    lines.pop()
  }
  body = lines.join('\n').replace(/^\s+|\s+$/g, '')
  let warranty = Number(meta.warrantyMonths || 0)
  const matched = body.match(/^รับประกันงาน\s*(\d+)\s*เดือน(?:\n|$)/)
  if (matched) {
    if (!warranty) warranty = Number(matched[1])
    body = body.slice(matched[0].length).replace(/^\s+/, '')
  }
  return { note: body, meta, warranty }
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.slice(0, 10).split('-')
  if (!year || !month || !day) return iso.slice(0, 10)
  return `${day}/${month}/${Number(year) + 543}`
}

function crc16(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function promptPay(id: string, amount: number) {
  const numbers = id.replace(/\D/g, '')
  const target = numbers.length >= 13 ? numbers : ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  const targetType = numbers.length >= 15 ? '03' : numbers.length >= 13 ? '02' : '01'
  const field = (tag: string, value: string) => tag + String(value.length).padStart(2, '0') + value
  const merchant = field('00', 'A000000677010111') + field(targetType, target)
  const amountText = amount > 0 ? amount.toFixed(2) : ''
  const body = [
    field('00', '01'),
    field('01', amountText ? '12' : '11'),
    field('29', merchant),
    field('58', 'TH'),
    field('53', '764'),
    amountText ? field('54', amountText) : '',
  ].join('')
  return body + '6304' + crc16(body + '6304')
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
  const { can, showPrice } = useAccess()
  const canRemotePrint = can('print_remote')
  const money = (value: number) => (showPrice ? Number(value || 0).toLocaleString() : '—')

  const load = async (word = q) => {
    setLoading(true)
    const supabase = createClient()
    const branchRes = await supabase.from('branches').select('id, name').order('name')
    setBranches(branchRes.data || [])

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
  const packed = unpackNote(current?.note || '')
  const meta = packed.meta || {}
  const info = bookFor(branchName)
  const headerTitle = info?.title || (branchName ? `รัษฎาแอร์ ${String(branchName).replace(/^สาขา\s*/, '')}` : 'รัษฎาแอร์')
  const headerAddress = info?.address || ''
  const headerPhone = info?.phone || '099-4102559'
  const headerEmail = info?.email || SHOP_EMAIL
  const signIso = String(meta.signDate || '')
  const dateText = signIso ? thaiFromIso(signIso) : thaiFromIso(String(current?.created_at || '').slice(0, 10))
  const brand = String(meta.brand || '')
  const model = String(meta.model || '')
  const color = String(meta.color || '')
  const carText = (brand || model || color)
    ? `${brand} ${model}${color ? ` สี${color}` : ''}`.replace(/\s+/g, ' ').trim()
    : String(current?.car_info || '')
  const technician = String(meta.technician || '')
  const payType = String(meta.payType || '')
  const payLabel = String(meta.payLabel || PAY_LABEL[payType] || '')
  const showPay = Boolean(payType) && payType !== 'unspecified' && payLabel !== 'ไม่ระบุ'
  const docTitle = DOC_TITLE[String(meta.docType || 'receipt')] || DOC_TITLE.receipt
  const company = String(meta.customerType || '') === 'company'
  const customerAddress = String(meta.customerAddress || '')
  const customerTax = String(meta.customerTax || '')
  const chequeNo = String(meta.chequeNo || '')
  const warranty = Number(packed.warranty || 0)
  const noteText = packed.note
  const warrantyText = warranty > 0 ? `รับประกันงาน ${warranty} เดือน` : ''
  const showQr = showPrice && total > 0 && payType !== 'credit' && payType !== 'cheque' && String(meta.docType || 'receipt') !== 'quotation' && String(meta.docType || 'receipt') !== 'delivery'
  const qrPayload = showQr ? promptPay(PROMPTPAY_ID, total) : ''
  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&ecc=M&data=${encodeURIComponent(qrPayload)}`
    : ''

  const sendToBranch = async () => {
    if (!current) return
    if (current.voided_at) {
      setMsg('บิลที่ยกเลิกแล้วส่งพิมพ์ไปสาขาไม่ได้')
      return
    }
    if (!targetBranch) {
      setMsg('เลือกสาขาก่อนส่งพิมพ์')
      return
    }
    if (!canRemotePrint) {
      setMsg('สั่งพิมพ์ไปสาขาได้เฉพาะบัญชีที่ล็อกอินเป็นผู้ดูแลระบบหรือผู้จัดการสาขา')
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
        billNo: current.bill_no,
        date: dateText,
        dateText,
        headerTitle,
        title: headerTitle,
        address: headerAddress,
        shopPhone: headerPhone,
        email: headerEmail,
        showShopTax: company,
        shopTax: company ? SHOP_TAX : '',
        branchName,
        docTitle,
        customerType: company ? 'company' : 'general',
        customer: current.customer_name || '',
        customer_name: current.customer_name || '',
        phone: current.phone || '',
        customerAddress,
        customerTax: company ? customerTax : '',
        plate: current.license_plate || '',
        license_plate: current.license_plate || '',
        brand,
        model,
        color,
        car: carText,
        car_info: carText,
        mileage: current.mileage || '',
        technician,
        signDate: dateText,
        payType: payType || 'unspecified',
        payLabel,
        chequeNo,
        items,
        discount,
        subtotal,
        total,
        note: noteText,
        warrantyText,
        showQr,
        promptpay: qrPayload,
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
        .bill-head { display: flex; gap: 12px; align-items: center; }
        .bill-logo { width: 190px; height: auto; object-fit: contain; }
        .bill-shop { flex: 1; text-align: right; }
        .bill-shop h1 { margin: 0; font-size: 22px; line-height: 1.25; }
        .bill-no { font-size: 15px; font-weight: 400; line-height: 1.4; margin: 0 0 2px; }
        .bill-shop p { margin: 0; font-size: 11px; line-height: 1.35; }
        .bill-warn { color: #b00000; font-size: 12px; margin-top: 4px; }
        @media screen and (max-width: 820px) {
          .bill-sheet { width: 210mm; max-width: 210mm; zoom: calc((100vw - 16px) / 210mm); margin-left: 8px; }
        }
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
                    <div className="font-semibold">{bill.bill_no} — {bill.customer_name || '-'} | {bill.license_plate || '-'}{bill.voided_at ? ' · ยกเลิก' : ''}</div>
                    <div className="text-xs text-gray-400">{bill.branches?.name || 'ไม่ได้เลือกสาขา'} · {String(bill.created_at || '').replace('T', ' ').slice(0, 16)}</div>
                  </div>
                  <div className="font-semibold">{money(Number(bill.total || 0))}</div>
                </div>
              </button>
            ))}
            {!loading && shown.length === 0 && <p className="text-gray-400">ไม่มีบิลในสาขานี้ ลองเลือกทุกสาขา</p>}
          </div>
        </div>
      )}

      {current && (
        <div className="bill-sheet">
          <div className="bill-head">
            <img src="/ratsada-logo.png" alt="RATSADA" className="bill-logo" />
            <div className="bill-shop">
              <div className="bill-no">เลขที่ {current.bill_no || '—'}</div>
              <h1>{headerTitle}</h1>
              {headerAddress ? <p>{headerAddress}</p> : <p>เลือกสาขา หัวบิลจะเปลี่ยนตามสาขานั้น</p>}
              <p>
                Tel. {headerPhone} Email. {headerEmail}
                {company ? ` เลขผู้เสียภาษีอากร ${SHOP_TAX}` : ''}
              </p>
            </div>
          </div>
          <h2 className="text-center font-bold text-[18px] mt-2 mb-2">{docTitle}</h2>

          <div className="no-print mb-3">
            <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className="w-full p-2 text-sm">
              <option value="">-- เลือกสาขาที่จะพิมพ์ --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex justify-between items-end gap-4 text-[15px] leading-snug mb-2">
            <div>
              {company ? (
                <>
                  <div className="font-bold">{current.customer_name || ''}</div>
                  <div>ที่อยู่: {customerAddress || '-'}</div>
                  <div>เลขที่ผู้เสียภาษี {customerTax || '-'} โทร: {current.phone || '-'}</div>
                </>
              ) : (
                <div>ลูกค้า: {current.customer_name || '-'} โทร: {current.phone || '-'}</div>
              )}
              <div>รุ่นรถ: {carText || '-'} ทะเบียน: {current.license_plate || '-'} เลขที่ไมล์: {current.mileage ? `${current.mileage} km.` : '-'}</div>
              {showPay ? <div>ชำระโดย: {payLabel}{chequeNo ? ` ${chequeNo}` : ''}</div> : null}
            </div>
            <div className="text-right whitespace-nowrap">วันที่ {dateText || '-'}</div>
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
                  <td className="text-right">{money(Number(item.price || 0))}</td>
                  <td className="text-right">{money(Number(item.price || 0) * Number(item.qty || 1))}</td>
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
                  <p className="text-[9px] mt-0.5">{money(total)} บาท</p>
                </div>
              )}
            </div>
            <div className="text-right text-[12px] leading-snug">
              <div>ยอดรวม: {money(subtotal)} บาท</div>
              <div>ส่วนลด: {money(discount)} บาท</div>
              <div className="font-bold text-[13px] mt-1">รวมทั้งสิ้น: {money(total)} บาท</div>
            </div>
          </div>

          {noteText ? <div className="mt-2 text-[12px] whitespace-pre-wrap">{noteText}</div> : null}
          {warrantyText ? <div className="bill-warn">{warrantyText}</div> : null}

          <div className="flex justify-between text-[12px] mt-8">
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ตรวจรับงานซ่อม
            </div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ช่างซ่อม
              <div>{technician}</div>
              <div>{dateText}</div>
            </div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
              ผู้รับเงิน
            </div>
          </div>

          <div className="text-center mt-5 no-print flex flex-col gap-3">
            <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setCurrent(null)} className="bg-gray-200 text-black px-5 py-3 rounded">กลับไปรายการ</button>
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-3 rounded">พิมพ์ที่เครื่องนี้</button>
            <button onClick={sendToBranch} disabled={sending || !canRemotePrint} className="bg-green-600 text-white px-5 py-3 rounded disabled:opacity-50">
              {sending ? 'กำลังส่ง...' : 'ส่งพิมพ์ไปสาขานี้'}
            </button>
            </div>
            {!canRemotePrint && <p className="text-sm text-gray-600">บัญชีที่ล็อกอินนี้พิมพ์ที่เครื่องนี้ได้ แต่ส่งข้ามสาขาได้เฉพาะผู้ดูแลระบบหรือผู้จัดการสาขา</p>}
          </div>
          {msg && <p className="text-center mt-2 no-print text-sm">{msg}</p>}
        </div>
      )}
    </>
  )
}
// branch letterhead follows the selected shop
