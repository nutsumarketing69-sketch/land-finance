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
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="p-4 max-w-[210mm] mx-auto bg-white text-black print:p-0 print:max-w-none">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <div className="text-2xl font-bold text-red-600">RATSADA</div>
              <div className="text-xs">air</div>
            </div>
            <div className="text-right text-sm">เลขที่ 68-106</div>
          </div>
          <h1 className="text-lg font-bold mt-1">รัษฎาแอร์ สนามบิน</h1>
          <p className="text-xs">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
          <p className="text-xs">Tel. 099-4102559 , 076-602429 Email.ratsada_air@hotmail.com</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-3">ใบเสร็จรับเงิน/Receipt</h2>

        {/* Customer Info */}
        <div className="flex justify-between mb-3 text-xs">
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
        <table className="w-full border-collapse border border-black text-xs mb-3">
          <thead>
            <tr>
              <th className="border border-black p-1 w-10">ลำดับ</th>
              <th className="border border-black p-1">รายการ</th>
              <th className="border border-black p-1 w-14">จำนวน</th>
              <th className="border border-black p-1 w-20">ราคา/หน่วย</th>
              <th className="border border-black p-1 w-20">จำนวนเงิน</th>
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

        <div className="bg-gray-300 text-center py-1 mb-6 text-xs">
          เจ็ดพันเก้าร้อยแปดสิบบาทถ้วน
        </div>

        {/* Signature */}
        <div className="flex justify-between text-xs mt-8">
          <div className="text-center w-1/3">
            <p>................................</p>
            <p>......../......../........</p>
            <p className="mt-1">ตรวจรับงานซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p>ช่างแอร์/ช่างเมะ</p>
            <p>{date}</p>
            <p className="mt-1">ช่างซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p>................................</p>
            <p>......../......../........</p>
            <p className="mt-1">ผู้รับเงิน</p>
          </div>
        </div>

        <div className="mt-6 text-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            พิมพ์บิล (A4)
          </button>
        </div>
      </div>
    </>
  )
}
