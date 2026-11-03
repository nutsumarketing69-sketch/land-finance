'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { useAccess } from '@/app/components/AuthShell'

function dayText(value: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
}

function HistoryContent() {
  const searchParams = useSearchParams()
  const { showPrice } = useAccess()
  const [plate, setPlate] = useState(searchParams.get('plate') || '')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [capped, setCapped] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchHistory = async (value = plate) => {
    const q = value.trim().replace(/[%_]/g, '')
    if (!q) return
    setLoading(true)
    setSearched(true)
    const supabase = createClient()
    const [vehicleRes, billRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, customers(full_name, phone, address)')
        .ilike('license_plate', `%${q}%`)
        .order('license_plate')
        .limit(40),
      supabase
        .from('bills')
        .select('id, bill_no, customer_name, phone, license_plate, car_info, mileage, total, created_at, items, voided_at, void_reason')
        .ilike('license_plate', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(40),
    ])
    const cars = vehicleRes.data || []
    const visits = billRes.data || []
    setVehicles(cars)
    setBills(visits)
    setCapped(cars.length >= 40 || visits.length >= 40)
    setLoading(false)
  }

  useEffect(() => {
    const initial = searchParams.get('plate') || ''
    if (initial.trim()) searchHistory(initial)
  }, [])

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto pb-24">
      <a href="/" className="inline-block mb-4 border border-gray-600 rounded-full px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold mb-4">ประวัติรถ</h1>
      <p className="text-sm text-gray-400 mb-4">พิมพ์เลขในป้าย แม้แค่ตัวเดียว แล้วเลือกคันที่ต้องการ</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          placeholder="เช่น 1 หรือ กก 999"
          value={plate}
          onChange={(e) => {
            const value = e.target.value
            setPlate(value)
            if (timer.current) clearTimeout(timer.current)
            if (value.trim().length >= 1) timer.current = setTimeout(() => searchHistory(value), 250)
          }}
          className="flex-1 border border-gray-600 bg-gray-800 p-3 rounded text-white text-lg"
          onKeyDown={(e) => e.key === 'Enter' && searchHistory()}
        />
        <button onClick={() => searchHistory()} disabled={loading} className="bg-blue-600 text-white px-4 py-3 rounded text-lg">
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {vehicles.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="font-semibold">รถที่ตรงกัน {vehicles.length} คัน</h2>
          {vehicles.map((v) => (
            <div key={v.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xl font-bold break-words">{v.license_plate}</div>
                <a href={`/receive?plate=${encodeURIComponent(v.license_plate || '')}`} className="text-blue-300 py-1">รับรถคันนี้</a>
              </div>
              <div>{v.brand || ''} {v.model || ''} {v.color || ''}</div>
              <div className="text-sm text-gray-400">ไมล์ล่าสุด: {v.mileage ? Number(v.mileage).toLocaleString() : '-'} km</div>
              <div className="text-sm text-gray-300 mt-1">{v.customers?.full_name || '-'}</div>
              <div className="text-sm text-gray-400">{v.customers?.phone || '-'}</div>
              {v.customers?.address ? <div className="text-sm text-gray-400 break-words">{v.customers.address}</div> : null}
            </div>
          ))}
        </div>
      )}

      {bills.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">เคยเข้าซ่อม {bills.length} ครั้ง</h2>
          {bills.map((bill) => {
            const names = Array.isArray(bill.items)
              ? bill.items.map((item: any) => item?.name).filter(Boolean).slice(0, 4).join(', ')
              : ''
            return (
              <div key={bill.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex justify-between gap-3">
                  <div className="font-medium">{dayText(bill.created_at)}</div>
                  <div className="font-semibold">{showPrice ? `${Number(bill.total || 0).toLocaleString()} บาท` : '—'}</div>
                </div>
                <div className="text-sm mt-1">{bill.license_plate || '-'} {bill.car_info || ''}</div>
                <div className="text-sm text-gray-400">{bill.customer_name || '-'} {bill.phone || ''}</div>
                <div className="text-sm text-gray-400">ไมล์: {bill.mileage ? Number(bill.mileage).toLocaleString() : '-'} km</div>
                {names ? <div className="text-sm mt-1 break-words">{names}</div> : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {bill.voided_at && <span className="text-xs bg-red-700 text-white rounded-full px-2 py-0.5">ยกเลิก</span>}
                  <a href={`/receipt?bill=${bill.id}`} className="text-sm text-red-200">เปิดใบจริง</a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {capped && <p className="text-amber-300 text-sm mt-4">แสดงไม่เกิน 40 รายการ พิมพ์เพิ่มอีกตัวเพื่อให้แคบลง</p>}

      {searched && !loading && vehicles.length === 0 && bills.length === 0 && (
        <p className="text-gray-500">ยังไม่พบรถหรือบิลที่ตรงกับที่พิมพ์</p>
      )}
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <HistoryContent />
    </Suspense>
  )
}
