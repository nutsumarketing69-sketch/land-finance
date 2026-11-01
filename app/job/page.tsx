'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function JobPage() {
  const searchParams = useSearchParams()
  const plate = searchParams.get('plate') || ''

  const [vehicle, setVehicle] = useState<any>(null)
  const [mileage, setMileage] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!plate) return
    const fetchVehicle = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('license_plate', plate)
        .single()
      if (data) {
        setVehicle(data)
        setMileage(data.mileage?.toString() || '')
      }
    }
    fetchVehicle()
  }, [plate])

  const saveJob = async () => {
    if (!vehicle) return
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('jobs').insert({
      vehicle_id: vehicle.id,
      mileage: parseInt(mileage) || null,
      status: 'in_progress',
    })

    if (error) {
      setMessage('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('บันทึกงานสำเร็จ!')
    }
    setSaving(false)
  }

  if (!plate) return <div className="p-8">ไม่พบป้ายทะเบียน</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">บันทึกงานซ่อม</h1>

      {vehicle && (
        <div className="mb-6 p-4 border rounded bg-gray-50 text-black">
          <p><strong>ป้ายทะเบียน:</strong> {vehicle.license_plate}</p>
          <p><strong>รถ:</strong> {vehicle.brand} {vehicle.model}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block mb-1">เลขไมล์ปัจจุบัน</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1">หมายเหตุ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border p-2 rounded"
            rows={3}
          />
        </div>

        <button
          onClick={saveJob}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกงาน'}
        </button>

        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  )
}
