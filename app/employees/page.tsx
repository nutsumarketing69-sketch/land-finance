'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmployees = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('employees').select('*')
      setEmployees(data || [])
      setLoading(false)
    }
    fetchEmployees()
  }, [])

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">รายชื่อพนักงาน</h1>

      <div className="space-y-3">
        {employees.map((emp) => (
          <div key={emp.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{emp.full_name}</div>
              <div className="text-sm text-gray-400">รหัส: {emp.employee_code}</div>
              <div className="text-sm text-gray-400">{emp.phone || '-'}</div>
            </div>
            <div className="text-sm bg-gray-700 px-3 py-1 rounded">
              {emp.role || 'staff'}
            </div>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <p className="text-gray-500">ยังไม่มีข้อมูลพนักงาน</p>
      )}
    </div>
  )
}
