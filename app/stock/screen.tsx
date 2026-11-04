'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

export default function StockPage() {
  const { showPrice } = useAccess()
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    const supabase = createClient()
    const all: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('parts_services').select('*').order('name').range(from, from + 999)
      if (error || !data?.length) break
      all.push(...data)
      if (data.length < 1000) break
    }
    setParts(all)
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

  const lowStock = parts.filter((p) => p.type !== 'labor' && p.type !== 'service' && (p.stock || 0) <= (p.min_stock || 5))

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-4">จัดการสต็อกอะไหล่</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่ออะไหล่ เช่น ก" className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-4 text-white text-lg" />

      {lowStock.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded">
          <div className="font-semibold text-red-400">แจ้งเตือน: อะไหล่ใกล้หมด ({lowStock.length} รายการ)</div>
        </div>
      )}

      {/* ฟอร์มแก้ไข */}
      {editing && (
        <div className="mb-6 p-4 border rounded bg-gray-800">
          <h2 className="font-semibold mb-3">แก้ไขรายการ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="text" value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} className="border p-2 rounded text-black" placeholder="ชื่อ" />
            {showPrice && <input type="number" value={editing.price} onChange={(e) => setEditing({...editing, price: e.target.value})} className="border p-2 rounded text-black" placeholder="ราคา" />}
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
        {(q.trim() ? parts.filter((part) => String(part.name || '').toLowerCase().includes(q.trim().toLowerCase())) : parts.slice(0, 40)).map((part) => (
          <div key={part.id} className="border p-4 rounded flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="font-medium break-words">{part.name}</div>
              {showPrice && <div className="text-sm text-gray-400">{Number(part.price).toLocaleString()} บาท</div>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className={`text-xl font-bold ${(part.stock || 0) <= (part.min_stock || 5) ? 'text-red-400' : 'text-green-400'}`}>
                  {part.stock || 0}
                </div>
                <div className="text-xs text-gray-500">คงเหลือ</div>
              </div>
              <button onClick={() => adjustStock(part.id, -1)} className="bg-gray-700 w-12 h-12 rounded text-xl">-</button>
              <button onClick={() => adjustStock(part.id, 1)} className="bg-gray-700 w-12 h-12 rounded text-xl">+</button>
              <button onClick={() => setEditing({...part})} className="text-blue-400 py-3 px-2">แก้ไข</button>
            </div>
          </div>
        ))}
        {!q.trim() && <p className="text-sm text-gray-400">แสดง 40 รายการแรก พิมพ์ชื่อเพื่อหาที่เหลือ</p>}
      </div>
    </div>
  )
}
// shown inside the desk without loading a new page
