'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

export default function DashboardPage() {
  const { showPrice } = useAccess()
  const [stats, setStats] = useState({
    vehicles: 0,
    customers: 0,
    billsToday: 0,
    salesToday: 0,
    lowStock: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentBills, setRecentBills] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const supabase = createClient()

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const [
      vehiclesRes,
      customersRes,
      billsTodayRes,
      lowStockRes,
      recentRes,
    ] = await Promise.all([
      supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase
        .from('bills')
        .select('total')
        .gte('created_at', start.toISOString())
        .is('voided_at', null)
        .limit(300),
      supabase
        .from('parts_services')
        .select('id', { count: 'exact', head: true })
        .lte('stock', 5)
        .not('type', 'in', '("labor","service")'),
      supabase
        .from('bills')
        .select('id, bill_no, customer_name, license_plate, total, created_at, voided_at, branches(name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const todayBills = billsTodayRes.data || []
    setStats({
      vehicles: vehiclesRes.count || 0,
      customers: customersRes.count || 0,
      billsToday: todayBills.length,
      salesToday: todayBills.reduce((sum, bill) => sum + Number(bill.total || 0), 0),
      lowStock: lowStockRes.count || 0,
    })

    setRecentBills(recentRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">แดชบอร์ด</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.vehicles.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">รถทั้งหมด</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats.customers.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">ลูกค้า</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.billsToday}</div>
          <div className="text-sm text-gray-400 mt-1">บิลวันนี้</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className="text-xl sm:text-3xl font-bold text-purple-400 break-words">{showPrice ? stats.salesToday.toLocaleString() : '—'}</div>
          <div className="text-sm text-gray-400 mt-1">ยอดวันนี้</div>
        </div>
        <div className="border border-gray-700 rounded-xl p-4 text-center bg-gray-900">
          <div className={`text-2xl sm:text-3xl font-bold ${stats.lowStock > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {stats.lowStock}
          </div>
          <div className="text-sm text-gray-400 mt-1">สต็อกใกล้หมด</div>
        </div>
      </div>

      <h2 className="font-semibold mb-3">บิลล่าสุด</h2>
      {recentBills.length === 0 ? (
        <p className="text-gray-500">ยังไม่มีบิล</p>
      ) : (
        <div className="space-y-2">
          {recentBills.map((bill) => (
            <a key={bill.id} href={`/receipt?bill=${bill.id}`} className="block border border-gray-700 rounded-lg p-3 bg-gray-900 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div className="font-medium break-words">{bill.license_plate || '-'} · {bill.customer_name || '-'}{bill.voided_at ? ' · ยกเลิก' : ''}</div>
                <div className="text-gray-300">{showPrice ? `${Number(bill.total || 0).toLocaleString()} บาท` : '—'}</div>
              </div>
              <div className="text-gray-400">{bill.branches?.name || '-'} · {bill.bill_no}</div>
            </a>
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
// shown inside the desk without loading a new page
