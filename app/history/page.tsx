'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function HistoryContent() {
  const searchParams = useSearchParams()
  const initialPlate = searchParams.get('plate') || ''

  const [plate, setPlate] = useState(initialPlate)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [vehicle, setVehicle] = useState<any>(null)

  const searchHistory = async () => {
    if (!plate.trim()) return
    setLoading(true)
    const supabase = createClient()

    const { data: v } = await supabase
      .from('vehicles')
      .select('*, customers(*)')
      .ilike('license_plate', `%${plate}%`)
      .maybeSingle()

    setVehicle(v)

    if (v) {
      const { data } = await supabase
        .from('jobs')
        .select('*, employees(full_name), branches(name)')
        .eq('vehicle_id', v.id)
        .order('created_at', { ascending: false })
      setJobs(data || [])
    } else {
      setJobs([])
    }
    setSearched(true)
    setLoading(false)
  }

  const isUnderWarranty = (job: any) => {
    if (!job.warranty_until) return false
    return new Date(job.warranty_until) >= new Date()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ประวัติงานซ่อม</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="พิมพ์ป้ายทะเบียน"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className="flex-1 border p-2 rounded text-black"
          onKeyDown={(e) => e.key === 'Enter' && searchHistory()}
        />
        <button
          onClick={searchHistory}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </div>

      {vehicle && (
        <div className="mb-6 p-4 border rounded bg-white text-black">
          <div className="font-bold text-lg">{vehicle.license_plate}</div>
          <div>{vehicle.brand} {vehicle.model}</div>
          <div className="text-sm text-gray-600">ลูกค้า: {vehicle.customers?.full_name || '-'}</div>
          <div className="text-sm text-gray-600">โทร: {vehicle.customers?.phone || '-'}</div>
          <div className="text-sm text-gray-600">สี: {vehicle.color || '-'}</div>
        </div>
      )}

      {searched && !vehicle && (
        <p className="text-gray-500">ไม่พบข้อมูลรถคันนี้</p>
      )}

      {jobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold">ประวัติการเข้าซ่อม ({jobs.length} ครั้ง)</h2>
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex justify-between items-start">
                <div className="font-medium">
                  {new Date(job.created_at).toLocaleDateString('th-TH')}
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    job.status === 'completed' ? 'bg-green-700' : 'bg-yellow-700'
                  }`}>
                    {job.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังทำ'}
                  </span>
                  {job.warranty_until && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      isUnderWarranty(job) ? 'bg-blue-700' : 'bg-gray-700'
                    }`}>
                      {isUnderWarranty(job) ? 'อยู่ในประกัน' : 'หมดประกัน'}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-400 mt-2 space-y-1">
                <div>ไมล์: {job.mileage?.toLocaleString() || '-'} km</div>
                <div>พนักงาน: {job.employees?.full_name || '-'}</div>
                <div>สาขา: {job.branches?.name || '-'}</div>
                {job.warranty_months && (
                  <div>รับประกัน: {job.warranty_months} เดือน (ถึง {new Date(job.warranty_until).toLocaleDateString('th-TH')})</div>
                )}
              </div>

              {job.symptom && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-400">อาการ:</span> {job.symptom}
                </div>
              )}
              {job.diagnosis && (
                <div className="text-sm">
                  <span className="text-gray-400">ตรวจพบ:</span> {job.diagnosis}
                </div>
              )}
              {job.repair && (
                <div className="text-sm">
                  <span className="text-gray-400">ซ่อม:</span> {job.repair}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {searched && vehicle && jobs.length === 0 && (
        <p className="text-gray-500">ยังไม่มีประวัติงานของรถคันนี้</p>
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
