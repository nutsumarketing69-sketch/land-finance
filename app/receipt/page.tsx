'use client'

import { useState, useEffect } from 'react'

export default function ReceiptPage() {
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('th-TH'))
  }, [])

  const items = [
    { no: 1, name: 'คอมเพรสเซอร์ ใหม่Oem', qty: 1, price: 5780, amount: 5780 },
    { no: 2, name: 'ศรษารจน์น้ำยาแอร์', qty: 2, price: 150, amount: 300 },
    { no: 3, name: 'โอริง', qty: 2, price: 50, amount: 100 },
    { no: 4, name: 'ฟิลเตอร์แอร์', qty: 1, price: 450, amount: 450 },
    { no: 5, name: 'แว็คคั่ม เติมน้ำยาแอร์', qty: 1, price: 800, amount: 800 },
    { no: 6, name: 'น้ำมันคอมฯ', qty: 1, price: 200, amount: 200 },
    { no: 7, name: 'ค่าแรง ถอดประกอบ', qty: 1, price: 800, amount: 800 },
  ]

  const discount = 450
  const total = items.reduce((sum, item) => sum + item.amount, 0) - discount

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black print:p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <div className="text-2xl font-bold text-red-600">RATSADA</div>
            <div className="text-sm">air</div>
          </div>
          <div className="text-right text-sm">เลขที่ 68-106</div>
        </div>
        <h1 className="text-xl font-bold mt-2">รัษฎาแอร์ สนามบิน</h1>
        <p className="text-sm">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
        <p className="text-sm">Tel. 099-4102559 , 076-602429 Email.ratsada_air@hotmail.com</p>
      </div>

      <h2 className="text-2xl font-bold text-center mb-4">ใบเสร็จรับเงิน/Receipt</h2>

      {/* Customer Info */}
      <div className="flex justify-between mb-4 text-sm">
        <div>
          <p>สด</p>
          <p>รุ่นรถ <strong>TOYOTA YARIS'14</strong></p>
          <p>ทะเบียนรถ <strong>กร 8636 ภูเก็ต</strong></p>
        </div>
        <div className="text-right">
          <p>{date}</p>
          <p>ชื่อลูกค้า/เบอร์โทร</p>
          <p>เลขที่ไมล์ <strong>239,255 km.</strong></p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black text-sm mb-4">
        <thead>
          <tr className="border border-black">
            <th className="border border-black p-1 w-12">ลำดับ</th>
            <th className="border border-black p-1">รายการ</th>
            <th className="border border-black p-1 w-16">จำนวน</th>
            <th className="border border-black p-1 w-24">ราคา/หน่วย</th>
            <th className="border border-black p-1 w-24">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.no}>
              <td className="border border-black p-1 text-center">{item.no}</td>
              <td className="border border-black p-1">{item.name}</td>
              <td className="border border-black p-1 text-center">{item.qty}</td>
              <td className="border border-black p-1 text-right">{item.price.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">{item.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="border border-black p-1 text-right text-red-600">ส่วนลด</td>
            <td className="border border-black p-1 text-right text-red-600">- {discount.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan={4} className="border border-black p-1 text-right font-bold">รวม</td>
            <td className="border border-black p-1 text-right font-bold">{total.toLocaleString()}.00</td>
          </tr>
        </tbody>
      </table>

      <div className="bg-gray-300 text-center py-2 mb-8 text-sm">
        เจ็ดพันเก้าร้อยแปดสิบบาทถ้วน
      </div>

      {/* Signature */}
      <div className="flex justify-between text-sm mt-12">
        <div className="text-center">
          <p>................................</p>
          <p>......../......../........</p>
          <p>ตรวจรับงานซ่อม</p>
        </div>
        <div className="text-center">
          <p>ช่างแอร์/ช่างเมะ</p>
          <p>{date}</p>
          <p>ช่างซ่อม</p>
        </div>
        <div className="text-center">
          <p>................................</p>
          <p>......../......../........</p>
          <p>ผู้รับเงิน</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded print:hidden"
        >
          พิมพ์บิล
        </button>
      </div>
    </div>
  )
}
