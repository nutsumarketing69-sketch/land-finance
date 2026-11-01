'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewVehiclePage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [licensePlate, setLicensePlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchCustomers = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('customers').select('id, full_name')
      setCustomers(data || [])
    }
    fetchCustomers()
  }, [])

  const saveVehicle = async () => {
    if (!licensePlate.trim() || !brand.trim()) {
      setMessage('กรุณากรอกป้ายทะเบียนและยี่ห้อ')
      return
    }
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('vehicles').insert({
      license_plate: licensePlate,
      brand,
      model: model || null,
      color: color || null,
      customer_id: customerId || null,
    })

    if (error) {
      setMessage('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('เพิ่มรถสำเร็จ!')
      setLicensePlate('')
      setBrand('')
      setModel('')
      setColor('')
    }
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">เพิ่มรถใหม่</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">ป้ายทะเบียน *</label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น กข 1234"
          />
        </div>

        <div>
          <label className="block mb-1">ยี่ห้อ *</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น Toyota"
          />
        </div>

        <div>
          <label className="block mb-1">รุ่น</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น Camry"
          />
        </div>

        <div>
          <label className="block mb-1">สี</label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น ขาว"
          />
        </div>

        <div>
          <label className="block mb-1">ลูกค้า</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">-- เลือกลูกค้า --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={saveVehicle}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกรถ'}
        </button>

        {message && (
          <p className={`mt-4 text-center ${message.includes('สำเร็จ') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
