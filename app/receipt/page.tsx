'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [sending, setSending] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [printerOnline, setPrinterOnline] = useState(false)
  const [printerAge, setPrinterAge] = useState<number | null>(null)

  const [searchCust, setSearchCust] = useState('')
  const [searchPlate, setSearchPlate] = useState('')
  const [custResults, setCustResults] = useState<any[]>([])
  const [plateResults, setPlateResults] = useState<any[]>([])
  const [itemSearch, setItemSearch] = useState<{ [key: number]: string }>({})
  const [itemResults, setItemResults] = useState<{ [key: number]: any[] }>({})

  const savedOnce = useRef(false)
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

  useEffect(() => {
    if (!selectedBranch) {
      setPrinterOnline(false)
      setPrinterAge(null)
      return
    }
    let stop = false
    const check = async () => {
      const supabase = createClient()
      const rpc = await supabase.rpc('printer_age', { bid: selectedBranch })
      let age: number | null = null
      if (!rpc.error && rpc.data !== null && rpc.data !== undefined) {
        age = Number(rpc.data)
      } else {
        const { data } = await supabase
          .from('printer_heartbeats')
          .select('last_seen')
          .eq('branch_id', selectedBranch)
          .maybeSingle()
        if (data?.last_seen) age = (Date.now() - new Date(data.last_seen).getTime()) / 1000
      }
      if (stop) return
      setPrinterAge(age)
      setPrinterOnline(age !== null && age < 90 && age > -300)
    }
    check()
    const timer = setInterval(check, 5000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [selectedBranch])

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
    if (q.length < 1) {
      setCustResults([])
      return
    }
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
    if (q.length < 1) {
      setPlateResults([])
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('vehicles')
      .select('*, customers(*)')
      .ilike('license_plate', `%${q}%`)
      .limit(5)
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
    setItemSearch((prev) => ({ ...prev, [index]: q }))
    if (q.length < 1) {
      setItemResults((prev) => ({ ...prev, [index]: [] }))
      return
    }
    const filtered = parts.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    setItemResults((prev) => ({ ...prev, [index]: filtered }))
  }

  const selectItem = (index: number, part: any) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      name: part.name,
      price: part.price,
      part_id: part.id,
    }
    setItems(newItems)
    setItemSearch((prev) => ({ ...prev, [index]: '' }))
    setItemResults((prev) => ({ ...prev, [index]: [] }))
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
  const qrUrl =
    total > 0
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://promptpay.io/${PROMPTPAY_ID}/${total}`)}`
      : ''

  const selectedBranchName = branches.find((b) => b.id === selectedBranch)?.name || ''
  const headerTitle = selectedBranchName ? `รัษฎาแอร์ ${selectedBranchName}` : 'รัษฎาแอร์'

  const persistBill = async () => {
    if (items.length === 0) return { ok: false, message: 'ยังไม่มีรายการ' }
    if (savedOnce.current) return { ok: true }

    const supabase = createClient()
    const { error: billError } = await supabase.from('bills').insert({
      bill_no: billNo,
      customer_name: customer || null,
      phone: phone || null,
      license_plate: plate || null,
      car_info: car || null,
      mileage: parseInt(mileage) || null,
      items,
      discount,
      total,
      note: note || null,
      branch_id: selectedBranch || null,
    })

    if (billError) return { ok: false, message: 'บันทึกบิลไม่สำเร็จ' }

    for (const item of items) {
      if (item.part_id && item.qty > 0) {
        const part = parts.find((p) => p.id === item.part_id)
        if (part) {
          const newStock = Math.max(0, (part.stock || 0) - item.qty)
          await supabase.from('parts_services').update({ stock: newStock }).eq('id', item.part_id)
        }
      }
    }

    savedOnce.current = true
    return { ok: true }
  }

  const saveBill = async () => {
    setSaving(true)
    setSaveMsg('')
    const result = await persistBill()
    setSaveMsg(result.ok ? 'บันทึกบิลสำเร็จ!' : result.message || 'บันทึกบิลไม่สำเร็จ')
    setSaving(false)
  }

  const sendToBranch = async () => {
    if (!selectedBranch) {
      setSaveMsg('เลือกสาขาก่อนส่งพิมพ์')
      return
    }
    if (items.length === 0) {
      setSaveMsg('ยังไม่มีรายการ')
      return
    }

    setSending(true)
    setSaveMsg('')
    const saved = await persistBill()
    if (!saved.ok) {
      setSaveMsg(saved.message || 'บันทึกบิลไม่สำเร็จ')
      setSending(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('print_jobs').insert({
      branch_id: selectedBranch,
      bill_no: billNo,
      status: 'pending',
      payload: {
        bill_no: billNo,
        date,
        headerTitle,
        branchName: selectedBranchName,
        customer,
        phone,
        plate,
        car,
        mileage,
        items,
        discount,
        subtotal,
        total,
        note,
      },
    })

    if (error) {
      setSaveMsg('บันทึกบิลแล้ว แต่ส่งพิมพ์ไม่สำเร็จ')
    } else if (printerOnline) {
      setSaveMsg(`ส่งพิมพ์ไป${headerTitle} แล้ว เครื่องที่สาขาจะพิมพ์เอง`)
    } else {
      setSaveMsg(`ส่งเข้าคิว${headerTitle} แล้ว พอคอมสาขาเปิดหน้าพิมพ์ จะพิมพ์เอง`)
    }
    setSending(false)
  }

  const ageText =
    printerAge === null
      ? ' (ยังไม่มีสัญญาณ)'
      : ` (สัญญาณ ${Math.max(0, Math.round(printerAge))} วินาทีที่แล้ว)`

  return (
    <>
      <style jsx global>{`
        .bill-sheet {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          color: #111;
          padding: 16px 18px 20px;
          font-family: "Leelawadee UI", Tahoma, sans-serif;
          font-size: 12px;
          line-height: 1.35;
        }
        .bill-sheet input,
        .bill-sheet select,
        .bill-sheet textarea {
          background: #fff !important;
          color: #111 !important;
          border: 1px solid #ccc !important;
          border-radius: 2px;
          font-family: inherit;
        }
        .bill-table { width: 100%; border-collapse: collapse; }
        .bill-table th, .bill-table td {
          border: 1px solid #222;
          padding: 4px 6px;
          font-size: 12px;
          vertical-align: middle;
        }
        .bill-table th { background: #f3f3f3; font-weight: 600; }
        .only-print { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; }
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          span.only-print { display: inline !important; }
          .bill-sheet { max-width: none !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
          .bill-table th, .bill-table td { padding: 3px 6px !important; font-size: 11px !important; }
        }
      `}</style>

      <div className="bill-sheet">
        <div className="flex justify-between items-start">
          <div className="border-2 border-red-600 px-2.5 py-1">
            <div className="text-red-600 font-black text-lg tracking-wider leading-none">RATSADA</div>
          </div>
          <div className="text-right text-[11px] leading-snug">
            <div>เลขที่ {billNo}</div>
            <div>{date}</div>
          </div>
        </div>

        <div className="text-center mt-3 mb-1">
          <h1 className="text-[15px] font-bold leading-tight">{headerTitle}</h1>
          <p className="text-[9px] text-gray-700 mt-1">
            201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110
          </p>
          <p className="text-[9px] text-gray-700">
            Tel. 099-4102559 , 076-602429 &nbsp; Email. ratsada_air@hotmail.com
          </p>
        </div>

        <h2 className="text-center font-bold text-[13px] mt-2 mb-3 border-b border-black pb-1">
          ใบเสร็จรับเงิน / Receipt
        </h2>

        <div className="mb-3 no-print">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full p-2 text-sm"
          >
            <option value="">-- เลือกสาขาที่ออกบิล --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {selectedBranch && (
            <p className={`text-xs mt-1 ${printerOnline ? 'text-green-700' : 'text-amber-700'}`}>
              {printerOnline
                ? `เครื่องพิมพ์${headerTitle} พร้อม ใบนี้จะออกที่สาขาทันที`
                : `คอม${headerTitle} ยังไม่ได้เปิดหน้าพิมพ์ บิลจะค้างในคิว พอเปิดแล้วพิมพ์เอง`}
              {ageText}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 no-print">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหา/พิมพ์ชื่อลูกค้า"
              value={searchCust || customer}
              onChange={(e) => {
                setCustomer(e.target.value)
                searchCustomer(e.target.value)
              }}
              className="w-full p-1.5 text-sm"
            />
            {custResults.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-32 overflow-y-auto text-sm">
                {custResults.map((c) => (
                  <div key={c.id} onClick={() => selectCustomer(c)} className="p-1.5 hover:bg-gray-100 cursor-pointer">
                    {c.full_name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input type="text" placeholder="เบอร์โทร" value={phone} onChange={(e) => setPhone(e.target.value)} className="p-1.5 text-sm" />

          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหา/พิมพ์ป้ายทะเบียน"
              value={searchPlate || plate}
              onChange={(e) => {
                setPlate(e.target.value)
                searchPlateFn(e.target.value)
              }}
              className="w-full p-1.5 text-sm"
            />
            {plateResults.length > 0 && (
              <div className="absolute z-10 bg-white border w-full max-h-32 overflow-y-auto text-sm">
                {plateResults.map((v) => (
                  <div key={v.id} onClick={() => selectPlate(v)} className="p-1.5 hover:bg-gray-100 cursor-pointer">
                    {v.license_plate} - {v.brand}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input type="text" placeholder="ยี่ห้อ/รุ่น" value={car} onChange={(e) => setCar(e.target.value)} className="p-1.5 text-sm" />
          <input type="text" placeholder="เลขไมล์" value={mileage} onChange={(e) => setMileage(e.target.value)} className="p-1.5 text-sm" />
        </div>

        <div className="only-print text-[11px] mb-2 leading-snug">
          <div>ลูกค้า: {customer || '-'} &nbsp;|&nbsp; โทร: {phone || '-'}</div>
          <div>รถ: {car || '-'} &nbsp;|&nbsp; ทะเบียน: {plate || '-'} &nbsp;|&nbsp; ไมล์: {mileage || '-'}</div>
        </div>

        <table className="bill-table">
          <thead>
            <tr>
              <th className="text-left">รายการ</th>
              <th className="w-14 text-center">จำนวน</th>
              <th className="w-20 text-right">ราคา</th>
              <th className="w-20 text-right">รวม</th>
              <th className="w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="relative">
                  <input
                    type="text"
                    value={itemSearch[i] ? itemSearch[i] : item.name || ''}
                    onChange={(e) => {
                      updateItem(i, 'name', e.target.value)
                      searchItem(i, e.target.value)
                    }}
                    className="w-full no-print text-sm px-1"
                  />
                  <span className="only-print">{item.name}</span>
                  {itemResults[i]?.length > 0 && (
                    <div className="absolute z-20 bg-white border w-64 max-h-36 overflow-y-auto left-0 top-full text-xs no-print">
                      {itemResults[i].map((p) => (
                        <div key={p.id} onClick={() => selectItem(i, p)} className="p-1.5 hover:bg-gray-100 cursor-pointer">
                          {p.name} - {Number(p.price).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <input type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', Number(e.target.value))} className="w-full text-center no-print text-sm" />
                  <span className="only-print">{item.qty}</span>
                </td>
                <td>
                  <input type="number" value={item.price} onChange={(e) => updateItem(i, 'price', Number(e.target.value))} className="w-full text-right no-print text-sm" />
                  <span className="only-print">{Number(item.price || 0).toLocaleString()}</span>
                </td>
                <td className="text-right">{(Number(item.price || 0) * (item.qty || 1)).toLocaleString()}</td>
                <td className="text-center no-print">
                  <button onClick={() => removeItem(i)} className="text-red-600">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addEmptyLine} className="mt-2 text-blue-700 text-sm no-print">+ เพิ่มบรรทัด</button>

        <div className="flex justify-between items-end mt-3">
          <div>
            {total > 0 && qrUrl && (
              <div className="text-center">
                <p className="text-[9px] mb-1 text-gray-600">สแกนจ่าย PromptPay</p>
                <img src={qrUrl} alt="QR PromptPay" className="border mx-auto" width={80} height={80} />
                <p className="text-[9px] mt-0.5">{total.toLocaleString()} บาท</p>
              </div>
            )}
          </div>
          <div className="text-right text-[12px] leading-snug">
            <div>ยอดรวม: {subtotal.toLocaleString()} บาท</div>
            <div className="flex justify-end items-center gap-2">
              <span>ส่วนลด:</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 text-right no-print text-sm px-1" />
              <span className="only-print">{Number(discount || 0).toLocaleString()} บาท</span>
            </div>
            <div className="font-bold text-[13px] mt-1">รวมทั้งสิ้น: {total.toLocaleString()} บาท</div>
          </div>
        </div>

        <div className="mt-3 no-print">
          <textarea placeholder="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-1.5 text-sm" rows={2} />
        </div>
        {note ? <div className="only-print mt-2 text-[11px]">หมายเหตุ: {note}</div> : null}

        <div className="flex justify-between text-[10px] mt-8">
          <div className="text-center w-1/3">
            <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
            ตรวจรับงานซ่อม
          </div>
          <div className="text-center w-1/3 pt-5">
            ช่างซ่อม<br />{date}
          </div>
          <div className="text-center w-1/3">
            <div className="border-b border-black w-28 mx-auto mb-1 h-7"></div>
            ผู้รับเงิน
          </div>
        </div>

        <div className="text-center mt-5 no-print flex gap-3 justify-center flex-wrap">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2 rounded text-sm">
            พิมพ์ที่เครื่องนี้
          </button>
          <button onClick={saveBill} disabled={saving} className="bg-gray-700 text-white px-5 py-2 rounded text-sm disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'บันทึกบิล + ตัดสต็อก'}
          </button>
          <button onClick={sendToBranch} disabled={sending} className="bg-green-600 text-white px-5 py-2 rounded text-sm disabled:opacity-50">
            {sending ? 'กำลังส่ง...' : 'ส่งพิมพ์ไปสาขานี้'}
          </button>
        </div>
        {saveMsg && <p className="text-center mt-2 no-print text-sm">{saveMsg}</p>}
      </div>
    </>
  )
}
