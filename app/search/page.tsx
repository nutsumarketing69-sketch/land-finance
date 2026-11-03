'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [capped, setCapped] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = async (value = keyword) => {
    const word = value.trim().replace(/[,()%_]/g, '')
    if (!word) {
      setResults([])
      setSearched(false)
      setCapped(false)
      return
    }
    setLoading(true)
    setSearched(true)

    const supabase = createClient()
    const q = `%${word}%`

    const [vehiclesRes, customersRes, billsRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, customers(full_name, phone, address)')
        .or(`license_plate.ilike.${q},brand.ilike.${q},model.ilike.${q},color.ilike.${q}`)
        .limit(40),

      supabase
        .from('customers')
        .select('id, full_name, phone, address, tax_id')
        .or(`full_name.ilike.${q},phone.ilike.${q},address.ilike.${q},tax_id.ilike.${q}`)
        .limit(30),

      supabase
        .from('bills')
        .select('id, bill_no, customer_name, phone, license_plate, car_info, total, created_at')
        .or(`license_plate.ilike.${q},customer_name.ilike.${q},car_info.ilike.${q},bill_no.ilike.${q}`)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const vehicles = vehiclesRes.data || []
    const customers = customersRes.data || []
    const bills = billsRes.data || []
    setCapped(vehicles.length >= 40 || customers.length >= 30 || bills.length >= 30)
    setResults([
      ...vehicles.map((v) => ({ type: 'vehicle', data: v })),
      ...customers.map((c) => ({ type: 'customer', data: c })),
      ...bills.map((b) => ({ type: 'bill', data: b })),
    ])
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <a href="/" className="inline-block mb-4 border border-gray-600 rounded-full px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold mb-2">ค้นหาขั้นสูง</h1>
      <p className="text-sm text-gray-400 mb-4">พิมพ์ตัวเดียวก็ขึ้น ทั้งป้าย ชื่อ เบอร์ ยี่ห้อ และบิล</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="เช่น ก หรือ 1 หรือ ชื่อลูกค้า"
          value={keyword}
          onChange={(e) => {
            const value = e.target.value
            setKeyword(value)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => handleSearch(value), 250)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border border-gray-600 bg-gray-800 p-3 rounded text-white text-lg placeholder-gray-400"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-medium disabled:opacity-50"
        >
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {capped && <p className="text-amber-300 text-sm mb-3">แสดงเฉพาะชุดแรก พิมพ์เพิ่มอีกตัวเพื่อให้แคบลง</p>}

      {searched && results.length === 0 && !loading && (
        <p className="text-gray-400 text-center py-8">ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>
      )}

      <div className="space-y-3">
        {results.map((item, index) => {
          if (item.type === 'vehicle') {
            const v = item.data
            return (
              <div key={`v-${v.id || index}`} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <span className="text-xs bg-blue-700 px-2 py-0.5 rounded">รถ</span>
                <div className="font-semibold mt-1 break-words">{v.license_plate}</div>
                <div className="text-sm text-gray-400">{v.brand} {v.model} {v.color && `(${v.color})`}</div>
                <div className="text-sm text-gray-400">ลูกค้า: {v.customers?.full_name || '-'}</div>
                <div className="text-sm text-gray-400">{v.customers?.phone || ''}</div>
                {v.customers?.address ? <div className="text-sm text-gray-400 break-words">{v.customers.address}</div> : null}
                <div className="flex flex-wrap gap-4 mt-2">
                  <a href={`/receive?plate=${encodeURIComponent(v.license_plate || '')}`} className="text-blue-300 py-1">รับรถ</a>
                  <a href={`/history?plate=${encodeURIComponent(v.license_plate || '')}`} className="text-amber-300 py-1">ประวัติ</a>
                </div>
              </div>
            )
          }

          if (item.type === 'customer') {
            const c = item.data
            return (
              <a key={`c-${c.id || index}`} href={`/customers?q=${encodeURIComponent(c.full_name || '')}`} className="block border border-gray-700 rounded-lg p-4 bg-gray-900">
                <span className="text-xs bg-green-700 px-2 py-0.5 rounded">ลูกค้า</span>
                <div className="font-semibold mt-1 break-words">{c.full_name}</div>
                <div className="text-sm text-gray-400">{c.phone || '-'}</div>
                {c.address ? <div className="text-sm text-gray-300 break-words">{c.address}</div> : null}
                {c.tax_id ? <div className="text-sm text-gray-400">เลขผู้เสียภาษี {c.tax_id}</div> : null}
              </a>
            )
          }

          if (item.type === 'bill') {
            const b = item.data
            return (
              <a key={`b-${b.id || index}`} href={`/history?plate=${encodeURIComponent(b.license_plate || '')}`} className="block border border-gray-700 rounded-lg p-4 bg-gray-900">
                <span className="text-xs bg-purple-700 px-2 py-0.5 rounded">บิล</span>
                <div className="font-semibold mt-1 break-words">{b.license_plate || '-'} {b.customer_name || ''}</div>
                <div className="text-sm text-gray-400 break-words">{b.car_info || ''}</div>
                <div className="text-sm mt-1">{Number(b.total || 0).toLocaleString()} บาท</div>
                <div className="text-xs text-gray-500 mt-1">{(b.created_at || '').slice(0, 10)} · {b.bill_no || ''}</div>
              </a>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
