'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState('')
  const [cars, setCars] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [capped, setCapped] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q') || ''
    setLoading(false)
    if (q) {
      setSearch(q)
      fetchCustomers(q)
    }
  }, [])

  const fetchCustomers = async (word = search) => {
    const q = word.trim().replace(/[%_,()]/g, '')
    if (!q) {
      setCustomers([])
      setCapped(false)
      return
    }
    setSearching(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone, address, tax_id')
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%,tax_id.ilike.%${q}%`)
      .order('full_name')
      .limit(80)
    setCustomers(error ? [] : data || [])
    setCapped((data || []).length >= 80)
    setSearching(false)
    if (error) setMsg('ค้นหาไม่สำเร็จ')
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
      address: address.trim() || null,
      tax_id: taxId.trim() || null,
    }

    let error
    if (editing) {
      const res = await supabase.from('customers').update(payload).eq('id', editing.id).select('id')
      error = res.error || ((res.data || []).length ? null : { message: 'blocked' })
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
      setAddress('')
      setTaxId('')
      setEditing(null)
      setSearch(name.trim())
      fetchCustomers(name.trim())
    }
  }

  const startEdit = (c: any) => {
    setEditing(c)
    setName(c.full_name)
    setPhone(c.phone || '')
    setAddress(c.address || '')
    setTaxId(c.tax_id || '')
    setMsg('')
  }

  const showHistory = async (c: any) => {
    if (openId === c.id) {
      setOpenId('')
      return
    }
    setOpenId(c.id)
    setCars([])
    setHistory([])
    const supabase = createClient()
    const { data: vehicleRows } = await supabase
      .from('vehicles')
      .select('id, license_plate, brand, model, color, mileage')
      .eq('customer_id', c.id)
      .limit(40)
    const list = vehicleRows || []
    setCars(list)
    const plates = list.map((v) => v.license_plate).filter(Boolean)
    const seen = new Set<string>()
    const bills: any[] = []
    if (plates.length) {
      const { data } = await supabase
        .from('bills')
        .select('id, bill_no, license_plate, car_info, mileage, total, created_at')
        .in('license_plate', plates)
        .order('created_at', { ascending: false })
        .limit(40)
      for (const row of data || []) {
        if (!seen.has(row.id)) {
          seen.add(row.id)
          bills.push(row)
        }
      }
    }
    const { data: named } = await supabase
      .from('bills')
      .select('id, bill_no, license_plate, car_info, mileage, total, created_at')
      .eq('customer_name', c.full_name)
      .order('created_at', { ascending: false })
      .limit(20)
    for (const row of named || []) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        bills.push(row)
      }
    }
    bills.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    setHistory(bills.slice(0, 40))
  }

  const clearForm = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setAddress('')
    setTaxId('')
  }

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.tax_id?.includes(q)
    )
  })

  if (loading) return <div className="p-8 text-center">กำลังโหลด...</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
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
          <input
            type="text"
            placeholder="ที่อยู่"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <input
            type="text"
            placeholder="เลขผู้เสียภาษี"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
          <div className="flex gap-2">
            <button onClick={saveCustomer} className="bg-blue-600 text-white px-4 py-2 rounded">
              {editing ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
            </button>
            {editing && (
              <button
                onClick={clearForm}
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
        placeholder="ค้นหาชื่อ เบอร์โทร ที่อยู่ หรือเลขผู้เสียภาษี..."
        value={search}
        onChange={(e) => {
          const value = e.target.value
          setSearch(value)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => fetchCustomers(value), 250)
        }}
        className="w-full border border-gray-600 bg-gray-800 p-3 rounded mb-4 text-white text-lg placeholder-gray-400"
      />
      {!search.trim() && <p className="text-gray-400 mb-4">พิมพ์ชื่อ เบอร์ ที่อยู่ หรือเลขภาษี แม้แค่ตัวเดียว แล้วเลือกชื่อได้เลย</p>}
      {searching && <p className="text-gray-400 mb-4">กำลังค้นหา...</p>}
      {search.trim() && !searching && customers.length === 0 && <p className="text-gray-400 mb-4">ไม่พบลูกค้าที่ตรงกับที่พิมพ์</p>}
      {capped && <p className="text-amber-300 text-sm mb-4">แสดง 80 รายการแรก พิมพ์เพิ่มอีกตัวเพื่อให้รายการแคบลง</p>}

      {/* รายการ */}
      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="border border-gray-700 rounded p-3 bg-gray-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
              <div className="min-w-0">
                <div className="font-medium break-words">{c.full_name}</div>
                <div className="text-sm text-gray-400">{c.phone || '-'}</div>
                {c.address ? <div className="text-sm text-gray-300 break-words">{c.address}</div> : null}
                {c.tax_id ? <div className="text-sm text-gray-400">เลขผู้เสียภาษี {c.tax_id}</div> : null}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => showHistory(c)} className="text-amber-300 py-2">รถและประวัติ</button>
                <button onClick={() => startEdit(c)} className="text-blue-400 py-2">แก้ไข</button>
              </div>
            </div>
            {openId === c.id && (
              <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
                {cars.length === 0 && <div className="text-sm text-gray-500">ยังไม่มีรถผูกกับชื่อนี้</div>}
                {cars.map((v) => (
                  <div key={v.id} className="text-sm">
                    <span className="font-medium">{v.license_plate || '-'}</span>
                    <span className="text-gray-400"> {v.brand || ''} {v.model || ''} {v.color || ''} {v.mileage ? `${v.mileage} km` : ''}</span>
                  </div>
                ))}
                {history.map((b) => (
                  <div key={b.id} className="text-xs text-gray-400">
                    {(b.created_at || '').slice(0, 10)} {b.license_plate || ''} {b.car_info || ''} {b.mileage ? `${b.mileage} km` : ''} {b.total ?? ''} บาท
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
