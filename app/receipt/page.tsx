'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }

const SHOP_TAX = '3101701714063'
const PROMPTPAY_ID = '0994102559'

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

const PAY_TYPES = [
  { id: 'cash', label: 'เงินสด' },
  { id: 'transfer', label: 'โอน' },
  { id: 'cheque', label: 'เช็ค' },
  { id: 'credit', label: 'ลูกหนี้เครดิต' },
]

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan'],
  Mitsubishi: ['Attrage', 'Mirage', 'Lancer', 'Pajero Sport', 'Triton', 'Xpander'],
  Isuzu: ['D-Max', 'MU-X', 'MU-7'],
  Ford: ['Ranger', 'Everest', 'Focus', 'Fiesta'],
  Chevrolet: ['Colorado', 'Trailblazer', 'Captiva', 'Cruze'],
  Suzuki: ['Swift', 'Ciaz', 'Ertiga', 'XL7', 'Carry'],
  MG: ['MG3', 'MG5', 'ZS', 'HS', 'Extender'],
  Hyundai: ['H-1', 'Staria', 'Tucson', 'Creta'],
  Kia: ['Carnival', 'Sportage', 'Seltos'],
  BMW: ['Series 3', 'Series 5', 'X1', 'X3', 'X5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLC', 'Vito'],
  Lexus: ['NX', 'RX', 'ES', 'IS'],
  Subaru: ['XV', 'Forester', 'Outback'],
}

const COLORS = ['ขาว', 'ดำ', 'เทา', 'เงิน', 'แดง', 'น้ำเงิน', 'น้ำตาล', 'ทอง', 'เขียว', 'เหลือง', 'ส้ม', 'ฟ้า']

function blank(): Line {
  return { name: '', qty: 1, price: 0 }
}

function thaiStamp(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = date.getFullYear() + 543
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${mi}`
}

async function nextBillNo(supabase: any) {
  const now = new Date()
  const prefix = `${String(now.getFullYear() + 543).slice(-2)}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-`
  const res = await supabase.from('bills').select('bill_no').ilike('bill_no', `${prefix}%`).limit(200)
  let max = 0
  for (const row of res.data || []) {
    const n = Number(String(row.bill_no || '').split('-').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return prefix + String(max + 1).padStart(3, '0')
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

function readAge(data: any): number | null {
  if (typeof data === 'number') return data
  if (typeof data === 'string' && data !== '' && !Number.isNaN(Number(data))) return Number(data)
  if (Array.isArray(data)) return readAge(data[0])
  if (data && typeof data === 'object') {
    const value = data.age_seconds ?? data.age ?? data.seconds ?? data.printer_age
    if (value != null && !Number.isNaN(Number(value))) return Number(value)
  }
  return null
}

export default function ReceiptPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [docType, setDocType] = useState('receipt')
  const [customerType, setCustomerType] = useState('general')
  const [payType, setPayType] = useState('cash')
  const [chequeNo, setChequeNo] = useState('')
  const [technician, setTechnician] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(0)
  const [billNo, setBillNo] = useState('')
  const [dateText, setDateText] = useState('')
  const [customer, setCustomer] = useState('')
  const [customerHits, setCustomerHits] = useState<any[]>([])
  const [phone, setPhone] = useState('')
  const [customerTax, setCustomerTax] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [plate, setPlate] = useState('')
  const [plateHits, setPlateHits] = useState<any[]>([])
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [items, setItems] = useState<Line[]>([blank(), blank(), blank(), blank(), blank()])
  const [partFocus, setPartFocus] = useState(-1)
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [savedId, setSavedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [printerText, setPrinterText] = useState('ยังไม่เลือกสาขา')
  const [printerOn, setPrinterOn] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      const supabase = createClient()
      const branchRes = await supabase.from('branches').select('*').order('name')
      const employeeRes = await supabase.from('employees').select('*').limit(300)
      const partRes = await supabase.from('parts_services').select('id, name, price, stock').order('name').limit(800)
      const number = await nextBillNo(supabase)
      if (!alive) return
      setBranches(branchRes.data || [])
      setEmployees(employeeRes.data || [])
      setParts(partRes.data || [])
      setBillNo(number)
      setDateText(thaiStamp())
      try {
        const draft = JSON.parse(localStorage.getItem('receiveDraft') || 'null')
        if (draft) {
          setCustomer(draft.customer || '')
          setPhone(draft.phone || '')
          setPlate(draft.plate || '')
          setModel(draft.car || '')
          setMileage(draft.mileage || '')
          if (draft.note) setNote(draft.note)
        }
        const picked = JSON.parse(localStorage.getItem('selectedItems') || '[]')
        if (Array.isArray(picked) && picked.length) {
          const lines = picked.slice(0, 16).map((item: any) => ({ name: String(item.name || ''), qty: Number(item.qty || 1), price: Number(item.price || 0) }))
          while (lines.length < 5) lines.push(blank())
          setItems(lines)
          localStorage.removeItem('selectedItems')
        }
      } catch {}
    }
    run()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!branchId) {
      setPrinterText('ยังไม่เลือกสาขา')
      setPrinterOn(false)
      return
    }
    let stop = false
    const tick = async () => {
      const supabase = createClient()
      const rpc = await supabase.rpc('printer_age', { p_branch_id: branchId })
      let age = rpc.error ? null : readAge(rpc.data)
      if (age == null) {
        const beat = await supabase.from('printer_heartbeats').select('*').eq('branch_id', branchId).limit(1)
        const row = beat.data?.[0]
        const raw = row?.last_seen || row?.updated_at || row?.seen_at
        if (raw) age = Math.round((Date.now() - new Date(raw).getTime()) / 1000)
      }
      if (stop) return
      if (age == null || Number.isNaN(age)) {
        setPrinterOn(false)
        setPrinterText('ไม่พบสัญญาณเครื่องพิมพ์สาขานี้')
        return
      }
      const online = age <= 20
      setPrinterOn(online)
      setPrinterText(online ? `เครื่องพิมพ์สาขาออนไลน์ ${age} วินาทีที่แล้ว` : `เครื่องพิมพ์สาขาออฟไลน์ ${age} วินาที`)
    }
    tick()
    const timer = setInterval(tick, 5000)
    return () => { stop = true; clearInterval(timer) }
  }, [branchId])

  const selected = branches.find((item) => item.id === branchId)
  const info = BRANCH_BOOK.find((item) => selected?.name && String(selected.name).includes(item.key)) || null
  const title = info?.title || (selected?.name ? String(selected.name) : 'รัษฎาแอร์')
  const docTitle = DOC_TYPES.find((item) => item.id === docType)?.title || DOC_TYPES[0].title
  const payLabel = PAY_TYPES.find((item) => item.id === payType)?.label || 'เงินสด'
  const lines = items.filter((item) => item.name.trim())
  const subtotal = lines.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0)
  const total = Math.max(0, subtotal - Number(discount || 0))
  const showQr = (docType === 'receipt' || docType === 'deposit') && payType !== 'credit' && payType !== 'cheque' && total > 0
  const warrantyText = warrantyMonths > 0 ? `รับประกันงาน ${warrantyMonths} เดือน` : ''
  const brandKey = Object.keys(BRANDS).find((name) => name.toLowerCase() === brand.trim().toLowerCase()) || ''

  const brandHits = useMemo(() => {
    const q = brand.trim().toLowerCase()
    if (!q) return []
    return Object.keys(BRANDS).filter((name) => name.toLowerCase().startsWith(q) && name.toLowerCase() !== q).slice(0, 8)
  }, [brand])

  const modelHits = useMemo(() => {
    const list = brandKey ? BRANDS[brandKey] : Object.values(BRANDS).flat()
    const q = model.trim().toLowerCase()
    if (!q) return []
    return list.filter((name) => name.toLowerCase().includes(q) && name.toLowerCase() !== q).slice(0, 8)
  }, [brandKey, model])

  const partHits = useMemo(() => {
    const q = items[partFocus]?.name?.trim().toLowerCase() || ''
    if (!q) return []
    return parts.filter((part) => String(part.name || '').toLowerCase().includes(q) && String(part.name || '').toLowerCase() !== q).slice(0, 8)
  }, [parts, items, partFocus])

  const searchCustomers = async (value: string) => {
    setCustomer(value)
    setSavedId('')
    if (value.trim().length < 1) { setCustomerHits([]); return }
    const res = await createClient().from('customers').select('id, full_name, phone').ilike('full_name', `%${value.trim()}%`).limit(8)
    setCustomerHits(res.data || [])
  }

  const searchPlates = async (value: string) => {
    setPlate(value)
    setSavedId('')
    if (value.trim().length < 1) { setPlateHits([]); return }
    const supabase = createClient()
    const withCustomer = await supabase.from('vehicles').select('*, customers(full_name, phone)').ilike('license_plate', `%${value.trim()}%`).limit(8)
    const plain = withCustomer.error ? await supabase.from('vehicles').select('*').ilike('license_plate', `%${value.trim()}%`).limit(8) : null
    setPlateHits((plain?.data || withCustomer.data || []) as any[])
  }

  const payload = () => ({
    headerTitle: title,
    title,
    address: info?.address || '',
    shopPhone: info?.phone || '',
    email: info?.email || '',
    showShopTax: customerType === 'company',
    shopTax: customerType === 'company' ? SHOP_TAX : '',
    docType,
    docTitle,
    billNo,
    bill_no: billNo,
    dateText,
    date: dateText,
    customerType,
    customer,
    customer_name: customer,
    customerPhone: phone,
    phone,
    customerTax: customerType === 'company' ? customerTax : '',
    customerAddress,
    plate,
    license_plate: plate,
    brand,
    model,
    color,
    car: `${brand} ${model} ${color}`.trim(),
    car_info: `${brand} ${model} ${color}`.trim(),
    mileage,
    technician,
    payType,
    payLabel,
    chequeNo,
    items: lines,
    discount: Number(discount || 0),
    subtotal,
    total,
    note,
    warrantyText,
    showQr,
  })

  const save = async () => {
    if (!lines.length) { setMsg('ใส่รายการก่อนบันทึก'); return }
    setSaving(true)
    const meta = { docType, customerType, customerTax, customerAddress, payType, payLabel, chequeNo, technician, brand, model, color, warrantyMonths, title, address: info?.address || '' }
    const row: any = {
      bill_no: billNo,
      customer_name: customer || null,
      phone: phone || null,
      license_plate: plate || null,
      car_info: `${brand} ${model} ${color}`.trim() || null,
      mileage: mileage ? Number(mileage) : null,
      items: lines,
      discount: Number(discount || 0),
      total,
      note: [warrantyText, note, `ชำระโดย: ${payLabel}`, technician ? `ช่าง: ${technician}` : ''].filter(Boolean).join('\n') + `\n[[meta]]${JSON.stringify(meta)}`,
      branch_id: branchId || null,
    }
    const supabase = createClient()
    let res = savedId
      ? await supabase.from('bills').update(row).eq('id', savedId).select('id')
      : await supabase.from('bills').insert(row).select('id')
    if (res.error && String(res.error.message).includes('mileage')) {
      delete row.mileage
      res = savedId ? await supabase.from('bills').update(row).eq('id', savedId).select('id') : await supabase.from('bills').insert(row).select('id')
    }
    if (!res.error && !savedId) {
      for (const line of lines) {
        const part = parts.find((item) => item.name === line.name && item.stock != null)
        if (!part) continue
        await supabase.from('parts_services').update({ stock: Math.max(0, Number(part.stock) - Number(line.qty || 1)) }).eq('id', part.id)
      }
      setSavedId(res.data?.[0]?.id || 'saved')
    }
    setSaving(false)
    setMsg(res.error ? res.error.message : 'บันทึกบิลแล้ว')
  }

  const sendBranch = async () => {
    if (!branchId) { setMsg('เลือกสาขาก่อนส่งพิมพ์'); return }
    const res = await createClient().from('print_jobs').insert({ branch_id: branchId, bill_no: billNo, status: 'pending', payload: payload() })
    setMsg(res.error ? res.error.message : `ส่งพิมพ์ไป ${title} แล้ว`)
  }

  const fresh = async () => {
    setBillNo(await nextBillNo(createClient()))
    setDateText(thaiStamp())
    setItems([blank(), blank(), blank(), blank(), blank()])
    setCustomer(''); setPhone(''); setCustomerTax(''); setCustomerAddress(''); setCustomerHits([])
    setPlate(''); setPlateHits([]); setBrand(''); setModel(''); setColor(''); setMileage('')
    setDiscount(0); setNote(''); setWarrantyMonths(0); setChequeNo(''); setSavedId(''); setMsg('พร้อมออกบิลใหม่')
  }

  const qr = showQr ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total.toFixed(2)}`)}` : ''

  return (
    <div className="page">
      <style>{`
        .page { background:#ececec; color:#111; min-height:100vh; padding:16px; font-family:"Leelawadee UI",Tahoma,sans-serif; }
        .toolbar { max-width:210mm; margin:0 auto 10px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .toolbar label { font-size:12px; color:#333; display:block; }
        .toolbar select, .toolbar input { width:100%; margin-top:3px; background:#fff; color:#111; border:1px solid #ccc; border-radius:8px; padding:8px; }
        .status { grid-column:1 / -1; font-size:13px; }
        .sheet { max-width:210mm; margin:0 auto; background:#fff; color:#111; padding:12px 14px 16px; border-top:4px solid #d00000; box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .head { display:flex; gap:12px; align-items:center; }
        .logo { width:190px; height:auto; object-fit:contain; }
        .shop { flex:1; text-align:right; }
        .shop h1 { margin:0; font-size:22px; }
        .shop p { margin:0; font-size:11px; line-height:1.35; }
        .doc { text-align:center; font-size:18px; margin:8px 0; }
        .grid { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:6px; }
        .sheet input, .sheet textarea { width:100%; box-sizing:border-box; background:#fff; color:#111; border:1px solid #e6e6e6; border-radius:4px; padding:5px 6px; font:inherit; }
        table { width:100%; border-collapse:collapse; margin-top:8px; }
        th, td { border:1px solid #222; padding:3px 5px; font-size:12px; vertical-align:top; }
        th { background:#f5f5f5; }
        .c { text-align:center; } .r { text-align:right; }
        .rel { position:relative; }
        .menu { position:absolute; z-index:30; left:0; right:0; background:#fff; border:1px solid #ddd; max-height:180px; overflow:auto; }
        .menu button, .chips button, .rowbtn { background:#fff; color:#111; border:1px solid #ddd; border-radius:6px; padding:4px 8px; cursor:pointer; }
        .chips { display:flex; gap:4px; flex-wrap:wrap; margin:4px 0; }
        .foot { display:flex; justify-content:space-between; gap:12px; margin-top:8px; }
        .sum { text-align:right; min-width:180px; }
        .grand { font-size:16px; font-weight:700; }
        .words { font-size:12px; }
        .qr { display:flex; gap:8px; align-items:center; font-size:11px; }
        .qr img { width:72px; height:72px; }
        .warn { color:#b00000; font-size:12px; margin-top:4px; }
        .signs { display:flex; justify-content:space-between; margin-top:18px; text-align:center; font-size:12px; }
        .signs i { display:block; width:130px; border-bottom:1px solid #111; height:26px; margin:0 auto 4px; }
        .actions { max-width:210mm; margin:10px auto 0; display:flex; gap:8px; flex-wrap:wrap; }
        .actions button { border:0; border-radius:8px; color:#fff; padding:10px 14px; cursor:pointer; }
        @media (max-width:800px) { .toolbar, .grid { grid-template-columns:1fr 1fr; } }
        @media print {
          @page { size:A4 portrait; margin:8mm; }
          .no-print { display:none !important; }
          .page { background:#fff; padding:0; }
          .sheet { box-shadow:none; border-top:0; max-width:none; padding:0; }
          .sheet input, .sheet textarea { border:none !important; padding:0 !important; background:transparent !important; }
          tr.spare { display:none; }
        }
      `}</style>

      <div className="toolbar no-print">
        <label>สาขา
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">ยังไม่เลือก</option>
            {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>เอกสาร
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label>ประเภทลูกค้า
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
            <option value="general">ลูกค้าทั่วไป ไม่ใส่เลขภาษี</option>
            <option value="company">บริษัท ใส่เลขภาษี</option>
          </select>
        </label>
        <label>ชำระโดย
          <select value={payType} onChange={(e) => setPayType(e.target.value)}>
            {PAY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>ชื่อช่าง
          <input list="techs" value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="เลือกหรือพิมพ์ชื่อช่าง" />
          <datalist id="techs">{employees.map((item) => <option key={item.id} value={item.name || item.full_name || item.code} />)}</datalist>
        </label>
        <label>รับประกัน
          <select value={warrantyMonths} onChange={(e) => setWarrantyMonths(Number(e.target.value))}>
            <option value={0}>ไม่ระบุ</option>
            <option value={1}>1 เดือน</option>
            <option value={3}>3 เดือน</option>
            <option value={6}>6 เดือน</option>
            <option value={12}>12 เดือน</option>
          </select>
        </label>
        {payType === 'cheque' && <label>เลขที่เช็ค<input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} /></label>}
        <div className="status" style={{ color: printerOn ? '#067a32' : '#9a3412' }}>{printerText}</div>
      </div>

      <div className="sheet">
        <div className="head">
          {logoOk && <img src="/ratsada-logo.png" alt="RATSADA" className="logo" onError={() => setLogoOk(false)} />}
          <div className="shop">
            <h1>{title}</h1>
            {info && <p>{info.address}</p>}
            {info && <p>Tel. {info.phone} Email. {info.email}</p>}
            {customerType === 'company' && <p>เลขประจำตัวผู้เสียภาษีอากร {SHOP_TAX}</p>}
          </div>
        </div>
        <h2 className="doc">{docTitle}</h2>
        <div className="grid">
          <div className="rel">
            <input value={customer} autoComplete="off" onChange={(e) => searchCustomers(e.target.value)} placeholder="ชื่อลูกค้า / ชื่อบริษัท" />
            {customerHits.length > 0 && (
              <div className="menu no-print">
                {customerHits.map((item) => <button key={item.id} onClick={() => { setCustomer(item.full_name || ''); setPhone(item.phone || ''); setCustomerHits([]) }}>{item.full_name} {item.phone || ''}</button>)}
              </div>
            )}
          </div>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setSavedId('') }} placeholder="เบอร์โทร" />
          <input value={customerType === 'company' ? customerTax : ''} disabled={customerType !== 'company'} onChange={(e) => setCustomerTax(e.target.value)} placeholder={customerType === 'company' ? 'เลขผู้เสียภาษีลูกค้า' : 'ลูกค้าทั่วไป'} />
          <input style={{ gridColumn: '1 / -1' }} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="ที่อยู่ลูกค้า ถ้าเป็นบริษัท" />
          <div className="rel">
            <input value={plate} autoComplete="off" onChange={(e) => searchPlates(e.target.value)} placeholder="ป้ายทะเบียน" />
            {plateHits.length > 0 && (
              <div className="menu no-print">
                {plateHits.map((item) => (
                  <button key={item.id} onClick={() => { setPlate(item.license_plate || ''); setBrand(item.brand || ''); setModel(item.model || model); setColor(item.color || ''); setMileage(item.mileage ? String(item.mileage) : mileage); setCustomer(item.customers?.full_name || customer); setPhone(item.customers?.phone || phone); setPlateHits([]) }}>
                    {item.license_plate} {item.brand} {item.model}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="rel">
            <input value={brand} autoComplete="off" onFocus={() => setBrandOpen(true)} onBlur={() => setTimeout(() => setBrandOpen(false), 180)} onChange={(e) => { setBrand(e.target.value); setBrandOpen(true); setSavedId('') }} placeholder="ยี่ห้อ เช่น T" />
            {brandOpen && brandHits.length > 0 && <div className="menu no-print">{brandHits.map((item) => <button key={item} onMouseDown={() => { setBrand(item); setBrandOpen(false) }}>{item}</button>)}</div>}
          </div>
          <div className="rel">
            <input value={model} autoComplete="off" onFocus={() => setModelOpen(true)} onBlur={() => setTimeout(() => setModelOpen(false), 180)} onChange={(e) => { setModel(e.target.value); setModelOpen(true); setSavedId('') }} placeholder="รุ่น เช่น y" />
            {modelOpen && modelHits.length > 0 && <div className="menu no-print">{modelHits.map((item) => <button key={item} onMouseDown={() => { setModel(item); setModelOpen(false) }}>{item}</button>)}</div>}
          </div>
        </div>
        <div className="chips no-print">
          {COLORS.map((item) => <button key={item} onClick={() => setColor(item)} style={{ background: color === item ? '#111' : '#fff', color: color === item ? '#fff' : '#111' }}>{item}</button>)}
        </div>
        <div className="grid">
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="สีรถ" />
          <input value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="เลขไมล์" />
          <input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="ช่างผู้ปฏิบัติ" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
          <div>ชำระโดย: {payLabel}{chequeNo ? ` เลขที่ ${chequeNo}` : ''}</div>
          <div>เลขที่ {billNo}<br />วันที่ {dateText}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th className="c" style={{ width: 36 }}>ลำดับ</th>
              <th>รายการ</th>
              <th className="c" style={{ width: 70 }}>จำนวน</th>
              <th className="r" style={{ width: 90 }}>ราคา/หน่วย</th>
              <th className="r" style={{ width: 100 }}>จำนวนเงิน</th>
              <th className="no-print" style={{ width: 46 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={item.name.trim() ? '' : 'spare'}>
                <td className="c">{index + 1}</td>
                <td className="rel">
                  <input value={item.name} autoComplete="off" onFocus={() => setPartFocus(index)} onChange={(e) => { setPartFocus(index); setSavedId(''); setItems(items.map((line, i) => i === index ? { ...line, name: e.target.value } : line)) }} placeholder="พิมพ์หรือเลือกอะไหล่" />
                  {partFocus === index && partHits.length > 0 && (
                    <div className="menu no-print">
                      {partHits.map((part) => (
                        <button key={part.id || part.name} onMouseDown={() => { setItems(items.map((line, i) => i === index ? { ...line, name: part.name, price: Number(part.price || 0) } : line)); setPartFocus(-1); setSavedId('') }}>
                          {part.name} · {Number(part.price || 0).toLocaleString()}{part.stock != null ? ` · คงเหลือ ${part.stock}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td><input className="c" value={item.qty} onChange={(e) => { setSavedId(''); setItems(items.map((line, i) => i === index ? { ...line, qty: Number(e.target.value || 0) } : line)) }} /></td>
                <td><input className="r" value={item.price} onChange={(e) => { setSavedId(''); setItems(items.map((line, i) => i === index ? { ...line, price: Number(e.target.value || 0) } : line)) }} /></td>
                <td className="r">{(Number(item.price || 0) * Number(item.qty || 0)).toLocaleString()}</td>
                <td className="no-print"><button className="rowbtn" onClick={() => setItems(items.length === 1 ? [blank()] : items.filter((_, i) => i !== index))}>ลบ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length < 16 && <button className="rowbtn no-print" style={{ marginTop: 6 }} onClick={() => setItems([...items, blank()])}>เพิ่มรายการ</button>}
        <div className="foot">
          <div>
            {qr && <div className="qr"><img src={qr} alt="PromptPay" /><div>สแกนจ่าย<br />{total.toLocaleString()} บาท</div></div>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="หมายเหตุ" />
            {warrantyText && <div className="warn">{warrantyText}</div>}
          </div>
          <div className="sum">
            <div>ยอดรวม {subtotal.toLocaleString()} บาท</div>
            <div className="no-print">ส่วนลด <input style={{ width: 90, textAlign: 'right' }} value={discount} onChange={(e) => { setDiscount(Number(e.target.value || 0)); setSavedId('') }} /></div>
            <div className="grand">รวมทั้งสิ้น {total.toLocaleString()} บาท</div>
            <div className="words">{bahtText(total)}</div>
          </div>
        </div>
        <div className="signs">
          <div><i></i>ผู้รับบริการ</div>
          <div><i></i>ช่างผู้ปฏิบัติ<br />{technician}</div>
          <div><i></i>ผู้รับเงิน</div>
        </div>
      </div>

      <div className="actions no-print">
        <button style={{ background: '#111' }} onClick={() => window.print()}>พิมพ์ที่เครื่องนี้</button>
        <button style={{ background: '#067a32' }} onClick={sendBranch}>ส่งพิมพ์ไปสาขานี้</button>
        <button style={{ background: '#1d4ed8' }} onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : savedId ? 'บันทึกการแก้ไข' : 'บันทึกบิล'}</button>
        <button style={{ background: '#4b5563' }} onClick={fresh}>ใบใหม่</button>
      </div>
      {msg && <p className="no-print" style={{ maxWidth: '210mm', margin: '8px auto', color: '#9a3412' }}>{msg}</p>}
    </div>
  )
}
