'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ total: 0, count: 0 })

  const fetchReport = async () => {
    setLoading(true)
    const supabase = createClient()

    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('jobs')
      .select('*, vehicles(license_plate, brand, model), employees(full_name), branches(name)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    setJobs(data || [])
    setSummary({
      count: data?.length || 0,
      total: 0
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [])

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border p-4 rounded text-center">
          <div className="text-3xl font-bold">{summary.count}</div>
          <div className="text-sm text-gray-400">จำนวนงาน</div>
        </div>
        <div className="border p-4 rounded text-center">
          <div className="text-3xl font-bold">{new Date(date).toLocaleDateString('th-TH')}</div>
          <div className="text-sm text-gray-400">วันที่</div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500">ไม่มีงานในวันนี้</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border p-4 rounded">
              <div className="flex justify-between">
                <div className="font-medium">
                  {job.vehicles?.license_plate || '-'}
                </div>
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
              <div className="text-sm">
                สถานะ: <span className="bg-gray-700 px-2 py-0.5 rounded">{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
