'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReceivePage() {
  const [plate, setPlate] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const searchVehicle = async () => {
    if (!plate.trim()) return
    setLoading(true)
    setMessage('')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customers(*)')
      .ilike('license_plate', `%${plate}%`)
      .limit(1)
      .single()

    if (error || !data) {
      setResult(null)
      setMessage('ไม่พบข้อมูลรถคันนี้')
    } else {
      setResult(data)
      setMessage('')
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">รับรถ / ค้นหาป้ายทะเบียน</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="พิมพ์ป้ายทะเบียน เช่น กข 1234"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className="flex-1 border p-2 rounded"
          onKeyDown={(e) => e.key === 'Enter' && searchVehicle()}
        />
        <button
          onClick={searchVehicle}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      {result && (
          <div className="border rounded-lg p-6 bg-white text-black">
          <h2 className="font-bold text-lg mb-2">พบข้อมูลรถ</h2>
          <p><strong>ป้ายทะเบียน:</strong> {result.license_plate}</p>
          <p><strong>ยี่ห้อ/รุ่น:</strong> {result.brand} {result.model}</p>
          <p><strong>สี:</strong> {result.color || '-'}</p>
          <p><strong>ไมล์ล่าสุด:</strong> {result.mileage?.toLocaleString() || '-'} km</p>
          <p><strong>ลูกค้า:</strong> {result.customers?.full_name || '-'}</p>
          <p><strong>เบอร์โทร:</strong> {result.customers?.phone || '-'}</p>

          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
            รับงานรถคันนี้
          </button>
        </div>
      )}
    </div>
  )
}
