'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BRANDS: Record<string, string[]> = {
  Toyota: ['Vios', 'Yaris', 'Yaris Ativ', 'Corolla Altis', 'Corolla Cross', 'Camry', 'Fortuner', 'Hilux Revo', 'Hilux Vigo', 'Commuter', 'Hiace', 'Innova', 'Alphard', 'Veloz', 'C-HR', 'Raize', 'Avanza', 'Prius'],
  Honda: ['City', 'Civic', 'Jazz', 'Accord', 'HR-V', 'CR-V', 'BR-V', 'Freed', 'Brio', 'Mobilio', 'Odyssey'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'BT-50'],
  Nissan: ['Almera', 'March', 'Note', 'Teana', 'Navara', 'Terra', 'X-Trail', 'Urvan', 'Cefiro'],
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
const SYMPTOMS = ['แอร์ไม่เย็น', 'แอร์มีกลิ่น', 'แอร์มีเสียง', 'คอมไม่ตัด', 'น้ำยาหมด', 'รั่ว', 'ล้างแอร์', 'ตรวจเช็ค']
const KINDS = [
  ['front', 'หน้ารถ'],
  ['back', 'หลังรถ'],
  ['mileage', 'เลขไมล์'],
] as const

type Shot = { url: string; kind: string; file: File; status: 'ready' | 'sending' | 'sent' | 'failed'; note: string }

function stamp() {
  return new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
}

function shrink(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, 1280 / (img.width || 1280))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        resolve(blob || file)
      }, 'image/jpeg', 0.72)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export default function ReceivePage() {
  const [today, setToday] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [branchId, setBranchId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [plate, setPlate] = useState('')
  const [plateHits, setPlateHits] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [symptom, setSymptom] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(6)
  const [vehicleId, setVehicleId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [shots, setShots] = useState<Record<string, Shot>>({})
  const [working, setWorking] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const now = new Date()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    setToday(`${now.getFullYear()}-${m}-${d}`)
    const supabase = createClient()
    supabase.from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
    supabase.from('employees').select('*').order('name').then(({ data }) => setEmployees(data || []))
  }, [])

  const ready = KINDS.every(([kind]) => shots[kind])

  const brandHits = useMemo(() => {
    const q = brand.trim().toLowerCase()
    if (!q) return []
    return Object.keys(BRANDS).filter((b) => b.toLowerCase().startsWith(q) && b.toLowerCase() !== q).slice(0, 8)
  }, [brand])

  const modelHits = useMemo(() => {
    const list = BRANDS[brand] || Object.values(BRANDS).flat()
    const q = model.trim().toLowerCase()
    if (!q) return []
    return list.filter((item) => item.toLowerCase().includes(q) && item.toLowerCase() !== q).slice(0, 8)
  }, [brand, model])

  const loadHistory = async (id: string, plateNo: string) => {
    const supabase = createClient()
    const first = await supabase.from('jobs').select('id, status, symptom, created_at, warranty_until, branches(name)').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(20)
    const second = first.error
      ? await supabase.from('jobs').select('id, status, symptom, created_at, warranty_until').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(20)
      : null
    const billRes = await supabase.from('bills').select('id, bill_no, total, created_at, customer_name').ilike('license_plate', plateNo).order('created_at', { ascending: false }).limit(20)
    setJobs((second?.data || first.data || []) as any[])
    setBills(billRes.data || [])
  }

  const searchPlate = async (value: string) => {
    setPlate(value)
    setVehicleId('')
    if (value.trim().length < 1) {
      setPlateHits([])
      return
    }
    const supabase = createClient()
    const withCustomer = await supabase.from('vehicles').select('*, customers(full_name, phone)').ilike('license_plate', `%${value.trim()}%`).limit(8)
    const plain = withCustomer.error
      ? await supabase.from('vehicles').select('*').ilike('license_plate', `%${value.trim()}%`).limit(8)
      : null
    setPlateHits((plain?.data || withCustomer.data || []) as any[])
  }

  const pickVehicle = async (v: any) => {
    setPlate(v.license_plate || '')
    setBrand(v.brand || '')
    setModel(v.model || '')
    setColor(v.color || '')
    setMileage(v.mileage ? String(v.mileage) : '')
    setVehicleId(v.id)
    setCustomerId(v.customer_id || '')
    setCustomerName(v.customers?.full_name || '')
    setPhone(v.customers?.phone || '')
    setPlateHits([])
    await loadHistory(v.id, v.license_plate)
  }

  const addShot = (kind: string, file?: File) => {
    if (!file) return
    if (!plate.trim()) {
      setMsg('ใส่ป้ายทะเบียนก่อนถ่ายรูป จะได้ค้นรูปในกลุ่มเจอ')
      return
    }
    setDone(false)
    setShots((prev) => ({
      ...prev,
      [kind]: { url: URL.createObjectURL(file), kind, file, status: 'ready', note: 'พร้อมส่ง' },
    }))
  }

  const sendAlbum = async () => {
    const photos = KINDS.map(([kind]) => shots[kind])
    const tech = employees.find((e) => e.id === employeeId)
    const branchName = branches.find((b) => b.id === branchId)?.name || 'ไม่ระบุสาขา'
    const caption = [
      'รัษฎาแอร์',
      'รูป: หน้ารถ, หลังรถ, เลขไมล์',
      `ป้าย: ${plate.trim()}`,
      `รถ: ${brand || '-'} ${model || '-'}`,
      `สี: ${color || '-'}`,
      `ไมล์: ${mileage || '-'}`,
      `สาขา: ${branchName}`,
      `ช่าง: ${tech?.name || tech?.full_name || tech?.code || 'ไม่ระบุ'}`,
      `อาการ: ${symptom || '-'}`,
      `เวลา: ${stamp()}`,
    ].join('\n')
    const body = new FormData()
    for (let i = 0; i < photos.length; i++) {
      body.append(`photo${i}`, await shrink(photos[i].file), `car${i}.jpg`)
    }
    body.append('caption', caption)
    const res = await fetch('/telegram', { method: 'POST', body })
    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch { data = { ok: false, message: text.slice(0, 180) || `HTTP ${res.status}` } }
    const note = data.ok ? 'ส่งเข้ากลุ่มแล้ว' : (data.message || `ส่งไม่สำเร็จ ${res.status}`)
    setShots((prev) => {
      const next = { ...prev }
      KINDS.forEach(([kind]) => {
        if (next[kind]) next[kind] = { ...next[kind], status: data.ok ? 'sent' : 'failed', note }
      })
      return next
    })
    return data.ok ? '' : note
  }

  const saveJob = async () => {
    const supabase = createClient()
    let cid = customerId
    if (customerName.trim()) {
      if (cid) {
        await supabase.from('customers').update({ full_name: customerName.trim(), phone: phone || null }).eq('id', cid)
      } else {
        const created = await supabase.from('customers').insert({ full_name: customerName.trim(), phone: phone || null }).select('id')
        if (created.error) return 'บันทึกลูกค้าไม่สำเร็จ: ' + created.error.message
        cid = created.data?.[0]?.id || ''
        setCustomerId(cid)
      }
    }

    const vehicleRow: any = {
      license_plate: plate.trim(),
      brand: brand || null,
      model: model || null,
      color: color || null,
      mileage: mileage ? Number(mileage) : null,
      customer_id: cid || null,
    }
    let vid = vehicleId
    if (!vid) {
      const found = await supabase.from('vehicles').select('id').ilike('license_plate', plate.trim()).limit(1)
      vid = found.data?.[0]?.id || ''
    }
    const payloads = [
      vehicleRow,
      { license_plate: vehicleRow.license_plate, brand: vehicleRow.brand, model: vehicleRow.model, mileage: vehicleRow.mileage, customer_id: vehicleRow.customer_id },
      { license_plate: vehicleRow.license_plate, brand: vehicleRow.brand, model: vehicleRow.model, customer_id: vehicleRow.customer_id },
    ]
    let savedId = ''
    let vehicleError = ''
    for (const row of payloads) {
      const res = vid
        ? await supabase.from('vehicles').update(row).eq('id', vid).select('id')
        : await supabase.from('vehicles').insert(row).select('id')
      if (!res.error) {
        savedId = res.data?.[0]?.id || vid
        if (savedId) break
      }
      vehicleError = res.error?.message || vehicleError
    }
    if (!savedId) return 'บันทึกรถไม่สำเร็จ: ' + (vehicleError || 'ไม่พบรหัสรถ')
    vid = savedId
    setVehicleId(vid)

    let warrantyUntil: string | null = null
    if (warrantyMonths > 0) {
      const end = new Date()
      end.setMonth(end.getMonth() + warrantyMonths)
      const m = String(end.getMonth() + 1).padStart(2, '0')
      const d = String(end.getDate()).padStart(2, '0')
      warrantyUntil = `${end.getFullYear()}-${m}-${d}`
    }

    let jobPayload: any = {
      vehicle_id: vid,
      branch_id: branchId || null,
      employee_id: employeeId || null,
      symptom: symptom || null,
      status: 'in_progress',
      mileage: mileage ? Number(mileage) : null,
      warranty_until: warrantyUntil,
    }
    let jobError = ''
    for (let i = 0; i < 6; i++) {
      const res = await supabase.from('jobs').insert(jobPayload).select('id')
      if (!res.error) {
        jobError = ''
        break
      }
      jobError = res.error.message || 'บันทึกงานไม่สำเร็จ'
      if (jobError.includes('employee_id')) delete jobPayload.employee_id
      else if (jobError.includes('mileage')) delete jobPayload.mileage
      else if (jobError.includes('warranty')) delete jobPayload.warranty_until
      else if (jobError.includes('status')) jobPayload.status = 'pending'
      else if (jobError.includes('branch_id')) delete jobPayload.branch_id
      else break
    }

    localStorage.setItem('receiveDraft', JSON.stringify({
      customer: customerName,
      phone,
      plate: plate.trim(),
      car: `${brand} ${model} ${color}`.trim(),
      mileage,
      note: symptom,
    }))
    await loadHistory(vid, plate.trim())
    return jobError ? 'บันทึกรถแล้ว แต่งานซ่อมไม่เข้า: ' + jobError : ''
  }

  const finish = async () => {
    if (!plate.trim()) {
      setMsg('ใส่ป้ายทะเบียนก่อน')
      return
    }
    if (!ready) {
      setMsg('ถ่ายให้ครบ หน้ารถ หลังรถ และเลขไมล์')
      return
    }
    setWorking(true)
    setMsg('')
    let photoError = ''
    try {
      photoError = await sendAlbum()
    } catch (err: any) {
      photoError = err?.message || 'ส่งรูปไม่สำเร็จ'
    }
    const saveError = await saveJob()
    setWorking(false)
    if (!photoError && !saveError) {
      setDone(true)
      setMsg('เสร็จแล้ว บันทึกและส่งรูปทั้งชุดเข้ากลุ่ม')
    } else {
      setMsg([photoError && ('ส่งรูปไม่สำเร็จ: ' + photoError), saveError].filter(Boolean).join(' | '))
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24">
      <a href="/" className="inline-block mb-4 border border-gray-600 rounded-full px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">รับรถเข้าซ่อม</h1>
      <p className="text-sm text-gray-400 mb-4">ถ่ายให้ครบ 3 รูป แล้วกดปุ่มเดียว จบทั้งบันทึกและส่งเข้ากลุ่ม</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block text-sm text-gray-400">สาขา
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full border border-gray-600 bg-gray-800 rounded p-3 text-white">
            <option value="">เลือกสาขา</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-gray-400">ช่างที่ถ่ายรูป
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-full border border-gray-600 bg-gray-800 rounded p-3 text-white">
            <option value="">ไม่ระบุ</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name || e.full_name || e.code}</option>)}
          </select>
        </label>
      </div>

      <div className="relative mb-3">
        <input value={plate} onChange={(e) => searchPlate(e.target.value)} placeholder="ป้ายทะเบียน เช่น กก 999" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white text-lg" />
        {plateHits.length > 0 && (
          <div className="absolute z-20 bg-gray-900 border border-gray-700 w-full mt-1 rounded max-h-60 overflow-y-auto">
            {plateHits.map((v) => (
              <button key={v.id} onClick={() => pickVehicle(v)} className="block w-full text-left px-3 py-2 hover:bg-gray-800">
                <div className="font-semibold">{v.license_plate}</div>
                <div className="text-xs text-gray-400">{v.brand} {v.model} {v.color} {v.customers?.full_name || ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="ชื่อลูกค้า" className="border border-gray-600 bg-gray-800 rounded p-3 text-white" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร" className="border border-gray-600 bg-gray-800 rounded p-3 text-white" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ยี่ห้อ เช่น T" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white" />
          {brandHits.length > 0 && (
            <div className="absolute z-20 bg-gray-900 border border-gray-700 w-full mt-1 rounded">
              {brandHits.map((b) => <button key={b} onClick={() => setBrand(b)} className="block w-full text-left px-3 py-2 hover:bg-gray-800">{b}</button>)}
            </div>
          )}
        </div>
        <div className="relative">
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="รุ่น เช่น y" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white" />
          {modelHits.length > 0 && (
            <div className="absolute z-20 bg-gray-900 border border-gray-700 w-full mt-1 rounded">
              {modelHits.map((item) => <button key={item} onClick={() => setModel(item)} className="block w-full text-left px-3 py-2 hover:bg-gray-800">{item}</button>)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} className={`shrink-0 px-3 py-1 rounded-full border ${color === c ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>{c}</button>
        ))}
      </div>
      <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="สีอื่น พิมพ์เองได้" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white mb-3" />
      <input value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="เลขไมล์" inputMode="numeric" className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white mb-3" />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        {SYMPTOMS.map((s) => (
          <button key={s} onClick={() => setSymptom((old) => (old ? `${old}, ${s}` : s))} className="shrink-0 px-3 py-1 rounded-full border border-gray-600 text-sm">{s}</button>
        ))}
      </div>
      <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="อาการที่ลูกค้าแจ้ง" rows={3} className="w-full border border-gray-600 bg-gray-800 rounded p-3 text-white mb-3" />

      <label className="block text-sm text-gray-400 mb-4">รับประกัน
        <select value={warrantyMonths} onChange={(e) => setWarrantyMonths(Number(e.target.value))} className="mt-1 w-full border border-gray-600 bg-gray-800 rounded p-3 text-white">
          <option value={0}>ไม่รับประกัน</option>
          <option value={1}>1 เดือน</option>
          <option value={3}>3 เดือน</option>
          <option value={6}>6 เดือน</option>
          <option value={12}>12 เดือน</option>
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {KINDS.map(([kind, label]) => (
          <label key={kind} className="border border-dashed border-gray-600 rounded-lg p-3 text-center text-sm cursor-pointer">
            {label}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addShot(kind, e.target.files?.[0]); e.target.value = '' }} />
          </label>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {KINDS.map(([kind, label]) => (
          <div key={kind}>
            {shots[kind] ? <img src={shots[kind].url} alt={label} className="w-full h-24 object-cover rounded" /> : <div className="w-full h-24 rounded bg-gray-800" />}
            <div className={`text-xs mt-1 ${shots[kind]?.status === 'sent' ? 'text-green-400' : 'text-gray-400'}`}>{label}{shots[kind] ? ` · ${shots[kind].note}` : ''}</div>
          </div>
        ))}
      </div>

      {!ready && <p className="text-center text-gray-400 mb-4">ถ่ายหน้ารถ หลังรถ และเลขไมล์ ให้ครบ ปุ่มบันทึกจะขึ้น</p>}
      {ready && !done && (
        <button onClick={finish} disabled={working} className="w-full bg-blue-600 text-white rounded py-3 mb-3 disabled:opacity-50">
          {working ? 'กำลังบันทึกและส่งรูป...' : 'บันทึกและส่งรูป'}
        </button>
      )}
      {msg && <p className="mb-3 text-amber-300">{msg}</p>}
      <a href="/" className="block text-center border border-gray-600 rounded py-3 mb-8">กลับหน้าหลัก</a>

      <h2 className="font-semibold mb-2">ประวัติรถคันนี้</h2>
      {jobs.length === 0 && bills.length === 0 && <p className="text-gray-500 text-sm mb-4">ยังไม่มีประวัติ</p>}
      <div className="space-y-2 mb-4">
        {jobs.map((job) => {
          const until = String(job.warranty_until || '').slice(0, 10)
          const inWarranty = today && until && until >= today
          return (
            <div key={job.id} className="border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <div>{String(job.created_at || '').replace('T', ' ').slice(0, 16)} · {job.branches?.name || '-'}</div>
              <div className="text-gray-300">{job.symptom || 'ไม่ระบุอาการ'}</div>
              {until && <div className={inWarranty ? 'text-green-400' : 'text-gray-500'}>รับประกันถึง {until}{inWarranty ? ' ยังคุ้มอยู่' : ''}</div>}
            </div>
          )
        })}
      </div>
      <h2 className="font-semibold mb-2">บิลเก่า</h2>
      <div className="space-y-2">
        {bills.map((bill) => (
          <div key={bill.id} className="flex justify-between border border-gray-800 rounded-lg px-3 py-2 text-sm">
            <div>{bill.bill_no}<div className="text-xs text-gray-500">{String(bill.created_at || '').replace('T', ' ').slice(0, 16)}</div></div>
            <div>{Number(bill.total || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
