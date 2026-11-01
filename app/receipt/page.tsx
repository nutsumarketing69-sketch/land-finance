'use client'

import { useState, useEffect } from 'react'

export default function ReceiptPage() {
  const [date, setDate] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [discount, setDiscount] = useState(0)
  const [billNo, setBillNo] = useState('')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('th-TH'))
    const saved = localStorage.getItem('selectedItems')
    if (saved) setItems(JSON.parse(saved))
    
    // สร้างเลขที่บิลแบบไม่ซ้ำ
    const now = new Date()
    const no = `68-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
    setBillNo(no)
  }, [])

  const updateQty = (index: number, qty: number) => {
    const newItems = [...items]
    newItems[index].qty = qty
    setItems(newItems)
  }

  const updatePrice = (index: number, price: number) => {
    const newItems = [...items]
    newItems[index].price = price
    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)
  const total = subtotal - discount

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto bg-white text-black p-6 text-[11px]">
        <div className="flex justify-between mb-2">
          <div className="border-2 border-red-600 px-3 py-1">
            <span className="text-red-600 font-bold text-lg">RATSADA</span>
          </div>
          <div>เลขที่ {billNo}</div>
        </div>

        <div className="text-center mb-3">
          <h1 className="text-lg font-bold">รัษฎาแอร์ สนามบิน</h1>
          <p className="text-[9px]">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-3">ใบเสร็จรับเงิน/Receipt</h2>
        <div className="text-right mb-2">{date}</div>

        <table className="w-full border-collapse border border-black text-[10px] mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1">รายการ</th>
              <th className="border border-black p-1 w-14">จำนวน</th>
              <th className="border border-black p-1 w-20">ราคา</th>
              <th className="border border-black p-1 w-20">รวม</th>
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
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="border border-black p-1 text-right">ส่วนลด</td>
              <td className="border border-black p-1">
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full text-right no-print" />
                <span className="hidden print:inline">{discount.toLocaleString()}</span>
              </td>
            </tr>
            <tr className="font-bold">
              <td colSpan={3} className="border border-black p-1 text-right">รวมทั้งสิ้น</td>
              <td className="border border-black p-1 text-right">{total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-center mt-6 no-print">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded">
            พิมพ์บิล A4
          </button>
        </div>
      </div>
    </>
  )
}
