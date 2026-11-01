'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StockPage() {
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editStock, setEditStock] = useState('')

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('parts_services').select('*').order('name')
    setParts(data || [])
    setLoading(false)
  }

  const updateStock = async (id: string) => {
    const supabase = createClient()
    await supabase.from('parts_services').update({ stock: parseInt(editStock) || 0 }).eq('id', id)
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

  const lowStock = parts.filter(p => (p.stock || 0) <= (p.min_stock || 5) && p.type === 'part')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">จัดการสต็อกอะไหล่</h1>

      {lowStock.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
          <div className="font-semibold text-red-400">แจ้งเตือน: อะไหล่ใกล้หมด ({lowStock.length} รายการ)</div>
          <div className="text-sm mt-1">{lowStock.map(p => p.name).join(', ')}</div>
        </div>
      )}

      <div className="space-y-2">
        {parts.map((part) => (
          <div key={part.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{part.name}</div>
              <div className="text-sm text-gray-400">{Number(part.price).toLocaleString()} บาท</div>
            </div>
            <div className="flex items-center gap-3">
              {editing === part.id ? (
                <>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-20 border p-1 rounded text-black text-center"
                  />
                  <button onClick={() => updateStock(part.id)} className="text-green-400 text-sm">บันทึก</button>
                  <button onClick={() => setEditing(null)} className="text-gray-400 text-sm">ยกเลิก</button>
                </>
              ) : (
                <>
                  <button onClick={() => adjustStock(part.id, -1)} className="bg-gray-700 w-8 h-8 rounded">-</button>
                  <span className={`font-bold w-12 text-center ${(part.stock || 0) <= (part.min_stock || 5) ? 'text-red-400' : ''}`}>
                    {part.stock || 0}
                  </span>
                  <button onClick={() => adjustStock(part.id, 1)} className="bg-gray-700 w-8 h-8 rounded">+</button>
                  <button onClick={() => { setEditing(part.id); setEditStock(String(part.stock || 0)) }} className="text-blue-400 text-sm">แก้ไข</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
