'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'
const PROMPTPAY_TEXT = '099-410-2559'

const BRANCH_BOOK = [
  { key: 'เจ้าฟ้า', title: 'รัษฎาแอร์ เจ้าฟ้าสวนหลวง', address: 'ถนนเจ้าฟ้าสวนหลวง ตำบลวิชิต อำเภอเมืองภูเก็ต จังหวัดภูเก็ต', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'ท่าเรือ', title: 'รัษฎาแอร์ ท่าเรือ', address: '56/6 หมู่ที่ 5 ถนนเทพกระษัตรี ตำบลศรีสุนทร อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'สนามบิน', title: 'รัษฎาแอร์ สนามบิน', address: '201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110', phone: '099-4102559', email: 'ratsada_air@hotmail.com' },
  { key: 'กู้กู', title: 'รัษฎาแอร์ กู้กู', address: '63/20 หมู่ที่ 3 ถนนร่วมพัฒนา ตำบลรัษฎา อำเภอเมือง จังหวัดภูเก็ต 83000', phone: '099-4102559 , 084-3057559', email: 'ratsada_air@hotmail.com' },
]

const DOC_TYPES = [
  { id: 'receipt', title: 'ใบเสร็จรับเงิน/Receipt' },
  { id: 'delivery', title: 'ใบส่งของ/Delivery Bill' },
  { id: 'deposit', title: 'ใบรับเงินมัดจำ/Receive Deposit' },
  { id: 'quotation', title: 'ใบเสนอราคา/Quotation' },
]

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
  const body = [field('00', '01'), field('01', amountText ? '12' : '11'), field('29', merchant), field('58', 'TH'), field('53', '764'), amountText ? field('54', amountText) : ''].join('')
  const data = body + '6304'
  return data + crc16(data)
}

function bahtText(amount: number) {
  const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']
  const group = (num: number): string => {
    if (num >= 1000000) return group(Math.floor(num / 1000000)) + 'ล้าน' + group(num % 1000000)
    const s = String(num)
    let out = ''
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i])
      const p = s.length - i - 1
      if (!d) continue
      if (p === 1 && d === 1) out += 'สิบ'
      else if (p === 1 && d === 2) out += 'ยี่สิบ'
      else if (p === 0 && d === 1 && s.length > 1) out += 'เอ็ด'
      else out += digits[d] + units[p]
    }
    return out
  }
  const n = Math.round(Math.abs(Number(amount || 0)) * 100)
  const baht = Math.floor(n / 100)
  const satang = n % 100
  if (!baht && !satang) return 'ศูนย์บาทถ้วน'
  return `${baht ? group(baht) + 'บาท' : ''}${satang ? group(satang) + 'สตางค์' : 'ถ้วน'}`
}

function thaiFromDate(value: string) {
  if (!value) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear() + 543}`
}

function readItems(value: any): Line[] {
  let raw = value
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = [] }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && String(item.name || item.item || '').trim())
    .map((item) => ({ name: String(item.name || item.item || ''), qty: Number(item.qty || 1), price: Number(item.price || 0) }))
}

function readMeta(note: string) {
  const text = String(note || '')
  const mark = text.indexOf('[[meta]]')
  let meta: any = {}
  let body = text
  if (mark >= 0) {
    body = text.slice(0, mark)
    try { meta = JSON.parse(text.slice(mark + 8).trim()) } catch { meta = {} }
  }
  const rows = body.split('\n').map((line) => line.trim()).filter(Boolean)
  return {
    meta,
    warranty: rows.find((line) => line.startsWith('รับประกัน')) || '',
    note: rows.filter((line) => !line.startsWith('รับประกัน') && !line.startsWith('ชำระโดย') && !line.startsWith('ช่าง:')).join('\n'),
  }
}

export default function PrintQueuePage() {
  const [branches, setBranches] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [bill, setBill] = useState<any>(null)
  const [logoOk, setLogoOk] = useState(true)
  const [msg, setMsg] = useState('')

  const loadList = async (nextBranch = branchId) => {
    const supabase = createClient()
    let query = supabase.from('bills').select('*').limit(80)
    if (nextBranch) query = query.eq('branch_id', nextBranch)
    const res = await query
    const data = res.data || []
    data.sort((a, b) => String(b.created_at || b.bill_no || '').localeCompare(String(a.created_at || a.bill_no || '')))
    setRows(data)
    if (res.error) setMsg(res.error.message)
  }

  const openBill = async (id: string, push = true) => {
    const supabase = createClient()
    let res = await supabase.from('bills').select('*').eq('id', id).maybeSingle()
    if (!res.data) res = await supabase.from('bills').select('*').eq('bill_no', id).maybeSingle()
    if (!res.data) { setMsg('ไม่พบบิล'); return }
    setBill(res.data)
    setMsg('')
    if (push) window.history.pushState({}, '', `/print-queue?id=${res.data.id || id}`)
  }

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const branchRes = await supabase.from('branches').select('*').order('name')
      setBranches(branchRes.data || [])
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) await openBill(id, false)
      else await loadList('')
    }
    run()
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) openBill(id, false)
      else setBill(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const sendBranch = async () => {
    if (!bill?.branch_id) { setMsg('บิลนี้ยังไม่มีสาขา'); return }
    const parsed = readMeta(bill.note)
    const res = await createClient().from('print_jobs').insert({
      branch_id: bill.branch_id,
      bill_no: bill.bill_no,
      status: 'pending',
      payload: { ...bill, ...parsed.meta, items: readItems(bill.items), note: parsed.note },
    })
    setMsg(res.error ? res.error.message : 'ส่งพิมพ์ไปสาขาแล้ว')
  }

  const parsed = bill ? readMeta(bill.note) : { meta: {}, warranty: '', note: '' }
  const meta = parsed.meta || {}
  const branch = branches.find((item) => item.id === bill?.branch_id)
  const info = BRANCH_BOOK.find((item) => String(branch?.name || meta.title || '').includes(item.key)) || BRANCH_BOOK.find((item) => String(meta.title || '').includes(item.key)) || null
  const title = info?.title || meta.title || branch?.name || 'รัษฎาแอร์'
  const company = meta.customerType === 'company'
  const docTitle = DOC_TYPES.find((item) => item.id === meta.docType)?.title || 'ใบเสร็จรับเงิน/Receipt'
  const items = bill ? readItems(bill.items) : []
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0)
  const discount = Number(bill?.discount || 0)
  const total = Number(bill?.total ?? Math.max(0, subtotal - discount))
  const payLabel = meta.payLabel || 'เงินสด'
  const showQr = (meta.docType || 'receipt') !== 'delivery' && (meta.docType || 'receipt') !== 'quotation' && meta.payType !== 'credit' && meta.payType !== 'cheque' && total > 0
  const qrUrl = showQr ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&ecc=M&data=${encodeURIComponent(promptPay(PROMPTPAY_ID, total))}` : ''
  const dateText = thaiFromDate(meta.dateText || bill?.created_at || '')
  const signDate = thaiFromDate(meta.signDate || bill?.created_at || '')
  const brand = meta.brand || ''
  const model = meta.model || bill?.car_info || ''
  const color = meta.color || ''
  const technician = meta.technician || ''
  const warrantyText = meta.warrantyMonths > 0 ? `รับประกันงาน ${meta.warrantyMonths} เดือน` : parsed.warranty

  return (
    <div className="page">
      <style>{`
        .page { background:#ececec; color:#111; min-height:100vh; padding:16px; font-family:"Leelawadee UI",Tahoma,sans-serif; }
        .toolbar { max-width:210mm; margin:0 auto 10px; display:flex; gap:8px; align-items:end; flex-wrap:wrap; }
        .toolbar label { font-size:12px; color:#333; }
        .toolbar select { display:block; margin-top:3px; background:#fff; color:#111; border:1px solid #ccc; border-radius:8px; padding:8px; }
        .list { max-width:210mm; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; }
        .list button { display:grid; grid-template-columns:140px 1fr 120px 90px; gap:8px; width:100%; text-align:left; background:#fff; color:#111; border:0; border-bottom:1px solid #eee; padding:10px 12px; cursor:pointer; }
        .sheet { max-width:210mm; margin:0 auto; background:#fff; color:#111; padding:12px 14px 16px; border-top:4px solid #d00000; box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .head { display:flex; gap:12px; align-items:center; }
        .logo { width:190px; height:auto; object-fit:contain; }
        .shop { flex:1; text-align:right; }
        .shop h1 { margin:0; font-size:22px; }
        .shop p { margin:0; font-size:11px; line-height:1.35; }
        .doc { text-align:center; font-size:18px; margin:6px 0 2px; }
        .who-wrap { position:relative; display:block; padding-right:46mm; margin:0 0 6px; }
        .who { font-size:13px; line-height:1.55; }
        .bill-meta { position:absolute; right:0; bottom:0; width:44mm; text-align:right; font-size:13px; line-height:1.4; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #222; padding:3px 5px; font-size:12px; }
        th { background:#f5f5f5; }
        .c { text-align:center; } .r { text-align:right; }
        .foot { display:flex; justify-content:space-between; gap:16px; margin-top:8px; align-items:flex-start; }
        .sum { min-width:230px; line-height:1.7; }
        .sum-line { display:grid; grid-template-columns:92px 78px 34px; column-gap:6px; align-items:center; }
        .sum-line .amt { text-align:right; }
        .grand { font-size:16px; font-weight:700; }
        .words { font-size:12px; text-align:right; }
        .pp { width:112px; border:1.5px solid #0b3b8c; background:#fff; }
        .pp-logo { margin:4px; border:1.5px solid #0b3b8c; text-align:center; padding:2px; }
        .pp-en { font-size:13px; font-weight:800; letter-spacing:-0.3px; line-height:1.1; }
        .pp-en b { background:#0b3b8c; color:#fff; padding:0 2px; }
        .pp-en span { color:#0b3b8c; }
        .pp img { display:block; width:92px; height:92px; margin:2px auto 3px; }
        .pp-foot { background:#1a73c7; color:#fff; text-align:center; font-size:9px; line-height:1.3; padding:3px 2px; }
        .note { white-space:pre-wrap; font-size:12px; margin-top:4px; }
        .warn { color:#b00000; font-size:12px; margin-top:4px; }
        .signs { display:grid; grid-template-columns:1fr 1fr 1fr; margin-top:18px; text-align:center; font-size:12px; }
        .sign-top { min-height:24px; }
        .signs i { display:block; width:150px; border-bottom:1px solid #111; height:0; margin:0 auto 4px; }
        .actions { max-width:210mm; margin:10px auto 0; display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
        .actions button, .actions a { border:0; border-radius:8px; color:#fff; padding:10px 14px; cursor:pointer; text-decoration:none; }
        @media print {
          @page { size:A4 portrait; margin:8mm; }
          .no-print { display:none !important; }
          .page { background:#fff; padding:0; }
          .sheet { box-shadow:none; border-top:0; max-width:none; padding:0; }
          .who-wrap { position:relative !important; padding-right:46mm !important; }
          .bill-meta { position:absolute !important; right:0 !important; bottom:0 !important; left:auto !important; width:44mm !important; text-align:right !important; }
          .pp, .pp-foot, .pp-en b { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      `}</style>

      {!bill && (
        <div className="no-print">
          <div className="toolbar">
            <label>สาขา
              <select value={branchId} onChange={(e) => { setBranchId(e.target.value); loadList(e.target.value) }}>
                <option value="">ทุกสาขา</option>
                {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <div className="list">
            {rows.map((item) => (
              <button key={item.id || item.bill_no} onClick={() => openBill(item.id || item.bill_no)}>
                <b>{item.bill_no}</b>
                <span>{item.customer_name || '-'} {item.license_plate || ''}</span>
                <span>{thaiFromDate(item.created_at || '')}</span>
                <span>{Number(item.total || 0).toLocaleString()}</span>
              </button>
            ))}
            {rows.length === 0 && <p style={{ padding: 16 }}>ยังไม่มีบิล</p>}
          </div>
        </div>
      )}

      {bill && (
        <>
          <div className="sheet">
            <div className="head">
              {logoOk && <img src="/ratsada-logo.png" alt="RATSADA" className="logo" onError={() => setLogoOk(false)} />}
              <div className="shop">
                <h1>{title}</h1>
                {info && <p>{info.address}</p>}
                {info && <p>Tel. {info.phone} Email. {info.email}{company ? ` เลขผู้เสียภาษีอากร ${SHOP_TAX}` : ''}</p>}
              </div>
            </div>
            <h2 className="doc">{docTitle}</h2>
            <div className="who-wrap">
              <div className="who">
                {company ? (
                  <>
                    <div>{bill.customer_name}</div>
                    {meta.customerAddress && <div>ที่อยู่: {meta.customerAddress}</div>}
                    <div>เลขที่ผู้เสียภาษี {meta.customerTax || ''} โทร: {bill.phone || ''}</div>
                  </>
                ) : (
                  <div>ลูกค้า: {bill.customer_name || ''} โทร: {bill.phone || ''}</div>
                )}
                <div>รุ่นรถ: {brand} {model} ทะเบียน: {bill.license_plate || ''} เลขที่ไมล์: {bill.mileage || ''} km.{color ? ` สี: ${color}` : ''}</div>
                <div>ชำระโดย: {payLabel}{meta.chequeNo ? ` ${meta.chequeNo}` : ''}</div>
              </div>
              <div className="bill-meta">
                <div>เลขที่ {bill.bill_no}</div>
                <div>วันที่ {dateText}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th className="c" style={{ width: 36 }}>ลำดับ</th>
                  <th>รายการ</th>
                  <th className="c" style={{ width: 70 }}>จำนวน</th>
                  <th className="r" style={{ width: 90 }}>ราคา/หน่วย</th>
                  <th className="r" style={{ width: 100 }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className="c">{index + 1}</td>
                    <td>{item.name}</td>
                    <td className="c">{item.qty}</td>
                    <td className="r">{Number(item.price || 0).toLocaleString()}</td>
                    <td className="r">{(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="foot">
              <div>
                {qrUrl && (
                  <div className="pp">
                    <div className="pp-logo"><div className="pp-en"><b>Prompt</b><span>Pay</span></div></div>
                    <img src={qrUrl} alt="PromptPay" />
                    <div className="pp-foot">พร้อมเพย์ {PROMPTPAY_TEXT}<br />{total.toLocaleString()} บาท</div>
                  </div>
                )}
                {parsed.note && <div className="note">{parsed.note}</div>}
                {warrantyText && <div className="warn">{warrantyText}</div>}
              </div>
              <div className="sum">
                <div className="sum-line"><span>ยอดรวม</span><span className="amt">{subtotal.toLocaleString()}</span><span>บาท</span></div>
                <div className="sum-line"><span>ส่วนลด</span><span className="amt">{discount.toLocaleString()}</span><span>บาท</span></div>
                <div className="sum-line grand"><span>รวมทั้งสิ้น</span><span className="amt">{total.toLocaleString()}</span><span>บาท</span></div>
                <div className="words">{bahtText(total)}</div>
              </div>
            </div>
            <div className="signs">
              <div><div className="sign-top"></div><i></i>ตรวจรับงานซ่อม</div>
              <div><div className="sign-top">{technician}</div><i></i><div>ช่างซ่อม</div><div>{signDate}</div></div>
              <div><div className="sign-top"></div><i></i>ผู้รับเงิน</div>
            </div>
          </div>
          <div className="actions no-print">
            <a href="/print-queue" style={{ background: '#4b5563' }} onClick={(e) => { e.preventDefault(); setBill(null); window.history.pushState({}, '', '/print-queue'); loadList(branchId) }}>กลับไปรายการ</a>
            <button style={{ background: '#1d4ed8' }} onClick={() => window.print()}>พิมพ์ที่เครื่องนี้</button>
            <button style={{ background: '#067a32' }} onClick={sendBranch}>ส่งพิมพ์ไปสาขานี้</button>
          </div>
        </>
      )}
      {msg && <p className="no-print" style={{ maxWidth: '210mm', margin: '8px auto', color: '#9a3412' }}>{msg}</p>}
    </div>
  )
}
