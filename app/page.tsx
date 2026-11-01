export default function HomePage() {
  const menus = [
    { name: 'รับรถ', desc: 'ค้นหาและรับงาน', href: '/receive', icon: '🚗' },
    { name: 'ออกบิล', desc: 'สร้างและพิมพ์บิล', href: '/receipt', icon: '🧾' },
    { name: 'อะไหล่/บริการ', desc: 'เลือกรายการ', href: '/parts', icon: '🔧' },
    { name: 'ประวัติงาน', desc: 'ดูประวัติรถ', href: '/history', icon: '📋' },
    { name: 'รายงาน', desc: 'สรุปประจำวัน', href: '/report', icon: '📊' },
    { name: 'พนักงาน', desc: 'จัดการพนักงาน', href: '/employees', icon: '👤' },
    { name: 'สาขา', desc: 'เลือกสาขา', href: '/branches', icon: '🏢' },
    { name: 'อัปโหลดรูป', desc: 'ถ่ายรูปรถ', href: '/upload', icon: '📷' },
    { name: 'รับประกัน', desc: 'ตรวจสอบการรับประกัน', href: '/warranty', icon: '🛡️' },
    { name: 'ค้นหาขั้นสูง', desc: 'ค้นหาทุกอย่าง', href: '/search', icon: '🔍' },
    { name: 'รายงานขั้นสูง', desc: 'สรุปงานตามช่วงเวลา', href: '/report-advanced', icon: '📈' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="bg-red-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white text-red-600 font-bold px-3 py-1 rounded text-lg">
              RATSADA
            </div>
            <div>
              <h1 className="text-xl font-bold">รัษฎาแอร์ สนามบิน</h1>
              <p className="text-sm opacity-80">ระบบจัดการร้านแอร์รถยนต์</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menus.map((menu) => (
            <a
              key={menu.href}
              href={menu.href}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-5 text-center transition group"
            >
              <div className="text-3xl mb-2">{menu.icon}</div>
              <div className="font-semibold text-white group-hover:text-red-400">
                {menu.name}
              </div>
              <div className="text-xs text-gray-400 mt-1">{menu.desc}</div>
            </a>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-10 text-center text-gray-500 text-sm">
          <p>Tel. 099-4102559 , 076-602429</p>
          <p className="mt-1">201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
        </div>
      </div>
    </div>
  )
}
