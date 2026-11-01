'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('customers').select('*').order('full_name')
    setCustomers(data || [])
    setLoading(false)
  }

  const saveCustomer = async () => {
    if (!name.trim()) {
      setMsg('กรุณากรอกชื่อ')
      return
    }

    const supabase = createClient()
    const payload = {
      full_name: name.trim(),
      phone: phone.trim() || null,
    }

    let error
    if (editing) {
      const res = await supabase.from('customers').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      const res = await supabase.from('customers').insert(payload)
      error = res.error
    }

    if (error) {
      setMsg('บันทึกไม่สำเร็จ')
    } else {
      setMsg(editing ? 'แก้ไขสำเร็จ!' : 'เพิ่มลูกค้าสำเร็จ!')
      setName('')
      setPhone('')
      setEditing(null)
      fetchCustomers()
    }
  }

  const startEdit = (c: any) => {
    setEditing(c)
    setName(c.full_name)
    setPhone(c.phone || '')
    setMsg('')
  }

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  })

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">จัดการลูกค้า</h1>

      {/* ฟอร์ม */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-3">{editing ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="ชื่อ-นามสกุล *"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            <button onClick={saveCustomer} className="bg-blue-600 text-white px-4 py-2 rounded">
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null)
                  setName('')
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

      {/* ค้นหา */}
      <input
        type="text"
        placeholder="ค้นหาชื่อหรือเบอร์โทร..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-600 bg-gray-800 p-2 rounded mb-4 text-white placeholder-gray-400"
      />

      {/* รายการ */}
      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="border border-gray-700 rounded p-3 flex justify-between items-center bg-gray-900">
            <div>
              <div className="font-medium">{c.full_name}</div>
              <div className="text-sm text-gray-400">{c.phone || '-'}</div>
            </div>
            <button onClick={() => startEdit(c)} className="text-blue-400 text-sm">
              แก้ไข
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
