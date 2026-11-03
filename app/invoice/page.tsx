'use client'

import { useState, useEffect } from 'react'

export default function InvoicePage() {
  const [date, setDate] = useState('')
  const [items] = useState([
    { name: 'น้ำยาแอร์ R134a', price: 800, qty: 1 },
    { name: 'ค่าแรงเติมน้ำยา', price: 300, qty: 1 },
  ])

  useEffect(() => {
    setDate(new Date().toLocaleDateString('th-TH'))
  }, [])

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6 text-center">บิลร้านแอร์รถยนต์</h1>
      
      <div className="border rounded-lg p-6">
        <div className="mb-4">
          <p><strong>วันที่:</strong> {date || 'กำลังโหลด...'}</p>
          <p><strong>สาขา:</strong> สาขา 1</p>
        </div>

        <table className="w-full mb-4">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">รายการ</th>
              <th className="text-right py-2">จำนวน</th>
              <th className="text-right py-2">ราคา</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-right py-2">{item.qty}</td>
                <td className="text-right py-2">{item.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right text-xl font-bold">
          รวมทั้งสิ้น: {total.toLocaleString()} บาท
        </div>

        <button 
          onClick={() => window.print()}
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          พิมพ์บิล
        </button>
      </div>
    </div>
  )
}
