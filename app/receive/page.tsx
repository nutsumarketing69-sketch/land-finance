'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BRANDS = ['Toyota', 'Honda', 'Isuzu', 'Mazda', 'Mitsubishi', 'Nissan', 'Ford', 'MG', 'Suzuki', 'Hyundai', 'Kia', 'Chevrolet', 'Mercedes-Benz', 'BMW', 'Volvo', 'Hino', 'Yamaha', 'GPX']
const QUICK = ['แอร์ไม่เย็น', 'แอร์มีกลิ่น', 'น้ำยาแอร์หมด', 'คอมเพรสเซอร์ไม่ทำงาน', 'ท่อน้ำยารั่ว', 'เย็นไม่สม่ำเสมอ', 'เสียงดัง', 'น้ำแอร์หยด']

export default function ReceivePage() {
  const [plate, setPlate] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [mileage, setMileage] = useState('')
  const [symptom, setSymptom] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState(6)
  const [employeeId, setEmployeeId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('employees').select('id, full_name').order('full_name').then(({ data }) => setEmployees(data || []))
    supabase.from('branches').select('id, name').order('name').then(({ data }) => setBranches(data || []))
  }, [])

  const searchPlate = async () => {
    if (!plate.trim()) return
    setSearching(true)
    setMsg('')
    const supabase = createClient()
    const { data } = await supabase
      .from('vehicles')
      .select('*, customers(*)')
      .ilike('license_plate', `%${plate.trim()}%`)
      .limit(8)
    const list = data || []
    setResults(list)
    if (list.length === 1) await selectVehicle(list[0])
    setSearching(false)
  }

  const selectVehicle = async (v: any) => {
    setVehicleId(v.id)
    setCustomerId(v.customer_id || v.customers?.id || null)
    setPlate(v.license_plate || '')
    setCustomerName(v.customers?.full_name || '')
    setPhone(v.customers?.phone || '')
    setBrand(v.brand || '')
    setModel(v.model || '')
    setColor(v.color || '')
    setMileage(v.mileage ? String(v.mileage) : '')
    setResults([])
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .select('*, employees(full_name), branches(name)')
      .eq('vehicle_id', v.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setHistory(data || [])
  }

  const startNew = () => {
    setVehicleId(null)
    setCustomerId(null)
    setCustomerName('')
    setPhone('')
    setBrand('')
    setModel('')
    setColor('')
    setMileage('')
    setHistory([])
    setResults([])
    setMsg('กรอกเป็นรถใหม่ได้เลย')
  }

  const activeWarranty = history.find((job) => job.warranty_until && new Date(job.warranty_until) >= new Date())

  const saveJob = async () => {
    if (!plate.trim()) {
      setMsg('กรอกป้ายทะเบียน')
      return
    }
    setSaving(true)
    setMsg('')
    const supabase = createClient()
    let cid = customerId
    let vid = vehicleId

    if (!cid && customerName.trim()) {
      const { data, error } = await supabase
        .from('customers')
        .insert({ full_name: customerName.trim(), phone: phone.trim() || null })
        .select('id')
        .single()
      if (error || !data) {
        setMsg('บันทึกลูกค้าไม่สำเร็จ')
        setSaving(false)
        return
      }
      cid = data.id
      setCustomerId(cid)
    }

    const vehiclePayload = {
      license_plate: plate.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      color: color.trim() || null,
      mileage: parseInt(mileage) || null,
      customer_id: cid,
    }

    if (!vid) {
      const { data, error } = await supabase.from('vehicles').insert(vehiclePayload).select('id').single()
      if (error || !data) {
        setMsg('บันทึกรถไม่สำเร็จ')
        setSaving(false)
        return
      }
      vid = data.id
      setVehicleId(vid)
    } else {
      await supabase.from('vehicles').update(vehiclePayload).eq('id', vid)
    }

    let warrantyUntil: string | null = null
    if (warrantyMonths > 0) {
      const d = new Date()
      d.setMonth(d.getMonth() + warrantyMonths)
      warrantyUntil = d.toISOString()
    }

    const { error: jobError } = await supabase.from('jobs').insert({
      vehicle_id: vid,
      branch_id: branchId || null,
      employee_id: employeeId || null,
      mileage: parseInt(mileage) || null,
      symptom: symptom.trim() || null,
      status: 'in_progress',
      warranty_months: warrantyMonths,
      warranty_until: warrantyUntil,
    })

    if (jobError) {
      setMsg('บันทึกงานไม่สำเร็จ')
      setSaving(false)
      return
    }

    setMsg('รับรถเรียบร้อย')
    setSymptom('')
    const { data } = await supabase
      .from('jobs')
      .select('*, employees(full_name), branches(name)')
      .eq('vehicle_id', vid)
      .order('created_at', { ascending: false })
      .limit(8)
    setHistory(data || [])
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">รับรถ</h1>
      <p className="text-sm text-gray-400 mb-5">พิมพ์ป้ายทะเบียน ถ้าเคยเข้าจะขึ้นประวัติและประกันให้เลย</p>

      <div className="flex gap-2 mb-4">
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchPlate()}
          placeholder="ป้ายทะเบียน"
          className="flex-1 border border-gray-600 bg-gray-800 rounded p-3 text-white"
        />
        <button onClick={searchPlate} disabled={searching} className="bg-blue-600 px-4 rounded disabled:opacity-50">
          {searching ? '...' : 'ค้นหา'}
        </button>
        <button onClick={startNew} className="bg-gray-700 px-4 rounded">รถใหม่</button>
      </div>

      {results.length > 0 && (
        <div className="mb-4 border border-gray-700 rounded-lg overflow-hidden">
          {results.map((v) => (
            <button key={v.id} onClick={() => selectVehicle(v)} className="block w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800">
              <div className="font-semibold">{v.license_plate}</div>
              <div className="text-sm text-gray-400">{v.brand} {v.model} | {v.customers?.full_name || 'ไม่ระบุลูกค้า'}</div>
            </button>
          ))}
        </div>
      )}

      {activeWarranty && (
        <div className="mb-4 rounded-lg bg-blue-950 border border-blue-700 px-4 py-3 text-sm">
          รถคันนี้อยู่ในประกันถึง {new Date(activeWarranty.warranty_until).toLocaleDateString('th-TH')}
          {activeWarranty.repair ? ` — ซ่อมล่าสุด: ${activeWarranty.repair}` : ''}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="ชื่อลูกค้า" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input list="brands" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ยี่ห้อ" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <datalist id="brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="รุ่น" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="สี" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <input value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="เลขไมล์" className="border border-gray-600 bg-gray-800 rounded p-2 text-white" />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
          <option value="">สาขา</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
          <option value="">พนักงานรับงาน</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <select value={warrantyMonths} onChange={(e) => setWarrantyMonths(Number(e.target.value))} className="border border-gray-600 bg-gray-800 rounded p-2 text-white">
          <option value={0}>ไม่รับประกัน</option>
          <option value={1}>ประกัน 1 เดือน</option>
          <option value={3}>ประกัน 3 เดือน</option>
          <option value={6}>ประกัน 6 เดือน</option>
          <option value={12}>ประกัน 12 เดือน</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => setSymptom((s) => (s ? `${s}, ${q}` : q))} className="text-xs bg-gray-800 border border-gray-600 rounded-full px-3 py-1">
            {q}
          </button>
        ))}
      </div>
      <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="อาการที่ลูกค้าแจ้ง" rows={3} className="w-full border border-gray-600 bg-gray-800 rounded p-2 text-white mb-4" />

      <div className="flex flex-wrap gap-3">
        <button onClick={saveJob} disabled={saving} className="bg-green-600 px-5 py-2 rounded disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : 'บันทึกรับรถ'}
        </button>
        <a href="/receipt" className="bg-blue-600 px-5 py-2 rounded">ไปออกบิล</a>
        <a href={`/history?plate=${encodeURIComponent(plate)}`} className="bg-gray-700 px-5 py-2 rounded">ดูประวัติเต็ม</a>
      </div>
      {msg && <p className="mt-3 text-sm">{msg}</p>}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-3">เข้ามาแล้ว {history.length} ครั้งล่าสุด</h2>
          <div className="space-y-2">
            {history.map((job) => (
              <div key={job.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900 text-sm">
                <div className="flex justify-between">
                  <span>{new Date(job.created_at).toLocaleDateString('th-TH')}</span>
                  <span className="text-gray-400">{job.branches?.name || '-'} | {job.employees?.full_name || '-'}</span>
                </div>
                <div className="text-gray-300 mt-1">{job.symptom || job.repair || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
