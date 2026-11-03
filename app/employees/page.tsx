'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('staff')
  const [branchId, setBranchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: emp } = await supabase.from('employees').select('*, branches(name)')
    const { data: br } = await supabase.from('branches').select('*')
    setEmployees(emp || [])
    setBranches(br || [])
    setLoading(false)
  }

  const addEmployee = async () => {
    if (!name.trim()) {
      setMsg('กรุณากรอกชื่อ')
      return
    }
    const supabase = createClient()
    
    // สร้างรหัสพนักงานอัตโนมัติ
    const nextCode = `EMP${String(employees.length + 1).padStart(3, '0')}`

    const { error } = await supabase.from('employees').insert({
      full_name: name.trim(),
      nickname: nickname.trim() || null,
      position: position.trim() || null,
      employee_code: nextCode,
      phone: phone || null,
      role,
      branch_id: branchId || null,
    })

    if (error) {
      setMsg('เพิ่มไม่สำเร็จ: ' + error.message)
    } else {
      setMsg('เพิ่มสำเร็จ!')
      setName('')
      setNickname('')
      setPosition('')
      setPhone('')
      fetchData()
    }
  }

  const deleteEmployee = async (id: string) => {
    if (!confirm('ต้องการลบพนักงานคนนี้?')) return
    const supabase = createClient()
    await supabase.from('employees').delete().eq('id', id)
    fetchData()
  }

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">จัดการพนักงาน</h1>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-3">เพิ่มพนักงานใหม่</h2>
        <div className="space-y-2">
          <input type="text" placeholder="ชื่อ-นามสกุล" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="ชื่อเล่น เช่น ช่างทอม" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="ตำแหน่ง เช่น ช่างซ่อม เสมียน" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border p-2 rounded text-black" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border p-2 rounded text-black">
            <option value="staff">พนักงาน</option>
            <option value="manager">ผู้จัดการสาขา</option>
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full border p-2 rounded text-black">
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button onClick={addEmployee} className="bg-blue-600 text-white px-4 py-2 rounded">เพิ่มพนักงาน</button>
          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {employees.map((emp) => (
          <div key={emp.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{emp.full_name}{emp.nickname ? ` (${emp.nickname})` : ''}</div>
              <div className="text-sm text-gray-400">{emp.position || '-'}</div>
              <div className="text-sm text-gray-400">รหัส: {emp.employee_code || '-'}</div>
              <div className="text-sm text-gray-400">{emp.phone || '-'}</div>
              <div className="text-sm text-gray-400">{emp.branches?.name || '-'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-gray-700 px-3 py-1 rounded">{emp.role}</span>
              <button onClick={() => deleteEmployee(emp.id)} className="text-red-400 text-sm">ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
