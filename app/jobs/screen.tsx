'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        created_at,
        symptom,
        diagnosis,
        repair,
        mileage,
        vehicles(license_plate, brand, model),
        employees(full_name),
        branches(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
    }
    setJobs(data || [])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id)
    if (error) {
      alert('อัปเดตไม่สำเร็จ')
      return
    }
    fetchJobs()
  }

  const filtered = jobs.filter((job) => {
    if (filter !== 'all' && job.status !== filter) return false
    const text = `${job.vehicles?.license_plate || ''} ${job.symptom || ''} ${job.employees?.full_name || ''}`.toLowerCase()
    if (q && !text.includes(q.toLowerCase())) return false
    return true
  })

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลด...</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">จัดการงานซ่อม</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="พิมพ์ป้ายหรืออาการ"
        className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-4 text-white text-lg"
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-3 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded ${filter === 'in_progress' ? 'bg-yellow-600 text-white' : 'bg-gray-700'}`}
        >
          กำลังทำ
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-700'}`}
        >
          เสร็จสิ้น
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400">ไม่มีงาน</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                <div>
                  <div className="font-semibold">{job.vehicles?.license_plate || '-'}</div>
                  <div className="text-sm text-gray-400">
                    {job.vehicles?.brand} {job.vehicles?.model}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    พนักงาน: {job.employees?.full_name || '-'} | สาขา: {job.branches?.name || '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(job.created_at).toLocaleDateString('th-TH')}{' '}
                    {new Date(job.created_at).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      job.status === 'completed' ? 'bg-green-700' : 'bg-yellow-700'
                    }`}
                  >
                    {job.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังทำ'}
                  </span>
                </div>
              </div>

              {job.repair && (
                <div className="mt-2 text-sm text-gray-300">ซ่อม: {job.repair}</div>
              )}

              <div className="mt-3 flex gap-2">
                {job.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus(job.id, 'completed')}
                    className="text-sm bg-green-600 px-4 py-2 rounded"
                  >
                    ทำเครื่องหมายเสร็จสิ้น
                  </button>
                )}
                {job.status === 'completed' && (
                  <button
                    onClick={() => updateStatus(job.id, 'in_progress')}
                    className="text-sm bg-yellow-600 px-4 py-2 rounded"
                  >
                    เปลี่ยนเป็นกำลังทำ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// shown inside the desk without loading a new page
