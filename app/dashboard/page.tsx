'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    vehicles: 0,
    customers: 0,
    jobsToday: 0,
    jobsMonth: 0,
    lowStock: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentJobs, setRecentJobs] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const supabase = createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      vehiclesRes,
      customersRes,
      jobsTodayRes,
      jobsMonthRes,
      lowStockRes,
      recentRes,
    ] = await Promise.all([
      supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', firstOfMonth.toISOString()),
      supabase
        .from('parts_services')
        .select('id', { count: 'exact', head: true })
        .lte('stock', 5),
      supabase
        .from('jobs')
        .select('*, vehicles(license_plate, brand, model), branches(name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    setStats({
      vehicles: vehiclesRes.count || 0,
      customers: customersRes.count || 0,
      jobsToday: jobsTodayRes.count || 0,
      jobsMonth: jobsMonthRes.count || 0,
      lowStock: lowStockRes.count || 0,
    })

    setRecentJobs(recentRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">แดชบอร์ด</h1>

      {/* สถิติ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold text-blue-400">{stats.vehicles}</div>
          <div className="text-sm text-gray-400 mt-1">รถทั้งหมด</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold text-green-400">{stats.customers}</div>
          <div className="text-sm text-gray-400 mt-1">ลูกค้า</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold text-yellow-400">{stats.jobsToday}</div>
          <div className="text-sm text-gray-400 mt-1">งานวันนี้</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-3xl font-bold text-purple-400">{stats.jobsMonth}</div>
          <div className="text-sm text-gray-400 mt-1">งานเดือนนี้</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className={`text-3xl font-bold ${stats.lowStock > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {stats.lowStock}
          </div>
          <div className="text-sm text-gray-400 mt-1">สต็อกใกล้หมด</div>
        </div>
      </div>

      {/* งานล่าสุด */}
      <h2 className="font-semibold mb-3">งานล่าสุด</h2>
      {recentJobs.length === 0 ? (
        <p className="text-gray-500">ยังไม่มีงาน</p>
      ) : (
        <div className="space-y-2">
          {recentJobs.map((job) => (
            <div key={job.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900 text-sm">
              <div className="flex justify-between">
                <div className="font-medium">{job.vehicles?.license_plate || '-'}</div>
                <div className="text-gray-400">
                  {new Date(job.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
              <div className="text-gray-400">
                {job.vehicles?.brand} {job.vehicles?.model}
              </div>
              <div className="text-gray-400">{job.branches?.name || '-'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ลิงก์ด่วน */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <a href="/receive" className="bg-blue-600 text-center py-3 rounded-lg font-medium">
          รับรถใหม่
        </a>
        <a href="/stock" className="bg-orange-600 text-center py-3 rounded-lg font-medium">
          จัดการสต็อก
        </a>
      </div>
    </div>
  )
}
