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
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-[210mm] mx-auto bg-white text-black p-6 print:p-4 text-[11px]">
        {/* Header with Logo area */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="border-2 border-red-600 px-3 py-1 inline-block">
              <span className="text-red-600 font-bold text-lg">RATSADA</span>
              <span className="text-[8px] block text-center">air</span>
            </div>
          </div>
          <div className="text-right text-[10px]">เลขที่ 68-106</div>
        </div>

        <div className="text-center mb-3">
          <h1 className="text-lg font-bold">รัษฎาแอร์ สนามบิน</h1>
          <p className="text-[9px]">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
          <p className="text-[9px]">Tel. 099-4102559 , 076-602429 Email.ratsada_air@hotmail.com</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-3">ใบเสร็จรับเงิน/Receipt</h2>

        {/* Info */}
        <div className="flex justify-between text-[10px] mb-2">
          <div>
            <p>สด</p>
            <p>รุ่นรถ <strong>TOYOTA YARIS'14</strong> &nbsp;&nbsp; ชื่อลูกค้า/เบอร์โทร</p>
            <p>ทะเบียนรถ <strong>กร 8636 ภูเก็ต</strong> &nbsp;&nbsp; เลขที่ไมล์ <strong>239,255 km.</strong></p>
          </div>
          <div className="text-right">{date}</div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 w-10">ลำดับ</th>
              <th className="border border-black p-1 text-left">รายการ</th>
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
                <td className="border border-black p-1 text-right">{item.price.toFixed(2)}</td>
                <td className="border border-black p-1 text-right">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border border-black p-1 text-right text-red-600 font-medium">ส่วนลด</td>
              <td className="border border-black p-1 text-right text-red-600">- {discount.toFixed(2)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={4} className="border border-black p-1 text-right">รวม</td>
              <td className="border border-black p-1 text-right">{total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-gray-300 text-center py-1 my-3 text-[10px]">
          เจ็ดพันเก้าร้อยแปดสิบบาทถ้วน
        </div>

        {/* Signatures */}
        <div className="flex justify-between text-[9px] mt-10">
          <div className="text-center w-1/3">
            <div className="border-b border-black w-32 mx-auto mb-1"></div>
            <p>......../......../........</p>
            <p className="mt-2">ตรวจรับงานซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <p>ช่างแอร์/ช่างเมะ</p>
            <p className="my-3">{date}</p>
            <p>ช่างซ่อม</p>
          </div>
          <div className="text-center w-1/3">
            <div className="border-b border-black w-32 mx-auto mb-1"></div>
            <p>......../......../........</p>
            <p className="mt-2">ผู้รับเงิน</p>
          </div>
        </div>

        <div className="text-center mt-6 print:hidden">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded">
            พิมพ์บิล A4
          </button>
        </div>
      </div>
    </>
  )
}
