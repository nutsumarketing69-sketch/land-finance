'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authErrorText } from '@/lib/staff'
import SectionBar from '@/app/components/SectionBar'

const ROLE_TEXT: Record<string, string> = {
  staff: 'พนักงาน',
  technician: 'ช่าง',
  manager: 'ผู้จัดการสาขา',
  admin: 'ผู้ดูแลระบบ',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [position, setPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('staff')
  const [branchId, setBranchId] = useState('')
  const [editing, setEditing] = useState<any>(null)
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

    const payload = {
      full_name: name.trim(),
      nickname: nickname.trim() || null,
      position: position.trim() || null,
      phone: phone || null,
      role,
      branch_id: branchId || null,
    }
    const res = editing
      ? await supabase.from('employees').update(payload).eq('id', editing.id).select('id')
      : await supabase.from('employees').insert({ ...payload, employee_code: nextCode }).select('id')
    const blocked = !res.error && !(res.data || []).length
    if (res.error || blocked) {
      setMsg('บันทึกไม่สำเร็จ: ' + (res.error?.message || 'ฐานข้อมูลยังไม่รับการแก้ไข'))
    } else {
      setMsg(editing ? 'แก้ไขสำเร็จ!' : 'เพิ่มสำเร็จ!')
      setEditing(null)
      setName('')
      setNickname('')
      setPosition('')
      setPhone('')
      setRole('staff')
      setBranchId('')
      fetchData()
    }
  }

  const startEdit = (emp: any) => {
    setEditing(emp)
    setName(emp.full_name || '')
    setNickname(emp.nickname || '')
    setPosition(emp.position || '')
    setPhone(emp.phone || '')
    setRole(emp.role || 'staff')
    setBranchId(emp.branch_id || '')
    setMsg('')
  }

  const deleteEmployee = async (emp: any) => {
    if (!confirm(`ลบ ${emp.full_name} ออกจากรายชื่อพนักงาน และออกจากหน้ากำหนดสิทธิ์ด้วย?`)) return
    const { error } = await createClient().rpc('remove_shop_person', { p_employee: emp.id, p_account: null })
    if (error) {
      setMsg(authErrorText(error))
      return
    }
    setMsg(`ลบ ${emp.full_name} แล้ว ทั้งหน้ารายชื่อและหน้ากำหนดสิทธิ์`)
    if (editing?.id === emp.id) {
      setEditing(null)
      setName('')
      setNickname('')
      setPosition('')
      setPhone('')
      setRole('staff')
      setBranchId('')
    }
    fetchData()
  }

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <SectionBar desk="shop" />
      <h1 className="text-2xl font-bold mb-6">จัดการพนักงาน</h1>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-3">{editing ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
        <div className="space-y-2">
          <input type="text" placeholder="ชื่อ-นามสกุล" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="ชื่อเล่น เช่น ช่างทอม" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="ตำแหน่ง เช่น ช่างซ่อม เสมียน" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full border p-2 rounded text-black" />
          <input type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border p-2 rounded text-black" />
          <select value={role} onChange={(e) => {
            const next = e.target.value
            setRole(next)
            if (next === 'technician' && !position.trim()) setPosition('ช่าง')
          }} className="w-full border p-2 rounded text-black">
            <option value="staff">พนักงาน</option>
            <option value="technician">ช่าง</option>
            <option value="manager">ผู้จัดการสาขา</option>
            <option value="admin">แอดมิน สั่งพิมพ์ได้ทุกสาขา</option>
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full border p-2 rounded text-black">
            <option value="">-- เลือกสาขา --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={addEmployee} className="bg-blue-600 text-white px-4 py-2 rounded">{editing ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}</button>
            {editing && (
              <button onClick={() => { setEditing(null); setName(''); setNickname(''); setPosition(''); setPhone(''); setRole('staff'); setBranchId('') }} className="bg-gray-600 text-white px-4 py-2 rounded">ยกเลิก</button>
            )}
          </div>
          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {employees.map((emp) => (
          <div key={emp.id} className="border p-4 rounded flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <div className="font-medium">{emp.full_name}{emp.nickname ? ` (${emp.nickname})` : ''}</div>
              <div className="text-sm text-gray-400">{emp.position || '-'}</div>
              <div className="text-sm text-gray-400">รหัส: {emp.employee_code || '-'}</div>
              <div className="text-sm text-gray-400">{emp.phone || '-'}</div>
              <div className="text-sm text-gray-400">{emp.branches?.name || '-'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-gray-700 px-3 py-1 rounded">{ROLE_TEXT[emp.role] || emp.role || 'พนักงาน'}</span>
              <button onClick={() => startEdit(emp)} className="text-blue-400 text-sm">แก้ไข</button>
              <button onClick={() => deleteEmployee(emp)} className="text-red-400 text-sm">ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
// deleting here also removes the login on the access page
