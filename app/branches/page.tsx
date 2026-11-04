'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SectionBar from '@/app/components/SectionBar'

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
    setLoading(false)
  }

  const saveBranch = async () => {
    if (!name.trim()) {
      setMsg('กรุณากรอกชื่อสาขา')
      return
    }

    const supabase = createClient()
    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
    }

    let error
    if (editing) {
      const res = await supabase.from('branches').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      const res = await supabase.from('branches').insert(payload)
      error = res.error
    }

    if (error) {
      setMsg('บันทึกไม่สำเร็จ')
    } else {
      setMsg(editing ? 'แก้ไขสำเร็จ!' : 'เพิ่มสาขาสำเร็จ!')
      setName('')
      setAddress('')
      setPhone('')
      setEditing(null)
      fetchBranches()
    }
  }

  const deleteBranch = async (id: string) => {
    if (!confirm('ต้องการลบสาขานี้?')) return
    const supabase = createClient()
    await supabase.from('branches').delete().eq('id', id)
    fetchBranches()
  }

  const startEdit = (b: any) => {
    setEditing(b)
    setName(b.name)
    setAddress(b.address || '')
    setPhone(b.phone || '')
    setMsg('')
  }

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto pb-24">
      <SectionBar desk="shop" />
      <h1 className="text-2xl font-bold mb-6">จัดการสาขา</h1>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-3">{editing ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="ชื่อสาขา *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <input
            type="text"
            placeholder="ที่อยู่"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <input
            type="text"
            placeholder="เบอร์โทร"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <div className="flex gap-2">
            <button onClick={saveBranch} className="bg-blue-600 text-white px-4 py-2 rounded">
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มสาขา'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null)
                  setName('')
                  setAddress('')
                  setPhone('')
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded"
              >
                ยกเลิก
              </button>
            )}
          </div>
          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>
      </div>

      {/* รายการสาขา */}
      <div className="space-y-3">
        {branches.map((b) => (
          <div key={b.id} className="border p-4 rounded flex justify-between items-start">
            <div>
              <div className="font-medium">{b.name}</div>
              {b.address && <div className="text-sm text-gray-400">{b.address}</div>}
              {b.phone && <div className="text-sm text-gray-400">{b.phone}</div>}
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => startEdit(b)} className="text-blue-400">แก้ไข</button>
              <button onClick={() => deleteBranch(b.id)} className="text-red-400">ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
