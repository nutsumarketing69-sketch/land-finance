'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StockPage() {
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('parts_services').select('*').order('name')
    setParts(data || [])
    setLoading(false)
  }

  const saveEdit = async () => {
    if (!editing) return
    const supabase = createClient()
    await supabase.from('parts_services').update({
      name: editing.name,
      price: parseFloat(editing.price) || 0,
      stock: parseInt(editing.stock) || 0,
      min_stock: parseInt(editing.min_stock) || 5,
    }).eq('id', editing.id)
    setEditing(null)
    fetchParts()
  }

  const adjustStock = async (id: string, amount: number) => {
    const part = parts.find(p => p.id === id)
    if (!part) return
    const newStock = Math.max(0, (part.stock || 0) + amount)
    const supabase = createClient()
    await supabase.from('parts_services').update({ stock: newStock }).eq('id', id)
    fetchParts()
  }

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  const lowStock = parts.filter(p => (p.stock || 0) <= (p.min_stock || 5))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">จัดการสต็อกอะไหล่</h1>

      {lowStock.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
          <div className="font-semibold text-red-400">แจ้งเตือน: อะไหล่ใกล้หมด ({lowStock.length} รายการ)</div>
        </div>
      )}

      {/* ฟอร์มแก้ไข */}
      {editing && (
        <div className="mb-6 p-4 border rounded bg-gray-800">
          <h2 className="font-semibold mb-3">แก้ไขรายการ</h2>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} className="border p-2 rounded text-black" placeholder="ชื่อ" />
            <input type="number" value={editing.price} onChange={(e) => setEditing({...editing, price: e.target.value})} className="border p-2 rounded text-black" placeholder="ราคา" />
            <input type="number" value={editing.stock} onChange={(e) => setEditing({...editing, stock: e.target.value})} className="border p-2 rounded text-black" placeholder="สต็อก" />
            <input type="number" value={editing.min_stock} onChange={(e) => setEditing({...editing, min_stock: e.target.value})} className="border p-2 rounded text-black" placeholder="สต็อกขั้นต่ำ" />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={saveEdit} className="bg-green-600 text-white px-4 py-2 rounded">บันทึก</button>
            <button onClick={() => setEditing(null)} className="bg-gray-600 text-white px-4 py-2 rounded">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {parts.map((part) => (
          <div key={part.id} className="border p-4 rounded flex justify-between items-center">
            <div className="flex-1">
              <div className="font-medium">{part.name}</div>
              <div className="text-sm text-gray-400">{Number(part.price).toLocaleString()} บาท</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className={`text-xl font-bold ${(part.stock || 0) <= (part.min_stock || 5) ? 'text-red-400' : 'text-green-400'}`}>
                  {part.stock || 0}
                </div>
                <div className="text-xs text-gray-500">คงเหลือ</div>
              </div>
              <button onClick={() => adjustStock(part.id, -1)} className="bg-gray-700 w-8 h-8 rounded">-</button>
              <button onClick={() => adjustStock(part.id, 1)} className="bg-gray-700 w-8 h-8 rounded">+</button>
              <button onClick={() => setEditing({...part})} className="text-blue-400 text-sm">แก้ไข</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
