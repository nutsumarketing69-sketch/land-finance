'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('branches').select('*')
        
        if (error) {
          setError(error.message)
        } else {
          setBranches(data || [])
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาด')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8">กำลังโหลด...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">แดชบอร์ดร้านแอร์</h1>
      <h2 className="text-xl font-semibold mb-4">รายชื่อสาขา ({branches.length})</h2>
      <div className="space-y-3">
        {branches.map((branch) => (
          <div key={branch.id} className="border p-4 rounded">
            <div className="font-medium">{branch.name}</div>
            <div className="text-sm text-gray-600">{branch.phone || '-'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
