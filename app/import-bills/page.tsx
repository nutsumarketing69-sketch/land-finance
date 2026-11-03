'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Line = { name: string; qty: number; price: number }
type Draft = {
  key: string
  billNo: string
  date: string
  branchName: string
  branchId: string | null
  customer: string
  phone: string
  address: string
  tax: string
  brand: string
  model: string
  plate: string
  mileage: string
  color: string
  discount: number
  note: string
  technician: string
  items: Line[]
}

const SHOP_PHONES = new Set(['0994102559', '076602429', '0843057559', '076606223'])
const SHOP_TAX = '3101701714063'

const ALIASES: Record<string, string[]> = {
  bill: ['เลขที่บิล', 'เลขที่', 'เลขบิล', 'billno', 'bill', 'no'],
  date: ['วันที่', 'date', 'วัน'],
  branch: ['สาขา', 'branch'],
  name: ['ชื่อลูกค้า', 'ชื่อบริษัท', 'ลูกค้า', 'บริษัท', 'ชื่อ', 'customer', 'name'],
  address: ['ที่อยู่', 'address'],
  phone: ['เบอร์โทร', 'โทรศัพท์', 'เบอร์', 'โทร', 'phone'],
  tax: ['เลขผู้เสียภาษี', 'เลขภาษี', 'tax', 'taxid'],
  brand: ['ยี่ห้อ', 'ยี่ห้อรถ', 'brand'],
  model: ['รุ่นรถ', 'รุ่น', 'model'],
  plate: ['ป้ายทะเบียน', 'ทะเบียน', 'ป้าย', 'plate'],
  mileage: ['เลขไมล์', 'ไมล์', 'mileage'],
  color: ['สีรถ', 'สี', 'color'],
  item: ['รายการ', 'ชื่อรายการ', 'สินค้า', 'อะไหล่', 'item'],
  qty: ['จำนวน', 'qty'],
  price: ['ราคาต่อหน่วย', 'ราคา/หน่วย', 'ราคา', 'price'],
  amount: ['จำนวนเงิน', 'ยอดเงิน', 'รวมเงิน', 'amount'],
  discount: ['ส่วนลด', 'discount'],
  note: ['หมายเหตุ', 'note'],
  tech: ['ช่าง', 'technician'],
}

function normKey(value: string) {
  return String(value || '').replace(/\s+/g, '').toLowerCase()
}

function digits(value: string) {
  return String(value || '').replace(/\D/g, '')
}

function num(value: string) {
  const n = Number(String(value || '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function cleanPhone(value: string) {
  const d = digits(value)
  if (!d || SHOP_PHONES.has(d)) return ''
  return String(value || '').trim()
}

function cleanTax(value: string) {
  const d = digits(value)
  if (!d || d === SHOP_TAX) return ''
  return d
}

function cleanAddress(value: string) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/56\/6/.test(text) && /เทพกระษัตรี/.test(text)) return ''
  if (/201\/2/.test(text) && /สนามบิน/.test(text)) return ''
  if (/63\/20/.test(text) && /ร่วมพัฒนา/.test(text)) return ''
  if (/เจ้าฟ้า/.test(text) && /วิชิต/.test(text)) return ''
  return text
}

function parseDate(raw: string) {
  const text = String(raw || '').trim()
  if (!text) return ''
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    let year = Number(iso[1])
    if (year > 2400) year -= 543
    return `${year}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (dmy) {
    let year = Number(dmy[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    if (year > 2400) year -= 543
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  return ''
}

function branchIdOf(name: string, branches: { id: string; name: string }[]) {
  const text = name || ''
  if (/ถลาง/.test(text) && !/ท่าเรือ|สนามบิน|กู้กู|เจ้าฟ้า/.test(text)) return null
  const keys = ['เจ้าฟ้า', 'ท่าเรือ', 'สนามบิน', 'กู้กู']
  const key = keys.find((item) => text.includes(item))
  if (!key) return null
  return branches.find((item) => String(item.name || '').includes(key))?.id || null
}

function companyName(name: string) {
  return name.startsWith('บริษัท') || name.startsWith('บ.') || /จำกัด|ห้าง|หจก|บจก/.test(name)
}

function mapHeaders(keys: string[]) {
  const mapped: Record<string, string> = {}
  for (const key of keys) {
    const clean = normKey(key)
    for (const [field, names] of Object.entries(ALIASES)) {
      if (names.some((name) => clean === normKey(name))) mapped[field] = key
    }
  }
  return mapped
}

function cell(row: Record<string, string>, headers: Record<string, string>, field: string) {
  const key = headers[field]
  return key ? String(row[key] ?? '').trim() : ''
}

export default function ImportBillsPage() {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    createClient().from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
  }, [])

  const readFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMsg('กำลังอ่านไฟล์')
    setFileName(file.name)
    try {
      const loaded = await import('xlsx')
      const book = loaded.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const sheet = book.Sheets[book.SheetNames[0]]
      const rows = loaded.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
      if (!rows.length) {
        setDrafts([])
        setMsg('ไฟล์นี้ไม่มีแถวข้อมูล')
        setBusy(false)
        return
      }
      const headers = mapHeaders(Object.keys(rows[0]))
      if (!headers.item && !headers.amount && !headers.price) {
        setMsg('ไม่พบคอลัมน์รายการ ราคา หรือจำนวนเงิน ใช้หัวตารางภาษาไทย เช่น เลขที่ วันที่ สาขา ชื่อ ป้าย รายการ จำนวน ราคา')
        setDrafts([])
        setBusy(false)
        return
      }
      const groups = new Map<string, Draft>()
      rows.forEach((row: Record<string, string>, index: number) => {
        const plate = cell(row, headers, 'plate').replace(/\s+/g, ' ').trim()
        const billNo = cell(row, headers, 'bill')
        const date = parseDate(cell(row, headers, 'date'))
        const customer = cell(row, headers, 'name')
        const key = billNo || [plate.toLowerCase(), date, customer.toLowerCase(), String(index)].filter(Boolean).join('|')
        const groupKey = billNo ? `no:${billNo}` : `row:${plate}|${date}|${customer}`
        let draft = groups.get(groupKey)
        if (!draft) {
          const branchName = cell(row, headers, 'branch')
          draft = {
            key: groupKey,
            billNo,
            date,
            branchName,
            branchId: branchIdOf(branchName, branches),
            customer,
            phone: cleanPhone(cell(row, headers, 'phone')),
            address: cleanAddress(cell(row, headers, 'address')),
            tax: cleanTax(cell(row, headers, 'tax')),
            brand: cell(row, headers, 'brand'),
            model: cell(row, headers, 'model'),
            plate,
            mileage: digits(cell(row, headers, 'mileage')),
            color: cell(row, headers, 'color'),
            discount: num(cell(row, headers, 'discount')),
            note: cell(row, headers, 'note'),
            technician: cell(row, headers, 'tech'),
            items: [],
          }
          groups.set(groupKey, draft)
        }
        const itemName = cell(row, headers, 'item')
        const qty = num(cell(row, headers, 'qty')) || 1
        const price = num(cell(row, headers, 'price'))
        const amount = num(cell(row, headers, 'amount'))
        const unit = price || (qty ? amount / qty : amount)
        if (itemName || amount || price) {
          draft.items.push({ name: itemName || 'รายการ', qty: qty || 1, price: Math.round(unit * 100) / 100 })
        }
        if (!draft.discount) draft.discount = num(cell(row, headers, 'discount'))
      })
      const list = [...groups.values()].filter((item) => item.items.length)
      setDrafts(list)
      setMsg(list.length ? `อ่านได้ ${list.length} บิล กดนำเข้าเพื่อบันทึก บิลเดิมจะไม่ถูกซ้ำ` : 'ไม่พบรายการในไฟล์')
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'อ่านไฟล์ไม่สำเร็จ')
    }
    setBusy(false)
  }

  const commit = async () => {
    if (!drafts.length) return
    setBusy(true)
    const supabase = createClient()
    let added = 0
    let skipped = 0
    let failed = 0
    for (const draft of drafts) {
      const subtotal = draft.items.reduce((sum, item) => sum + item.price * item.qty, 0)
      const total = Math.max(0, Math.round((subtotal - draft.discount) * 100) / 100)
      const plate = draft.plate.trim()
      const customer = draft.customer.trim() || (plate ? `สด ${plate}` : 'ลูกค้าทั่วไป')
      const day = draft.date || '2019-01-01'
      const createdAt = `${day}T04:00:00+00:00`
      const billNo = draft.billNo || `UP-${day.replace(/-/g, '')}-${plate || customer}`.slice(0, 40)
      const dupByNo = draft.billNo
        ? await supabase.from('bills').select('id').eq('bill_no', draft.billNo).limit(1)
        : { data: [] as { id: string }[] }
      if (dupByNo.data?.length) {
        skipped += 1
        continue
      }
      const sameDay = await supabase
        .from('bills')
        .select('id, customer_name, total, license_plate')
        .gte('created_at', `${day}T00:00:00+00:00`)
        .lt('created_at', `${day}T23:59:59+00:00`)
        .limit(1000)
      const duplicate = (sameDay.data || []).some((row) => {
        const samePlate = String(row.license_plate || '').replace(/\s+/g, '').toLowerCase() === plate.replace(/\s+/g, '').toLowerCase()
        const sameName = String(row.customer_name || '').replace(/\s+/g, '').toLowerCase() === customer.replace(/\s+/g, '').toLowerCase()
        return samePlate && sameName && Math.round(Number(row.total || 0) * 100) === Math.round(total * 100)
      })
      if (duplicate) {
        skipped += 1
        continue
      }
      let customerId = ''
      const found = await supabase.from('customers').select('id').eq('full_name', customer).limit(1)
      customerId = found.data?.[0]?.id || ''
      if (!customerId) {
        const inserted = await supabase.from('customers').insert({
          full_name: customer,
          phone: draft.phone || null,
          address: draft.address || null,
          tax_id: draft.tax || null,
        }).select('id')
        customerId = inserted.data?.[0]?.id || ''
      }
      if (plate) {
        const vehicle = await supabase.from('vehicles').select('id').ilike('license_plate', plate).limit(1)
        if (!vehicle.data?.length) {
          await supabase.from('vehicles').insert({
            customer_id: customerId || null,
            license_plate: plate,
            brand: draft.brand || (draft.model.split(' ')[0] || null),
            model: draft.model || null,
            color: draft.color || null,
            mileage: draft.mileage ? Number(draft.mileage) : null,
          })
        }
      }
      const headerNote = draft.branchId ? '' : (draft.branchName ? `สาขาตามไฟล์: ${draft.branchName}` : '')
      const dateNote = draft.date ? '' : 'วันที่ในไฟล์อ่านไม่ชัด'
      const meta = {
        docType: 'receipt',
        customerType: companyName(customer) || draft.tax || draft.address ? 'company' : 'general',
        customerTax: draft.tax,
        customerAddress: draft.address,
        payType: 'unspecified',
        payLabel: '',
        technician: draft.technician,
        brand: draft.brand,
        model: draft.model,
        color: draft.color,
        title: draft.branchName || '',
      }
      const row = {
        bill_no: billNo,
        customer_name: customer,
        phone: draft.phone || null,
        license_plate: plate || null,
        car_info: `${draft.brand} ${draft.model} ${draft.color}`.trim() || null,
        mileage: draft.mileage ? Number(draft.mileage) : null,
        items: draft.items,
        discount: draft.discount,
        total,
        note: [headerNote, dateNote, draft.note, draft.technician ? `ช่าง: ${draft.technician}` : ''].filter(Boolean).join('\n') + `\n[[meta]]${JSON.stringify(meta)}`,
        branch_id: draft.branchId,
        created_at: createdAt,
      }
      let inserted = await supabase.from('bills').insert(row).select('id')
      if (inserted.error && String(inserted.error.message).includes('mileage')) {
        const copy = { ...row } as Record<string, unknown>
        delete copy.mileage
        inserted = await supabase.from('bills').insert(copy).select('id')
      }
      if (inserted.error) failed += 1
      else added += 1
    }
    setBusy(false)
    setMsg(`นำเข้า ${added} บิล ข้ามของเดิม ${skipped} บิล ไม่สำเร็จ ${failed} บิล`)
    if (added) setDrafts([])
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">นำเข้าบิลจาก Excel</h1>
      <p className="mt-2 text-sm text-gray-300">
        อัปโหลดไฟล์บิลเก่าหรือใหม่ หนึ่งแถวต่อหนึ่งรายการ ใช้หัวตารางเช่น สาขา เลขที่ วันที่ ชื่อหรือบริษัท ที่อยู่ เบอร์ ยี่ห้อ รุ่น ป้ายทะเบียน เลขไมล์ สี รายการ จำนวน ราคา จำนวนเงิน ส่วนลด
        ระบบเก็บครบทุกช่องและเปิดกลับมาพิมพ์ได้ บิลเดิมจะไม่ถูกใส่ซ้ำ
      </p>
      <label className="relative mt-4 inline-flex cursor-pointer overflow-hidden rounded-xl bg-red-600 px-5 py-3 font-semibold">
        {busy ? 'กำลังทำงาน...' : 'อัปโหลด Excel'}
        <input type="file" accept=".xlsx,.xls,.csv" disabled={busy} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; void readFile(file) }} />
      </label>
      {fileName && <p className="mt-3 text-sm text-gray-400">{fileName}</p>}
      {msg && <p className="mt-3 text-amber-200">{msg}</p>}
      {drafts.length > 0 && (
        <>
          <button onClick={commit} disabled={busy} className="mt-4 rounded-xl bg-green-600 px-5 py-3 font-semibold disabled:opacity-50">นำเข้า {drafts.length} บิล</button>
          <div className="mt-4 space-y-3">
            {drafts.slice(0, 30).map((draft) => {
              const total = draft.items.reduce((sum, item) => sum + item.price * item.qty, 0) - draft.discount
              return (
                <div key={draft.key} className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm">
                  <div className="font-semibold">{draft.billNo || 'ยังไม่มีเลขที่'} · {draft.date || 'วันที่ไม่ชัด'} · {draft.branchName || 'ไม่ระบุสาขา'}</div>
                  <div>{draft.customer || 'ไม่มีชื่อ'} · {draft.plate || 'ไม่มีป้าย'} · {draft.brand} {draft.model} {draft.color} {draft.mileage ? `${draft.mileage} km` : ''}</div>
                  <div className="mt-1 text-gray-300">{draft.items.map((item) => `${item.name} x${item.qty} = ${(item.price * item.qty).toLocaleString()}`).join(' · ')}</div>
                  <div className="mt-1">รวม {Math.max(0, total).toLocaleString()} บาท</div>
                </div>
              )
            })}
            {drafts.length > 30 && <p className="text-sm text-gray-400">แสดง 30 บิลแรกจาก {drafts.length} บิล ส่วนที่เหลือจะถูกนำเข้าด้วย</p>}
          </div>
        </>
      )}
      {/* phone file picker */}
    </div>
  )
}
