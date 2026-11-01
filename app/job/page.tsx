'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function JobContent() {
  const searchParams = useSearchParams()
  const plate = searchParams.get('plate') || ''

  const [vehicle, setVehicle] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [mileage, setMileage] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [symptom, setSymptom] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [repair, setRepair] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState('6')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      if (plate) {
        const { data: v } = await supabase
          .from('vehicles')
          .select('*, customers(*)')
          .eq('license_plate', plate)
          .maybeSingle()
        if (v) {
          setVehicle(v)
          setMileage(v.mileage?.toString() || '')
        }
      }

      const { data: emp } = await supabase.from('employees').select('*')
      const { data: br } = await supabase.from('branches').select('*')
      setEmployees(emp || [])
      setBranches(br || [])
    }
    fetchData()
  }, [plate])

  const saveJob = async () => {
    if (!vehicle) return
    setSaving(true)
    setMessage('')

    const supabase = createClient()

    // คำนวณวันหมดประกัน
    const months = parseInt(warrantyMonths) || 0
    let warrantyUntil: string | null = null
    if (months > 0) {
      const date = new Date()
      date.setMonth(date.getMonth() + months)
      warrantyUntil = date.toISOString().split('T')[0]
    }

    const { error } = await supabase.from('jobs').insert({
      vehicle_id: vehicle.id,
      mileage: parseInt(mileage) || null,
      employee_id: employeeId || null,
      branch_id: branchId || null,
      symptom: symptom || null,
      diagnosis: diagnosis || null,
      repair: repair || null,
      warranty_months: months || null,
      warranty_until: warrantyUntil,
      status: 'in_progress',
    })

    setMessage(error ? 'บันทึกไม่สำเร็จ: ' + error.message : 'บันทึกงานสำเร็จ!')
    setSaving(false)
  }

  if (!plate) return <div className="p-8">ไม่พบป้ายทะเบียน</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">บันทึกงานซ่อม</h1>

      {vehicle && (
        <div className="mb-6 p-4 border rounded bg-white text-black">
          <p><strong>ป้ายทะเบียน:</strong> {vehicle.license_plate}</p>
          <p><strong>รถ:</strong> {vehicle.brand} {vehicle.model}</p>
          <p><strong>ลูกค้า:</strong> {vehicle.customers?.full_name || '-'}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block mb-1">เลขไมล์ปัจจุบัน</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
        </div>

        <div>
          <label className="block mb-1">พนักงานรับงาน</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">-- เลือกพนักงาน --</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">สาขา</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">อาการที่ลูกค้าแจ้ง</label>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            className="w-full border p-2 rounded text-black"
            rows={2}
            placeholder="เช่น แอร์ไม่เย็น"
          />
        </div>

        <div>
          <label className="block mb-1">ผลการตรวจ</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="w-full border p-2 rounded text-black"
            rows={2}
            placeholder="เช่น น้ำยาหมด"
          />
        </div>

        <div>
          <label className="block mb-1">สิ่งที่ซ่อม</label>
          <textarea
            value={repair}
            onChange={(e) => setRepair(e.target.value)}
            className="w-full border p-2 rounded text-black"
            rows={2}
            placeholder="เช่น เติมน้ำยา ล้างแอร์"
          />
        </div>

        <div>
          <label className="block mb-1">ระยะเวลารับประกัน (เดือน)</label>
          <select
            value={warrantyMonths}
            onChange={(e) => setWarrantyMonths(e.target.value)}
            className="w-full border p-2 rounded text-black"
          >
            <option value="0">ไม่รับประกัน</option>
            <option value="3">3 เดือน</option>
            <option value="6">6 เดือน</option>
            <option value="12">12 เดือน</option>
            <option value="24">24 เดือน</option>
          </select>
        </div>

        <button
          onClick={saveJob}
          disabled={saving || !vehicle}
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกงาน'}
        </button>

        {message && (
          <p className={`mt-4 font-medium ${message.includes('สำเร็จ') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default function JobPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <JobContent />
    </Suspense>
  )
}
