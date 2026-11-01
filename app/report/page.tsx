'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportPage() {
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    const supabase = createClient()

    const startDate = new Date(date + 'T00:00:00')
    const endDate = new Date(date + 'T23:59:59')

    const { data, error } = await supabase
      .from('jobs')
      .select('*, vehicles(license_plate, brand, model), employees(full_name), branches(name)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (!error) {
      setJobs(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">รายงานประจำวัน</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded text-black"
        />
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
        </button>
      </div>

      <div className="mb-6 p-4 border rounded text-center">
        <div className="text-2xl font-bold">{jobs.length}</div>
        <div className="text-sm text-gray-400">จำนวนงาน</div>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500">ไม่มีงานในวันนี้ หรือกดปุ่มดูรายงาน</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border p-4 rounded">
              <div className="flex justify-between">
                <div className="font-medium">{job.vehicles?.license_plate || '-'}</div>
                <div className="text-sm text-gray-400">
                  {new Date(job.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {job.vehicles?.brand} {job.vehicles?.model}
              </div>
              <div className="text-sm text-gray-400">
                พนักงาน: {job.employees?.full_name || '-'} | สาขา: {job.branches?.name || '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
