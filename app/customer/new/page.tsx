'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewCustomerPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const saveCustomer = async () => {
    if (!fullName.trim()) {
      setMessage('กรุณากรอกชื่อลูกค้า')
      return
    }
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('customers').insert({
      full_name: fullName,
      phone: phone || null,
    })

    if (error) {
      setMessage('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('เพิ่มลูกค้าสำเร็จ!')
      setFullName('')
      setPhone('')
    }
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-md mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6">เพิ่มลูกค้าใหม่</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">ชื่อ-นามสกุล *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น คุณสมชาย ใจดี"
          />
        </div>

        <div>
          <label className="block mb-1">เบอร์โทร</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border p-2 rounded text-black"
            placeholder="เช่น 081-123-4567"
          />
        </div>

        <button
          onClick={saveCustomer}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกลูกค้า'}
        </button>

        {message && (
          <p className={`mt-4 text-center ${message.includes('สำเร็จ') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
