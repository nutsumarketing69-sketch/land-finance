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
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11px;
          }
        }
      `}</style>

      <div className="p-4 max-w-[210mm] mx-auto bg-white text-black text-[11px] print:p-0 print:text-[10px]">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <div className="text-xl font-bold text-red-600 leading-tight">RATSADA</div>
              <div className="text-[9px]">air</div>
            </div>
            <div className="text-right text-[10px]">เลขที่ 68-106</div>
          </div>
          <h1 className="text-base font-bold mt-1">รัษฎาแอร์ สนามบิน</h1>
          <p className="text-[9px] leading-tight">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
          <p className="text-[9px]">Tel. 099-4102559 , 076-602429 Email.ratsada_air@hotmail.com</p>
        </div>

        <h2 className="text-lg font-bold text-center mb-2">ใบเสร็จรับเงิน/Receipt</h2>

        {/* Customer Info */}
        <div className="flex justify-between mb-2 text-[10px]">
          <div className="leading-tight">
            <p>สด</p>
            <p>รุ่นรถ <strong>TOYOTA YARIS'14</strong></p>
            <p>ทะเบียนรถ <strong>กร 8636 ภูเก็ต</strong></p>
          </div>
          <div className="text-right leading-tight">
            <p>{date}</p>
            <p>ชื่อลูกค้า/เบอร์โทร</p>
            <p>เลขที่ไมล์ <strong>239,255 km.</strong></p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[10px] mb-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-0.5 w-8">ลำดับ</th>
              <th className="border border-black p-0.5">รายการ</th>
              <th className="border border-black p-0.5 w-12">จำนวน</th>
              <th className="border border-black p-0.5 w-16">ราคา/หน่วย</th>
              <th className="border border-black p-0.5 w-16">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.no}>
                <td className="border border-black p-0.5 text-center">{item.no}</td>
                <td className="border border-black p-0.5">{item.name}</td>
                <td className="border border-black p-0.5 text-center">{item.qty}</td>
                <td className="border border-black p-0.5 text-right">{item.price.toLocaleString()}</td>
                <td className="border border-black p-0.5 text-right">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border border-black p-0.5 text-right text-red-600">ส่วนลด</td>
              <td className="border border-black p-0.5 text-right text-red-600">- {discount.toLocaleString()}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={4} className="border border-black p-0.5 text-right">รวม</td>
              <td className="border border-black p-0.5 text-right">{total.toLocaleString()}.00</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-300 text-center py-0.5 mb-4 text-[10px]">
          เจ็ดพันเก้าร้อยแปดสิบบาทถ้วน
        </div>

        {/* Signature */}
        <div className="flex justify-between text-[9px] mt-6">
          <div className="text-center w-1/3">
            <p className="mb-4">................................</p>
            <p>......../......../........</p>
            <p className="mt-1">ตรวจรับงานซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p>ช่างแอร์/ช่างเมะ</p>
            <p className="my-2">{date}</p>
            <p>ช่างซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p className="mb-4">................................</p>
            <p>......../......../........</p>
            <p className="mt-1">ผู้รับเงิน</p>
          </div>
        </div>

        <div className="mt-4 text-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-5 py-1.5 rounded text-sm"
          >
            พิมพ์บิล (A4)
          </button>
        </div>
      </div>
    </>
  )
}
