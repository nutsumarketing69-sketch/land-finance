'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WarrantyPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        vehicles(license_plate, brand, model, customers(full_name, phone)),
        employees(full_name),
        branches(name)
      `)
      .order('created_at', { ascending: false })

    setJobs(data || [])
    setLoading(false)
  }

  const isUnderWarranty = (job: any) => {
    if (!job.warranty_until) return false
    return new Date(job.warranty_until) >= new Date()
  }

  const filtered = jobs.filter((job) => {
    if (filter === 'active') return isUnderWarranty(job)
    if (filter === 'expired') return job.warranty_until && !isUnderWarranty(job)
    return true
  })

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ระบบรับประกันงาน</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-700'}`}
        >
          อยู่ในประกัน
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 rounded ${filter === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-700'}`}
        >
          หมดประกัน
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400">ไม่มีข้อมูล</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const under = isUnderWarranty(job)
            return (
              <div key={job.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">
                      {job.vehicles?.license_plate || '-'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {job.vehicles?.brand} {job.vehicles?.model}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      ลูกค้า: {job.vehicles?.customers?.full_name || '-'}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      under ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {under ? 'อยู่ในประกัน' : 'หมดประกัน'}
                  </span>
                </div>

                <div className="mt-3 text-sm text-gray-400 space-y-1">
                  <div>วันที่ซ่อม: {new Date(job.created_at).toLocaleDateString('th-TH')}</div>
                  {job.warranty_until && (
                    <div>
                      รับประกันถึง: {new Date(job.warranty_until).toLocaleDateString('th-TH')}
                      {job.warranty_months && ` (${job.warranty_months} เดือน)`}
                    </div>
                  )}
                  {job.employees?.full_name && <div>พนักงาน: {job.employees.full_name}</div>}
                  {job.branches?.name && <div>สาขา: {job.branches.name}</div>}
                  {job.repair && <div className="mt-1">ซ่อม: {job.repair}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
