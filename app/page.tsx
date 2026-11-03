export default function HomePage() {
  const menus = [
    { name: 'รับรถ', desc: 'ค้นหาและรับงานใหม่', href: '/receive', icon: '🚗' },
    { name: 'ออกบิล', desc: 'สร้างและพิมพ์บิล', href: '/receipt', icon: '🧾' },
    { name: 'อะไหล่ / บริการ', desc: 'เลือกรายการและเพิ่มใหม่', href: '/parts', icon: '🔧' },
    { name: 'ประวัติงาน', desc: 'ดูประวัติรถแต่ละคัน', href: '/history', icon: '📋' },
    { name: 'ค้นหาขั้นสูง', desc: 'ค้นหาจากทุกอย่าง', href: '/search', icon: '🔍' },
    { name: 'รายงานประจำวัน', desc: 'สรุปงานรายวัน', href: '/report', icon: '📊' },
    { name: 'รายงานขั้นสูง', desc: 'สรุปตามช่วงเวลา', href: '/report-advanced', icon: '📈' },
    { name: 'สต็อกอะไหล่', desc: 'จัดการจำนวนคงเหลือ', href: '/stock', icon: '📦' },
    { name: 'รับประกันงาน', desc: 'ตรวจสอบการรับประกัน', href: '/warranty', icon: '🛡️' },
    { name: 'จัดการงาน', desc: 'ดูและเปลี่ยนสถานะงาน', href: '/jobs', icon: '⚙️' },
    { name: 'ประวัติบิล', desc: 'ดูบิลที่บันทึกไว้', href: '/bills', icon: '📜' },
    { name: 'บิลตามสาขา', desc: 'ดูบิลแยกสาขา', href: '/bills-by-branch', icon: '🏢' },
    { name: 'พนักงาน', desc: 'เพิ่ม ลบ จัดการพนักงาน', href: '/employees', icon: '👤' },
    { name: 'ลูกค้า', desc: 'จัดการข้อมูลลูกค้า', href: '/customers', icon: '👥' },
    { name: 'สาขา', desc: 'จัดการสาขา', href: '/branches', icon: '🏪' },
    { name: 'แดชบอร์ด', desc: 'ภาพรวมระบบ', href: '/dashboard', icon: '🏠' },
    { name: 'อัปโหลดรูป', desc: 'ถ่ายรูปรถเข้าสู่ระบบ', href: '/upload', icon: '📷' },
    { name: 'ยอดขายรายวัน', desc: 'สรุปบิลและยอดขาย', href: '/sales', icon: '💰' },
    { name: 'งานตามสาขา', desc: 'ดูงานแยกสาขา', href: '/jobs-by-branch', icon: '🏭' },
    { name: 'คิวพิมพ์บิล', desc: 'พิมพ์บิลที่สาขา', href: '/print-queue', icon: '🖨️' },
    { name: 'ปิดยอดวัน', desc: 'สรุปก่อนเลิกงาน', href: '/daily-close', icon: '🌙' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <header className="bg-red-600 px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-white text-red-600 font-black px-3 py-2 rounded-xl text-xl sm:text-2xl tracking-wider">
            RATSADA
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">รัษฎาแอร์</h1>
            <p className="text-sm opacity-90">ระบบจัดการร้านแอร์รถยนต์แบบหลายสาขา</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {menus.map((menu) => (
            <a
              key={menu.href}
              href={menu.href}
              className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-red-500/60 rounded-2xl p-3 sm:p-6 text-center transition-all duration-200 hover:shadow-lg hover:shadow-red-900/20"
            >
              <div className="text-3xl sm:text-4xl mb-2">{menu.icon}</div>
              <div className="font-semibold text-white group-hover:text-red-400">
                {menu.name}
              </div>
              <div className="text-xs text-gray-400 mt-1 leading-tight">{menu.desc}</div>
            </a>
          ))}
        </div>

        <footer className="mt-10 text-center text-gray-500 text-sm space-y-1 break-words px-2">
          <p>Tel. 099-4102559 , 076-602429</p>
          <p>201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
        </footer>
      </main>
    </div>
  )
}
