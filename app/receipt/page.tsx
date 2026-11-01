'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReceiptPage() {
  const [date, setDate] = useState('')
  const [billNo, setBillNo] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [discount, setDiscount] = useState(0)
  const [parts, setParts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [car, setCar] = useState('')
  const [mileage, setMileage] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [searchCust, setSearchCust] = useState('')
  const [searchPlate, setSearchPlate] = useState('')
  const [custResults, setCustResults] = useState<any[]>([])
  const [plateResults, setPlateResults] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState<{[key: number]: string}>({})
  const [itemResults, setItemResults] = useState<{[key: number]: any[]}>({})

  const PROMPTPAY_ID = '0994102559'

  useEffect(() => {
    const now = new Date()
    setDate(now.toLocaleDateString('th-TH'))
    const no = `68-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
    setBillNo(no)

    const saved = localStorage.getItem('selectedItems')
    if (saved) setItems(JSON.parse(saved))

    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const [partsRes, branchesRes] = await Promise.all([
      supabase.from('parts_services').select('*'),
      supabase.from('branches').select('*'),
    ])
    setParts(partsRes.data || [])
    setBranches(branchesRes.data || [])
  }

  const searchCustomer = async (q: string) => {
    setSearchCust(q)
    if (q.length < 1) { setCustResults([]); return }
    const supabase = createClient()
    const { data } = await supabase.from('customers').select('*').ilike('full_name', `%${q}%`).limit(5)
    setCustResults(data || [])
  }

  const selectCustomer = (c: any) => {
    setCustomer(c.full_name)
    setPhone(c.phone || '')
    setSearchCust('')
    setCustResults([])
  }

  const searchPlateFn = async (q: string) => {
    setSearchPlate(q)
    if (q.length < 1) { setPlateResults([]); return }
    const supabase = createClient()
    const { data } = await supabase.from('vehicles').select('*, customers(*)').ilike('license_plate', `%${q}%`).limit(5)
    setPlateResults(data || [])
  }

  const selectPlate = (v: any) => {
    setPlate(v.license_plate)
    setCar(`${v.brand || ''} ${v.model || ''}`.trim())
    setMileage(v.mileage?.toString() || '')
    if (v.customers) {
      setCustomer(v.customers.full_name || '')
      setPhone(v.customers.phone || '')
    }
    setSearchPlate('')
    setPlateResults([])
  }

  const searchItem = (index: number, q: string) => {
    setItemSearch({ ...itemSearch, [index]: q })
    if (q.length < 1) {
      setItemResults({ ...itemResults, [index]: [] })
      return
    }
    const filtered = parts.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    setItemResults({ ...itemResults, [index]: filtered })
  }

  const selectItem = (index: number, part: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], name: part.name, price: part.price, part_id: part.id }
    setItems(newItems)
    setItemSearch({ ...itemSearch, [index]: '' })
    setItemResults({ ...itemResults, [index]: [] })
  }

  const addEmptyLine = () => {
    setItems([...items, { name: '', price: 0, qty: 1 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * (item.qty || 1), 0)
  const total = Math.max(0, subtotal - discount)

  const qrUrl = total > 0 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}`
    : ''

  const saveBill = async () => {
    if (items.length === 0) {
      setSaveMsg('ยังไม่มีรายการ')
      return
    }
    setSaving(true)
    setSaveMsg('')

    const supabase = createClient()

    const { error: billError } = await supabase.from('bills').insert({
      bill_no: billNo,
      customer_name: customer || null,
      phone: phone || null,
      license_plate: plate || null,
      car_info: car || null,
      mileage: parseInt(mileage) || null,
      items: items,
      discount: discount,
      total: total,
      note: note || null,
      branch_id: selectedBranch || null,
    })

    if (billError) {
      setSaveMsg('บันทึกบิลไม่สำเร็จ')
      setSaving(false)
      return
    }

    for (const item of items) {
      if (item.part_id && item.qty > 0) {
        const part = parts.find(p => p.id === item.part_id)
        if (part) {
          const newStock = Math.max(0, (part.stock || 0) - item.qty)
          await supabase.from('parts_services').update({ stock: newStock }).eq('id', item.part_id)
        }
      }
    }

    setSaveMsg('บันทึกบิลสำเร็จ!')
    setSaving(false)
  }

  const selectedBranchName = branches.find(b => b.id === selectedBranch)?.name || 'สนามบิน'
  const headerTitle = `รัษฎาแอร์ ${selectedBranchName}`

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto bg-white text-black p-5 text-[11px] font-sans">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="border-2 border-red-600 px-3 py-1">
            <div className="text-red-600 font-black text-lg tracking-wider">RATSADA</div>
          </div>
          <div className="text-right text-[10px]">
            <div>เลขที่ {billNo}</div>
            <div>{date}</div>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-base font-bold">{headerTitle}</h1>
          <p className="text-[9px] text-gray-600">Tel. 099-4102559 , 076-602429</p>
        </div>

        <h2 className="text-center font-bold text-sm mb-4 border-b border-black pb-1">ใบเสร็จรับเงิน / Receipt</h2>

        {/* เลือกสาขา */}
        <div className="mb-3 no-print">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full border p-2 text-black text-sm"
          >
            <option value="">-- เลือกสาขาที่ออกบิล --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* ข้อมูลลูกค้า */}
        <div className="grid grid-cols-2 gap-2 mb-4 no-print">
          <div className="relative">
            <input type="text" placeholder="ค้นหา/พิมพ์ชื่อลูกค้า" value={searchCust || customer} onChange={(e) => { setCustomer(e.target.value); searchCustomer(e.target.value) }} className="w-full border p-1.5 text-sm" />
            {custResults.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-32 overflow-y-auto text-sm">
                {custResults.map((c) => (
                  <div key={c.id} onClick={() => selectCustomer(c)} className="p-1.5 hover:bg-gray-100 cursor-pointer">{c.full_name}</div>
                ))}
              </div>
            )}
          </div>
          <input type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} className="border p-1.5 text-sm" />
          
          <div className="relative">
            <input type="text" placeholder="ค้นหา/พิมพ์ป้ายทะเบียน" value={searchPlate || plate} onChange={(e) => { setPlate(e.target.value); searchPlateFn(e.target.value) }} className="w-full border p-1.5 text-sm" />
            {plateResults.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-32 overflow-y-auto text-sm">
                {plateResults.map((v) => (
                  <div key={v.id} onClick={() => selectPlate(v)} className="p-1.5 hover:bg-gray-100 cursor-pointer">{v.license_plate} - {v.brand}</div>
                ))}
              </div>
            )}
          </div>
          <input type="text" placeholder="ยี่ห้อ/รุ่น" value={car} onChange={(e) => setCar(e.target.value)} className="border p-1.5 text-sm" />
          <input type="text" placeholder="เลขไมล์" value={mileage} onChange={(e) => setMileage(e.target.value)} className="border p-1.5 text-sm" />
        </div>

        <div className="hidden print:block text-[10px] mb-3 space-y-0.5">
          <div>ลูกค้า: {customer || '-'} &nbsp;|&nbsp; โทร: {phone || '-'}</div>
          <div>รถ: {car || '-'} &nbsp;|&nbsp; ทะเบียน: {plate || '-'} &nbsp;|&nbsp; ไมล์: {mileage || '-'}</div>
        </div>

        {/* ตารางรายการ */}
        <table className="w-full border-collapse border border-black text-[10px] mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1.5 text-left">รายการ</th>
              <th className="border border-black p-1.5 w-14 text-center">จำนวน</th>
              <th className="border border-black p-1.5 w-20 text-right">ราคา</th>
              <th className="border border-black p-1.5 w-20 text-right">รวม</th>
              <th className="border border-black p-1.5 w-6 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="border border-black p-1 relative">
                  <input 
                    type="text" 
                    value={itemSearch[i] !== undefined ? itemSearch[i] : item.name} 
                    onChange={(e) => { updateItem(i, 'name', e.target.value); searchItem(i, e.target.value) }} 
                    className="w-full no-print text-sm" 
                  />
                  <span className="hidden print:inline">{item.name}</span>
                  {itemResults[i]?.length > 0 && (
                    <div className="absolute z-20 bg-white border w-56 max-h-32 overflow-y-auto left-0 top-full text-xs">
                      {itemResults[i].map((p) => (
                        <div key={p.id} onClick={() => selectItem(i, p)} className="p-1.5 hover:bg-gray-100 cursor-pointer">
                          {p.name} - {Number(p.price).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border border-black p-1">
                  <input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', Number(e.target.value))} className="w-full text-center no-print text-sm" />
                  <span className="hidden print:inline text-center block">{item.qty}</span>
                </td>
                <td className="border border-black p-1">
                  <input type="number" value={item.price} onChange={(e) => updateItem(i, 'price', Number(e.target.value))} className="w-full text-right no-print text-sm" />
                  <span className="hidden print:inline text-right block">{Number(item.price).toLocaleString()}</span>
                </td>
                <td className="border border-black p-1 text-right">{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</td>
                <td className="border border-black p-1 text-center no-print">
                  <button onClick={() => removeItem(i)} className="text-red-500">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addEmptyLine} className="text-blue-600 text-sm no-print mb-3">+ เพิ่มบรรทัด</button>

        {/* สรุปยอด + QR */}
        <div className="flex justify-between items-start mt-2">
          <div className="text-[10px]">
            {total > 0 && qrUrl && (
              <div className="text-center">
                <p className="text-[9px] mb-1 text-gray-600">สแกนจ่าย PromptPay</p>
                <img src={qrUrl} alt="QR" className="border mx-auto" width={90} height={90} />
                <p className="text-[8px] mt-0.5">{total.toLocaleString()} บาท</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex justify-end gap-2 items-center text-sm">
              <span>ส่วนลด:</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="border w-20 text-right no-print text-sm" />
            </div>
            <div className="font-bold text-sm mt-2">รวมทั้งสิ้น: {total.toLocaleString()} บาท</div>
          </div>
        </div>

        <div className="mt-3 no-print">
          <textarea placeholder="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border p-1.5 text-sm" rows={2} />
        </div>

        {/* ลายเซ็น */}
        <div className="flex justify-between text-[9px] mt-10">
          <div className="text-center w-1/3">
            <div className="border-b border-black w-24 mx-auto mb-1 h-6"></div>
            ตรวจรับงานซ่อม
          </div>
          <div className="text-center w-1/3">
            ช่างซ่อม<br/>{date}
          </div>
          <div className="text-center w-1/3">
            <div className="border-b border-black w-24 mx-auto mb-1 h-6"></div>
            ผู้รับเงิน
          </div>
        </div>

        {/* ปุ่ม */}
        <div className="text-center mt-6 no-print flex gap-3 justify-center flex-wrap">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded text-sm">
            พิมพ์บิล A4
          </button>
          <button onClick={saveBill} disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded text-sm disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'บันทึกบิล + ตัดสต็อก'}
          </button>
        </div>
        {saveMsg && <p className="text-center mt-2 no-print text-sm">{saveMsg}</p>}
      </div>
    </>
  )
}
