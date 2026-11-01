'use client'

import { useState, useEffect } from 'react'

export default function ReceiptPage() {
  const [date, setDate] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [discount, setDiscount] = useState(0)
  const [billNo, setBillNo] = useState('')
  const [customer, setCustomer] = useState('')
  const [plate, setPlate] = useState('')
  const [car, setCar] = useState('')
  const [mileage, setMileage] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const now = new Date()
    setDate(now.toLocaleDateString('th-TH'))
    
    const saved = localStorage.getItem('selectedItems')
    if (saved) setItems(JSON.parse(saved))

    const no = `68-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
    setBillNo(no)
  }, [])

  const updateQty = (index: number, qty: number) => {
    const newItems = [...items]
    newItems[index].qty = Math.max(1, qty)
    setItems(newItems)
  }

  const updatePrice = (index: number, price: number) => {
    const newItems = [...items]
    newItems[index].price = price
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)
  const total = Math.max(0, subtotal - discount)

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto bg-white text-black p-4 text-[10px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="border-2 border-red-600 px-2 py-1">
            <div className="text-red-600 font-bold text-base leading-tight">RATSADA</div>
            <div className="text-[7px] text-center">air</div>
          </div>
          <div className="text-right text-[9px]">เลขที่ {billNo}</div>
        </div>

        <div className="text-center mb-2">
          <h1 className="text-sm font-bold">รัษฎาแอร์ สนามบิน</h1>
          <p className="text-[8px]">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
          <p className="text-[8px]">Tel. 099-4102559 , 076-602429</p>
        </div>

        <h2 className="text-base font-bold text-center mb-2">ใบเสร็จรับเงิน/Receipt</h2>

        {/* ข้อมูลลูกค้า/รถ */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-[9px] no-print">
          <input type="text" placeholder="ชื่อลูกค้า" value={customer} onChange={(e) => setCustomer(e.target.value)} className="border p-1" />
          <input type="text" placeholder="ป้ายทะเบียน" value={plate} onChange={(e) => setPlate(e.target.value)} className="border p-1" />
          <input type="text" placeholder="ยี่ห้อ/รุ่น" value={car} onChange={(e) => setCar(e.target.value)} className="border p-1" />
          <input type="text" placeholder="เลขไมล์" value={mileage} onChange={(e) => setMileage(e.target.value)} className="border p-1" />
        </div>

        <div className="hidden print:block text-[9px] mb-2">
          <div className="flex justify-between">
            <span>ลูกค้า: {customer || '-'}</span>
            <span>{date}</span>
          </div>
          <div>รถ: {car || '-'} | ทะเบียน: {plate || '-'} | ไมล์: {mileage || '-'}</div>
        </div>

        {/* ตาราง */}
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">รายการ</th>
              <th className="border border-black p-1 w-12">จำนวน</th>
              <th className="border border-black p-1 w-16">ราคา</th>
              <th className="border border-black p-1 w-16">รวม</th>
              <th className="border border-black p-1 w-8 no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td className="border border-black p-1">{item.name}</td>
                <td className="border border-black p-1">
                  <input type="number" value={item.qty} onChange={(e) => updateQty(i, Number(e.target.value))} className="w-full text-center no-print" />
                  <span className="hidden print:inline">{item.qty}</span>
                </td>
                <td className="border border-black p-1">
                  <input type="number" value={item.price} onChange={(e) => updatePrice(i, Number(e.target.value))} className="w-full text-right no-print" />
                  <span className="hidden print:inline">{Number(item.price).toLocaleString()}</span>
                </td>
                <td className="border border-black p-1 text-right">{(Number(item.price) * item.qty).toLocaleString()}</td>
                <td className="border border-black p-1 text-center no-print">
                  <button onClick={() => removeItem(i)} className="text-red-500">×</button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border border-black p-1 text-right">ส่วนลด</td>
              <td className="border border-black p-1" colSpan={2}>
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full text-right no-print" />
                <span className="hidden print:inline">{discount.toLocaleString()}</span>
              </td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td colSpan={3} className="border border-black p-1 text-right">รวมทั้งสิ้น</td>
              <td className="border border-black p-1 text-right" colSpan={2}>{total.toLocaleString()} บาท</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 no-print">
          <textarea placeholder="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} className="w-full border p-1 text-[9px]" rows={2} />
        </div>

        <div className="bg-gray-200 text-center py-1 my-2 text-[9px]">
          {total.toLocaleString()} บาทถ้วน
        </div>

        {/* ลายเซ็น */}
        <div className="flex justify-between text-[8px] mt-6">
          <div className="text-center w-1/3">
            <div className="border-b border-black w-24 mx-auto mb-1"></div>
            <p>ตรวจรับงานซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p>ช่างซ่อม</p>
            <p className="my-2">{date}</p>
          </div>
          <div className="text-center w-1/3">
            <div className="border-b border-black w-24 mx-auto mb-1"></div>
            <p>ผู้รับเงิน</p>
          </div>
        </div>

        <div className="text-center mt-4 no-print">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded text-sm">
            พิมพ์บิล A4
          </button>
        </div>
      </div>
    </>
  )
}
