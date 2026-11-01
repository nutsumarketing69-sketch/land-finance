'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setLoading(true)
    setSearched(true)

    const supabase = createClient()
    const q = `%${keyword.trim()}%`

    // ค้นหาจากหลายตารางพร้อมกัน
    const [vehiclesRes, customersRes, jobsRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, customers(full_name, phone)')
        .or(`license_plate.ilike.${q},brand.ilike.${q},model.ilike.${q},color.ilike.${q}`)
        .limit(10),

      supabase
        .from('customers')
        .select('*')
        .or(`full_name.ilike.${q},phone.ilike.${q}`)
        .limit(10),

      supabase
        .from('jobs')
        .select('*, vehicles(license_plate, brand, model), employees(full_name)')
        .or(`symptom.ilike.${q},diagnosis.ilike.${q},repair.ilike.${q}`)
        .limit(10),
    ])

    const combined = [
      ...(vehiclesRes.data || []).map((v) => ({ type: 'vehicle', data: v })),
      ...(customersRes.data || []).map((c) => ({ type: 'customer', data: c })),
      ...(jobsRes.data || []).map((j) => ({ type: 'job', data: j })),
    ]

    setResults(combined)
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ค้นหาขั้นสูง</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="ค้นหา ป้ายทะเบียน, ชื่อลูกค้า, เบอร์โทร, ยี่ห้อรถ, อาการ..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border border-gray-600 bg-gray-800 p-3 rounded text-white placeholder-gray-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="text-gray-400 text-center py-8">ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>
      )}

      <div className="space-y-3">
        {results.map((item, index) => {
          if (item.type === 'vehicle') {
            const v = item.data
            return (
              <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex justify-between">
                  <div>
                    <span className="text-xs bg-blue-700 px-2 py-0.5 rounded">รถ</span>
                    <div className="font-semibold mt-1">{v.license_plate}</div>
                    <div className="text-sm text-gray-400">{v.brand} {v.model} {v.color && `(${v.color})`}</div>
                    <div className="text-sm text-gray-400">ลูกค้า: {v.customers?.full_name || '-'}</div>
                  </div>
                  <a href={`/job?plate=${encodeURIComponent(v.license_plate)}`} className="text-blue-400 text-sm self-center">
                    รับงาน →
                  </a>
                </div>
              </div>
            )
          }

          if (item.type === 'customer') {
            const c = item.data
            return (
              <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <span className="text-xs bg-green-700 px-2 py-0.5 rounded">ลูกค้า</span>
                <div className="font-semibold mt-1">{c.full_name}</div>
                <div className="text-sm text-gray-400">{c.phone || '-'}</div>
              </div>
            )
          }

          if (item.type === 'job') {
            const j = item.data
            return (
              <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <span className="text-xs bg-purple-700 px-2 py-0.5 rounded">งานซ่อม</span>
                <div className="font-semibold mt-1">{j.vehicles?.license_plate || '-'}</div>
                <div className="text-sm text-gray-400">
                  {j.vehicles?.brand} {j.vehicles?.model}
                </div>
                <div className="text-sm mt-1">{j.repair || j.symptom || '-'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(j.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
