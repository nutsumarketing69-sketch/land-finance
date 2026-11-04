'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SectionBar from '@/app/components/SectionBar'

export default function JobsByBranchPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({ total: 0, inProgress: 0, completed: 0 })

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  const fetchJobs = async () => {
    if (!selectedBranch) return
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        vehicles(license_plate, brand, model),
        employees(full_name)
      `)
      .eq('branch_id', selectedBranch)
      .order('created_at', { ascending: false })
      .limit(50)

    const list = data || []
    setJobs(list)

    const inProgress = list.filter(j => j.status !== 'completed').length
    const completed = list.filter(j => j.status === 'completed').length
    setSummary({ total: list.length, inProgress, completed })
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <SectionBar desk="lookup" />
      <h1 className="text-2xl font-bold mb-6">งานแยกตามสาขา</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">เลือกสาขา</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full border border-gray-600 bg-gray-800 p-3 rounded text-white"
          >
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading || !selectedBranch}
          className="bg-blue-600 text-white px-5 py-3 rounded disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ดูงาน'}
        </button>
      </div>

      {selectedBranch && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-400">งานทั้งหมด</div>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
            <div className="text-2xl font-bold text-yellow-400">{summary.inProgress}</div>
            <div className="text-sm text-gray-400">กำลังทำ</div>
          </div>
          <div className="border border-gray-700 rounded-lg p-4 text-center bg-gray-900">
            <div className="text-2xl font-bold text-green-400">{summary.completed}</div>
            <div className="text-sm text-gray-400">เสร็จสิ้น</div>
          </div>
        </div>
      )}

      {jobs.length === 0 && selectedBranch && !loading ? (
        <p className="text-gray-400">ไม่มีงานในสาขานี้</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div>
                  <div className="font-medium">{job.vehicles?.license_plate || '-'}</div>
                  <div className="text-gray-400">{job.vehicles?.brand} {job.vehicles?.model}</div>
                  <div className="text-gray-400 text-xs">พนักงาน: {job.employees?.full_name || '-'}</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    job.status === 'completed' ? 'bg-green-700' : 'bg-yellow-700'
                  }`}>
                    {job.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังทำ'}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(job.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>
              {job.repair && <div className="mt-1 text-gray-300">ซ่อม: {job.repair}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
