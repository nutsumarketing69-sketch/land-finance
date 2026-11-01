'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdvancedReportPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalJobs: 0,
    byBranch: {} as Record<string, number>,
    byEmployee: {} as Record<string, number>,
  })

  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }, [])

  const fetchReport = async () => {
    if (!startDate || !endDate) return
    setLoading(true)

    const supabase = createClient()
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')

    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        vehicles(license_plate, brand, model),
        employees(full_name),
        branches(name)
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const list = data || []
    setJobs(list)

    const byBranch: Record<string, number> = {}
    const byEmployee: Record<string, number> = {}

    list.forEach((job) => {
      const branch = job.branches?.name || 'ไม่ระบุสาขา'
      const emp = job.employees?.full_name || 'ไม่ระบุพนักงาน'
      byBranch[branch] = (byBranch[branch] || 0) + 1
      byEmployee[emp] = (byEmployee[emp] || 0) + 1
    })

    setSummary({
      totalJobs: list.length,
      byBranch,
      byEmployee,
    })

    setLoading(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">รายงานขั้นสูง</h1>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-sm text-gray-400 mb-1">วันที่เริ่ม</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-600 bg-gray-800 p-2 rounded text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-600 bg-gray-800 p-2 rounded text-white"
          />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
        </button>
      </div>

      {/* สรุป */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold text-blue-400">{summary.totalJobs}</div>
          <div className="text-sm text-gray-400 mt-1">จำนวนงานทั้งหมด</div>
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
          <div className="text-sm font-semibold mb-2">แยกตามสาขา</div>
          {Object.entries(summary.byBranch).length === 0 ? (
            <p className="text-gray-500 text-sm">-</p>
          ) : (
            Object.entries(summary.byBranch).map(([name, count]) => (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))
          )}
        </div>

        <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
          <div className="text-sm font-semibold mb-2">แยกตามพนักงาน</div>
          {Object.entries(summary.byEmployee).length === 0 ? (
            <p className="text-gray-500 text-sm">-</p>
          ) : (
            Object.entries(summary.byEmployee)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* รายการงาน */}
      <h2 className="font-semibold mb-3">รายละเอียดงาน</h2>
      {jobs.length === 0 ? (
        <p className="text-gray-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-700 rounded p-3 text-sm bg-gray-900">
              <div className="flex justify-between">
                <div className="font-medium">{job.vehicles?.license_plate || '-'}</div>
                <div className="text-gray-400">
                  {new Date(job.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
              <div className="text-gray-400">
                {job.vehicles?.brand} {job.vehicles?.model}
              </div>
              <div className="text-gray-400">
                พนักงาน: {job.employees?.full_name || '-'} | สาขา: {job.branches?.name || '-'}
              </div>
              {job.repair && <div className="mt-1">ซ่อม: {job.repair}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
