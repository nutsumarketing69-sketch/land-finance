export default function InvoicePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-28 sm:px-6">
      <div className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl">
        <div className="bg-gradient-to-b from-red-700 to-red-600 px-6 py-6 text-center text-white">
          <img src="/ratsada-logo.png" alt="รัษฎาแอร์" className="mx-auto h-16 w-16 rounded-2xl bg-white p-1.5" />
          <h1 className="mt-3 text-2xl font-bold">ออกบิลจริง</h1>
          <p className="mt-1 text-sm text-red-50">ใช้หน้าออกบิลของร้าน บิลตัวอย่างเดิมถูกเอาออกแล้ว</p>
        </div>
        <div className="space-y-3 px-5 py-6">
          <a href="/receipt" className="block rounded-xl bg-red-600 py-3 text-center font-semibold text-white">
            ไปหน้าออกบิล
          </a>
          <a href="/bills" className="block rounded-xl border border-red-200 py-3 text-center font-semibold text-red-700">
            ดูบิลที่บันทึกแล้ว
          </a>
          <p className="text-center text-xs leading-5 text-gray-500">
            พิมพ์จากหน้าออกบิลจะได้ใบเสร็จรูปแบบร้าน ไม่ใช่บิลตัวอย่าง
          </p>
        </div>
      </div>
    </div>
  )
}
