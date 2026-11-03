'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewVehiclePage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [filteredBrands, setFilteredBrands] = useState<any[]>([])
  const [filteredModels, setFilteredModels] = useState<any[]>([])
  
  const [licensePlate, setLicensePlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [selectedBrandId, setSelectedBrandId] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showBrandList, setShowBrandList] = useState(false)
  const [showModelList, setShowModelList] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: cust } = await supabase.from('customers').select('id, full_name')
      const { data: br } = await supabase.from('car_brands').select('*').order('name')
      setCustomers(cust || [])
      setBrands(br || [])
    }
    fetchData()
  }, [])

  const onBrandChange = (value: string) => {
    setBrand(value)
    setFilteredBrands(brands.filter(b => b.name.toLowerCase().includes(value.toLowerCase())))
    setShowBrandList(true)
    setModel('')
    setSelectedBrandId('')
  }

  const selectBrand = async (b: any) => {
    setBrand(b.name)
    setSelectedBrandId(b.id)
    setShowBrandList(false)
    const supabase = createClient()
    const { data } = await supabase.from('car_models').select('*').eq('brand_id', b.id).order('name')
    setModels(data || [])
    setFilteredModels(data || [])
  }

  const onModelChange = (value: string) => {
    setModel(value)
    setFilteredModels(models.filter(m => m.name.toLowerCase().includes(value.toLowerCase())))
    setShowModelList(true)
  }

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
    <div className="p-4 sm:p-8 max-w-md mx-auto pb-24">
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

        {/* ยี่ห้อ */}
        <div className="relative">
          <label className="block mb-1">ยี่ห้อ *</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            onFocus={() => setShowBrandList(true)}
            className="w-full border p-2 rounded text-black"
            placeholder="พิมพ์เพื่อค้นหา เช่น Toy"
          />
          {showBrandList && filteredBrands.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto text-black">
              {filteredBrands.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBrand(b)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {b.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* รุ่น */}
        <div className="relative">
          <label className="block mb-1">รุ่น</label>
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            onFocus={() => setShowModelList(true)}
            disabled={!selectedBrandId}
            className="w-full border p-2 rounded text-black disabled:bg-gray-200"
            placeholder={selectedBrandId ? "พิมพ์เพื่อค้นหา" : "เลือกยี่ห้อก่อน"}
          />
          {showModelList && filteredModels.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto text-black">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  onClick={() => { setModel(m.name); setShowModelList(false) }}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {m.name}
                </div>
              ))}
            </div>
          )}
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
