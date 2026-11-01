'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReceivePage() {
  const [plate, setPlate] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showNew, setShowNew] = useState(false)
  
  const [newCustomer, setNewCustomer] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newModel, setNewModel] = useState('')

  const searchVehicle = async () => {
    if (!plate.trim()) return
    setLoading(true)
    setMessage('')
    setShowNew(false)
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
      setShowNew(true)
    } else {
      setResult(data)
      setMessage('')
    }
    setLoading(false)
  }

  const createNew = async () => {
    if (!newCustomer.trim() || !newBrand.trim()) {
      setMessage('กรุณากรอกชื่อลูกค้าและยี่ห้อรถ')
      return
    }
    const supabase = createClient()

    // เพิ่มลูกค้า
    const { data: cust } = await supabase.from('customers').insert({
      full_name: newCustomer,
      phone: newPhone || null,
    }).select().single()

    if (!cust) {
      setMessage('เพิ่มลูกค้าไม่สำเร็จ')
      return
    }

    // เพิ่มรถ
    const { error } = await supabase.from('vehicles').insert({
      license_plate: plate,
      brand: newBrand,
      model: newModel || null,
      customer_id: cust.id,
    })

    if (error) {
      setMessage('เพิ่มรถไม่สำเร็จ')
    } else {
      setMessage('เพิ่มลูกค้าและรถสำเร็จ!')
      setShowNew(false)
      searchVehicle()
    }
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
          className="flex-1 border p-2 rounded text-black"
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

      {message && <p className="mb-4">{message}</p>}

      {result && (
        <div className="border rounded-lg p-6 bg-white text-black mb-4">
          <h2 className="font-bold text-lg mb-2">พบข้อมูลรถ</h2>
          <p><strong>ป้ายทะเบียน:</strong> {result.license_plate}</p>
          <p><strong>ยี่ห้อ/รุ่น:</strong> {result.brand} {result.model}</p>
          <p><strong>สี:</strong> {result.color || '-'}</p>
          <p><strong>ไมล์ล่าสุด:</strong> {result.mileage?.toLocaleString() || '-'} km</p>
          <p><strong>ลูกค้า:</strong> {result.customers?.full_name || '-'}</p>
          <p><strong>เบอร์โทร:</strong> {result.customers?.phone || '-'}</p>

          <button 
            onClick={() => window.location.href = `/job?plate=${encodeURIComponent(result.license_plate)}`}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
          >
            รับงานรถคันนี้
          </button>
        </div>
      )}

      {showNew && (
        <div className="border rounded-lg p-6">
          <h2 className="font-bold mb-3">เพิ่มลูกค้าและรถใหม่</h2>
          <div className="space-y-2">
            <input type="text" placeholder="ชื่อลูกค้า" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} className="w-full border p-2 rounded text-black" />
            <input type="text" placeholder="เบอร์โทร" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full border p-2 rounded text-black" />
            <input type="text" placeholder="ยี่ห้อรถ" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className="w-full border p-2 rounded text-black" />
            <input type="text" placeholder="รุ่น" value={newModel} onChange={(e) => setNewModel(e.target.value)} className="w-full border p-2 rounded text-black" />
            <button onClick={createNew} className="bg-blue-600 text-white px-4 py-2 rounded">
              เพิ่มลูกค้าและรถ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
