'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchParts()
  }, [])

  const fetchParts = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('parts_services').select('*')
    setParts(data || [])
  }

  const addItem = (item: any) => {
    const existing = selected.find((s) => s.id === item.id)
    if (existing) {
      setSelected(selected.map((s) => s.id === item.id ? { ...s, qty: s.qty + 1 } : s))
    } else {
      setSelected([...selected, { ...item, qty: 1 }])
    }
  }

  const addNewPart = async () => {
    if (!newName.trim() || !newPrice) {
      setMsg('กรุณากรอกชื่อและราคา')
      return
    }
    setAdding(true)
    setMsg('')
    const supabase = createClient()

    const { error } = await supabase.from('parts_services').insert({
      name: newName.trim(),
      price: parseFloat(newPrice),
      type: 'part'
    })

    if (error) {
      setMsg('เพิ่มไม่สำเร็จ: ' + error.message)
    } else {
      setMsg('เพิ่มสำเร็จ!')
      setNewName('')
      setNewPrice('')
      fetchParts()
    }
    setAdding(false)
  }

  const total = selected.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)

  const goToReceipt = () => {
    localStorage.setItem('selectedItems', JSON.stringify(selected))
    window.location.href = '/receipt'
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">เลือกอะไหล่ / บริการ</h1>

      <div className="mb-6 p-4 border rounded">
        <h2 className="font-semibold mb-2">เพิ่มอะไหล่/บริการใหม่</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ชื่ออะไหล่"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border p-2 rounded text-black"
          />
          <input
            type="number"
            placeholder="ราคา"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-32 border p-2 rounded text-black"
          />
          <button
            onClick={addNewPart}
            disabled={adding}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {adding ? '...' : 'เพิ่ม'}
          </button>
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-3">รายการทั้งหมด</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {parts.map((part) => (
              <div key={part.id} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{part.name}</div>
                  <div className="text-sm text-gray-400">{Number(part.price).toLocaleString()} บาท</div>
                </div>
                <button onClick={() => addItem(part)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  เพิ่ม
                </button>
              </div>
            ))}
          </div>
        </div>

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
              <button onClick={goToReceipt} className="mt-4 w-full bg-green-600 text-white py-2 rounded">
                นำไปออกบิล
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
