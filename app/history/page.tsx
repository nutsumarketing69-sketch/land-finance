'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function HistoryContent() {
  const searchParams = useSearchParams()
  const plate = searchParams.get('plate') || ''
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const searchHistory = async () => {
    if (!plate.trim()) return
    setLoading(true)
    const supabase = createClient()

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('license_plate', plate)
      .maybeSingle()

    if (vehicle) {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('created_at', { ascending: false })
      setJobs(data || [])
    } else {
      setJobs([])
    }
    setSearched(true)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ประวัติงานซ่อม</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="พิมพ์ป้ายทะเบียน"
          defaultValue={plate}
          id="plateInput"
          className="flex-1 border p-2 rounded text-black"
        />
        <button
          onClick={() => {
            const input = document.getElementById('plateInput') as HTMLInputElement
            window.location.href = `/history?plate=${encodeURIComponent(input.value)}`
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ค้นหา
        </button>
      </div>

      {plate && !searched && (
        <button onClick={searchHistory} className="mb-4 text-blue-400 underline">
          คลิกเพื่อโหลดประวัติของ {plate}
        </button>
      )}

      {loading && <p>กำลังโหลด...</p>}

      {searched && jobs.length === 0 && (
        <p className="text-gray-500">ไม่พบประวัติงานของรถคันนี้</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="border p-4 rounded">
            <div className="font-medium">งานวันที่ {new Date(job.created_at).toLocaleDateString('th-TH')}</div>
            <div className="text-sm text-gray-400">สถานะ: {job.status}</div>
            <div className="text-sm text-gray-400">ไมล์: {job.mileage?.toLocaleString() || '-'} km</div>
          </div>
        ))}
      </div>
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
