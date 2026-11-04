'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStaff } from '@/app/components/AuthShell'
import SectionBar from '@/app/components/SectionBar'

type Customer = {
  id: string
  full_name: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  created_at?: string | null
}

type Vehicle = {
  id: string
  customer_id: string | null
  license_plate: string | null
  brand: string | null
  model: string | null
  color: string | null
  mileage: number | string | null
}

type Bill = {
  id: string
  bill_no: string | null
  customer_name: string | null
  phone: string | null
  license_plate: string | null
  car_info: string | null
  mileage: number | string | null
  items: unknown
  discount: number | null
  total: number | null
  note: string | null
  branch_id: string | null
  created_at: string | null
  voided_at: string | null
  void_reason?: string | null
  branches?: { name?: string | null } | { name?: string | null }[] | null
}

type Counts = { customers: number; vehicles: number; bills: number; voided: number }

const PAY_LABEL: Record<string, string> = {
  cash: 'เงินสด',
  transfer: 'โอน',
  cheque: 'เช็ค',
  credit: 'ลูกหนี้เครดิต',
  unspecified: 'ไม่ระบุ',
}

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || ''
  const year = pick('year')
  const month = pick('month')
  const day = pick('day')
  const hour = pick('hour')
  const minute = pick('minute')
  return {
    iso: `${year}-${month}-${day}`,
    clock: `${hour}:${minute}`,
    file: `${year}${month}${day}-${hour}${minute}`,
    thai: `${day}/${month}/${Number(year) + 543} ${hour}:${minute}`,
  }
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.slice(0, 10).split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${Number(year) + 543}`
}

function bangkokDay(iso: string) {
  if (!iso) return ''
  const stamp = bangkokParts(new Date(iso))
  return stamp.iso
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function money(value: unknown) {
  const n = Number(value || 0)
  return Math.round(n * 100) / 100
}

function asItems(raw: unknown) {
  if (Array.isArray(raw)) return raw as { name?: string; qty?: number; price?: number; supplier?: string }[]
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

function unpackNote(raw: string) {
  const source = String(raw || '')
  const marker = source.lastIndexOf('[[meta]]')
  let body = marker >= 0 ? source.slice(0, marker) : source
  let meta: Record<string, unknown> = {}
  if (marker >= 0) {
    try { meta = JSON.parse(source.slice(marker + 8)) || {} } catch { meta = {} }
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

function branchNameOf(bill: Bill, branches: Map<string, string>) {
  const joined = Array.isArray(bill.branches) ? bill.branches[0]?.name : bill.branches?.name
  return text(joined) || branches.get(bill.branch_id || '') || ''
}

function sheet(rows: unknown[][], widths: number[]) {
  return { rows, widths }
}

async function fetchPages(table: string, columns: string, order = 'id') {
  const supabase = createClient()
  const rows: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from(table).select(columns).order(order, { ascending: true })
    if (order !== 'id' && columns.includes('id')) query = query.order('id', { ascending: true })
    const res = await query.range(offset, offset + 999)
    if (res.error) throw new Error(res.error.message)
    const page = (res.data || []) as unknown as Record<string, unknown>[]
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

async function loadCustomers() {
  try {
    return await fetchPages('customers', 'id, full_name, phone, address, tax_id, created_at', 'full_name') as Customer[]
  } catch {
    return await fetchPages('customers', 'id, full_name, phone, address, tax_id', 'full_name') as Customer[]
  }
}

async function loadBills() {
  const withBranch = 'id, bill_no, customer_name, phone, license_plate, car_info, mileage, items, discount, total, note, branch_id, created_at, voided_at, void_reason, branches(name)'
  const plain = 'id, bill_no, customer_name, phone, license_plate, car_info, mileage, items, discount, total, note, branch_id, created_at, voided_at, void_reason'
  const older = 'id, bill_no, customer_name, phone, license_plate, car_info, mileage, items, discount, total, note, branch_id, created_at, voided_at'
  try {
    return await fetchPages('bills', withBranch, 'created_at') as Bill[]
  } catch {
    try {
      return await fetchPages('bills', plain, 'created_at') as Bill[]
    } catch {
      return await fetchPages('bills', older, 'created_at') as Bill[]
    }
  }
}

export default function BackupPage() {
  const { account, ready } = useStaff()
  const admin = account?.role === 'admin' && account.status === 'approved'
  const [counts, setCounts] = useState<Counts | null>(null)
  const [msg, setMsg] = useState('')
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ready || !admin) return
    const supabase = createClient()
    void (async () => {
      const [customers, vehicles, bills, voided] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('bills').select('id', { count: 'exact', head: true }),
        supabase.from('bills').select('id', { count: 'exact', head: true }).not('voided_at', 'is', null),
      ])
      if (customers.error || vehicles.error || bills.error) {
        setMsg(customers.error?.message || vehicles.error?.message || bills.error?.message || 'นับข้อมูลไม่สำเร็จ')
        return
      }
      setCounts({
        customers: customers.count || 0,
        vehicles: vehicles.count || 0,
        bills: bills.count || 0,
        voided: voided.count || 0,
      })
    })()
  }, [ready, admin])

  const exportFile = async () => {
    if (!admin) {
      setMsg('สำรองข้อมูลทำได้เฉพาะผู้ดูแลระบบ')
      return
    }
    setBusy(true)
    setMsg('')
    setProgress('กำลังอ่านข้อมูลจริงจากร้าน')
    try {
      const [customers, vehicles, branches, bills] = await Promise.all([
        loadCustomers(),
        fetchPages('vehicles', 'id, customer_id, license_plate, brand, model, color, mileage', 'license_plate') as Promise<Vehicle[]>,
        fetchPages('branches', 'id, name', 'name'),
        loadBills(),
      ])
      const branchMap = new Map(branches.map((row) => [String(row.id), text(row.name)]))
      const customerMap = new Map(customers.map((row) => [row.id, row]))
      const byName = new Map<string, Customer>()
      customers.forEach((row) => {
        const key = text(row.full_name).replace(/\s+/g, '').toLowerCase()
        if (key && !byName.has(key)) byName.set(key, row)
      })
      const plates = new Map<string, string[]>()
      vehicles.forEach((row) => {
        const id = row.customer_id || ''
        const plate = text(row.license_plate)
        if (!id || !plate) return
        const list = plates.get(id) || []
        list.push(plate)
        plates.set(id, list)
      })

      const stamp = bangkokParts()
      const customerRows: unknown[][] = [[
        'ชื่อลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'เลขผู้เสียภาษี', 'จำนวนรถ', 'ป้ายทะเบียน', 'รหัสลูกค้า',
      ]]
      customers.forEach((row) => {
        const cars = plates.get(row.id) || []
        customerRows.push([
          text(row.full_name),
          text(row.phone),
          text(row.address),
          text(row.tax_id),
          cars.length,
          cars.join(', '),
          row.id,
        ])
      })

      const carRows: unknown[][] = [[
        'ป้ายทะเบียน', 'ยี่ห้อ', 'รุ่น', 'สี', 'เลขไมล์', 'ชื่อลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'เลขผู้เสียภาษี', 'รหัสลูกค้า',
      ]]
      vehicles.forEach((row) => {
        const owner = row.customer_id ? customerMap.get(row.customer_id) : undefined
        carRows.push([
          text(row.license_plate),
          text(row.brand),
          text(row.model),
          text(row.color),
          row.mileage == null || row.mileage === '' ? '' : Number(row.mileage),
          text(owner?.full_name),
          text(owner?.phone),
          text(owner?.address),
          text(owner?.tax_id),
          row.customer_id || '',
        ])
      })

      const billRows: unknown[][] = [[
        'เลขที่บิล', 'วันที่', 'วันที่ไทย', 'สาขา', 'ชื่อลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'เลขผู้เสียภาษี',
        'ยี่ห้อ', 'รุ่น', 'สี', 'ป้ายทะเบียน', 'เลขไมล์', 'รายการทั้งหมด', 'จำนวนรายการ',
        'ยอดรวม', 'ส่วนลด', 'รวมทั้งสิ้น', 'ชำระโดย', 'ช่าง', 'รับประกันเดือน', 'สถานะ', 'เหตุผลยกเลิก', 'หมายเหตุ', 'รหัสบิล',
      ]]
      const lineRows: unknown[][] = [[
        'เลขที่บิล', 'วันที่', 'สาขา', 'ชื่อลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'เลขผู้เสียภาษี',
        'ยี่ห้อ', 'รุ่น', 'ป้ายทะเบียน', 'เลขไมล์', 'สี', 'รายการ', 'จำนวน', 'ราคา', 'จำนวนเงิน',
        'ส่วนลด', 'หมายเหตุ', 'ช่าง', 'สถานะ', 'เหตุผลยกเลิก', 'ชำระโดย', 'รับประกันเดือน', 'ซื้อจาก', 'รหัสบิล',
      ]]

      let liveTotal = 0
      let lineCount = 0
      bills.forEach((bill) => {
        const packed = unpackNote(text(bill.note))
        const meta = packed.meta
        const owner = byName.get(text(bill.customer_name).replace(/\s+/g, '').toLowerCase())
        const sign = text(meta.signDate)
        const day = sign || bangkokDay(text(bill.created_at))
        const brand = text(meta.brand)
        const model = text(meta.model)
        const color = text(meta.color)
        const payType = text(meta.payType)
        const pay = text(meta.payLabel) || PAY_LABEL[payType] || ''
        const tech = text(meta.technician)
        const address = text(meta.customerAddress) || text(owner?.address)
        const tax = text(meta.customerTax) || text(owner?.tax_id)
        const phone = text(bill.phone) || text(owner?.phone)
        const items = asItems(bill.items)
        const subtotal = items.reduce((sum, item) => sum + money(item.price) * Number(item.qty || 1), 0)
        const discount = money(bill.discount)
        const total = money(bill.total)
        const voided = Boolean(bill.voided_at)
        const status = voided ? 'ยกเลิก' : 'ใช้งาน'
        if (!voided) liveTotal += total
        const names = items.map((item) => text(item.name)).filter(Boolean).join(' | ')
        billRows.push([
          text(bill.bill_no),
          day,
          thaiFromIso(day),
          branchNameOf(bill, branchMap),
          text(bill.customer_name),
          phone,
          address,
          tax,
          brand,
          model || text(bill.car_info),
          color,
          text(bill.license_plate),
          bill.mileage == null || bill.mileage === '' ? '' : Number(bill.mileage),
          names,
          items.length,
          money(subtotal || total + discount),
          discount,
          total,
          pay,
          tech,
          packed.warranty || '',
          status,
          text(bill.void_reason),
          packed.note,
          bill.id,
        ])
        const shared = [
          text(bill.bill_no),
          day,
          branchNameOf(bill, branchMap),
          text(bill.customer_name),
          phone,
          address,
          tax,
          brand,
          model || text(bill.car_info),
          text(bill.license_plate),
          bill.mileage == null || bill.mileage === '' ? '' : Number(bill.mileage),
          color,
        ]
        const tail = [
          discount,
          packed.note,
          tech,
          status,
          text(bill.void_reason),
          pay,
          packed.warranty || '',
        ]
        if (!items.length) {
          lineRows.push([...shared, '', '', '', '', ...tail, '', bill.id])
          lineCount += 1
        } else {
          items.forEach((item) => {
            const qty = Number(item.qty || 1)
            const price = money(item.price)
            lineRows.push([...shared, text(item.name), qty, price, money(price * qty), ...tail, text(item.supplier), bill.id])
            lineCount += 1
          })
        }
      })

      const guide = sheet([
        ['สำรองข้อมูลรัษฎาแอร์'],
        ['เวลาส่งออก', `${stamp.thai} น. ตามเวลาประเทศไทย`],
        ['ผู้ส่งออก', text(account?.full_name)],
        ['ลูกค้า', customers.length],
        ['รถ', vehicles.length],
        ['บิลทั้งหมด', bills.length],
        ['บิลที่ยกเลิก', bills.filter((bill) => bill.voided_at).length],
        ['แถวรายการ', lineCount],
        ['ยอดบิลที่ยังใช้งาน', money(liveTotal)],
        [],
        ['ชีตในไฟล์นี้'],
        ['ลูกค้า', 'ชื่อ เบอร์ ที่อยู่ เลขภาษี และป้ายรถของลูกค้าแต่ละคน'],
        ['รถ', 'ป้าย ยี่ห้อ รุ่น สี เลขไมล์ และเจ้าของรถ'],
        ['บิล', 'หนึ่งแถวต่อหนึ่งบิล อ่านยอดและสถานะได้ทันที'],
        ['รายการบิล', 'หนึ่งแถวต่อหนึ่งรายการในบิล ใช้เปิดดูหรือส่งต่อเข้าระบบอื่น'],
        [],
        ['ถ้านำไฟล์นี้กลับเข้าหน้านำเข้าบิลของร้านนี้'],
        ['ใช้ชีตรายการบิล หัวตารางตรงกับระบบนำเข้าอยู่แล้ว'],
        ['ลบแถวที่คอลัมน์สถานะเป็น ยกเลิก ออกก่อนนำเข้า ระบบนำเข้าจะถือว่าเป็นบิลใช้งาน'],
        ['บิลเดิมที่รายการและยอดตรงกันจะไม่ถูกใส่ซ้ำ'],
        ['ข้อมูลในไฟล์นี้คือข้อมูลจริงตอนกดส่งออก ไม่มีแถวตัวอย่าง'],
      ], [28, 72])

      const bookParts = [
        ['คำอธิบาย', guide],
        ['ลูกค้า', sheet(customerRows, [28, 16, 42, 18, 12, 36, 38])],
        ['รถ', sheet(carRows, [18, 16, 18, 12, 12, 28, 16, 42, 18, 38])],
        ['บิล', sheet(billRows, [14, 12, 14, 16, 24, 14, 36, 16, 14, 16, 10, 18, 12, 40, 12, 12, 12, 12, 14, 16, 14, 12, 24, 36, 38])],
        ['รายการบิล', sheet(lineRows, [14, 12, 16, 24, 14, 36, 16, 14, 16, 18, 12, 10, 28, 10, 12, 12, 12, 28, 16, 12, 24, 14, 14, 18, 38])],
      ]
      setProgress('กำลังสร้างไฟล์ Excel')
      const loaded = await import('xlsx')
      const book = loaded.utils.book_new()
      bookParts.forEach(([name, table]) => {
        const data = table as { rows: unknown[][]; widths: number[] }
        const ws = loaded.utils.aoa_to_sheet(data.rows)
        ws['!cols'] = data.widths.map((wch) => ({ wch }))
        if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] }
        loaded.utils.book_append_sheet(book, ws, String(name))
      })
      const filename = `ratsada-backup-${stamp.file}.xlsx`
      loaded.writeFile(book, filename)
      setProgress('')
      setMsg(`ดาวน์โหลด ${filename} แล้ว ลูกค้า ${customers.length} รถ ${vehicles.length} บิล ${bills.length} รายการ ${lineCount}`)
    } catch (error) {
      setProgress('')
      setMsg(error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ')
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <SectionBar desk="shop" />
      <h1 className="text-2xl font-bold">สำรองข้อมูล</h1>
      <p className="mt-2 text-sm leading-6 text-gray-300">
        ส่งออกข้อมูลจริงของร้านเป็นไฟล์ Excel ไฟล์เดียว เปิดใน Excel หรือ Google Sheets ได้ทันที
        มีลูกค้า รถ ประวัติบิล และรายการในบิลครบตามที่บันทึกไว้ในระบบ เก็บไฟล์ไว้ หรือส่งต่อเข้าระบบอื่นได้จากหัวตารางภาษาไทย
      </p>
      {ready && !admin && <p className="mt-4 text-amber-200">สำรองข้อมูลทำได้เฉพาะผู้ดูแลระบบ</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['ลูกค้า', counts?.customers],
          ['รถ', counts?.vehicles],
          ['บิลทั้งหมด', counts?.bills],
          ['บิลที่ยกเลิก', counts?.voided],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-700 bg-gray-900 px-3 py-4">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value == null ? '...' : Number(value).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void exportFile()}
        disabled={busy || !admin}
        className="mt-5 w-full rounded-xl bg-red-600 px-5 py-4 text-lg font-semibold disabled:opacity-50 sm:w-auto"
      >
        {busy ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
      </button>
      {progress && <p className="mt-3 text-sm text-gray-300">{progress}</p>}
      {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
      <div className="mt-6 space-y-2 text-sm leading-6 text-gray-300">
        <p>ชีตลูกค้าและชีตรถ คือข้อมูลลูกค้าที่บันทึกไว้ในระบบตอนกดส่งออก</p>
        <p>ชีตบิลคือหนึ่งแถวต่อหนึ่งใบ ดูยอด ส่วนลด ช่าง วันที่ยกเลิก และหมายเหตุได้เลย</p>
        <p>ชีตรายการบิลคือหนึ่งแถวต่อหนึ่งรายการ หัวตารางใช้กับหน้านำเข้าบิลของร้านนี้ได้ ก่อนนำเข้าให้เอาแถวสถานะ “ยกเลิก” ออก</p>
      </div>
    </div>
  )
}
// สำรองข้อมูลลูกค้าและบิลจากระบบจริง
