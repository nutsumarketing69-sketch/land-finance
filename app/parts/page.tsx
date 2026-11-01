'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])

  useEffect(() => {
    const fetchParts = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('parts_services').select('*')
      setParts(data || [])
    }
    fetchParts()
  }, [])

  const addItem = (item: any) => {
    const existing = selected.find((s) => s.id === item.id)
    if (existing) {
      setSelected(selected.map((s) => 
        s.id === item.id ? { ...s, qty: s.qty + 1 } : s
      ))
    } else {
      setSelected([...selected, { ...item, qty: 1 }])
    }
  }

  const total = selected.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">เลือกอะไหล่ / บริการ</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* รายการอะไหล่ */}
        <div>
          <h2 className="font-semibold mb-3">รายการทั้งหมด</h2>
          <div className="space-y-2">
            {parts.map((part) => (
              <div key={part.id} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{part.name}</div>
                  <div className="text-sm text-gray-400">{Number(part.price).toLocaleString()} บาท</div>
                </div>
                <button
                  onClick={() => addItem(part)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  เพิ่ม
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* รายการที่เลือก */}
        <div>
          <h2 className="font-semibold mb-3">รายการที่เลือก</h2>
          {selected.length === 0 ? (
            <p className="text-gray-500">ยังไม่มีรายการ</p>
          ) : (
            <div className="space-y-2">
              {selected.map((item) => (
                <div key={item.id} className="border p-3 rounded bg-white text-black">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm">
                    {Number(item.price).toLocaleString()} x {item.qty} = {(Number(item.price) * item.qty).toLocaleString()} บาท
                  </div>
                </div>
              ))}
              <div className="font-bold text-lg mt-4 pt-3 border-t">
                รวมทั้งสิ้น: {total.toLocaleString()} บาท
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
