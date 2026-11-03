'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function WarrantyPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [q, setQ] = useState('')

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
    if (filter === 'active' && !isUnderWarranty(job)) return false
    if (filter === 'expired' && !(job.warranty_until && !isUnderWarranty(job))) return false
    const text = `${job.vehicles?.license_plate || ''} ${job.vehicles?.customers?.full_name || ''} ${job.repair || ''}`.toLowerCase()
    if (q && !text.includes(q.toLowerCase())) return false
    return true
  })

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-2">ระบบรับประกันงาน</h1>
      <p className="text-sm text-gray-400 mb-4">ค้นจากป้ายหรือชื่อลูกค้า งานที่รับรถเข้ามาแล้วเท่านั้น</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ป้ายหรือชื่อ" className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-4 text-white text-lg" />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-3 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
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
