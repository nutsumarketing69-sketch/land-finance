export default function HomePage() {
  const menus = [
    { name: 'รับรถ / ค้นหาป้ายทะเบียน', href: '/receive', color: 'bg-blue-600' },
    { name: 'เลือกอะไหล่ / บริการ', href: '/parts', color: 'bg-green-600' },
    { name: 'ประวัติงานซ่อม', href: '/history', color: 'bg-purple-600' },
    { name: 'รายชื่อพนักงาน', href: '/employees', color: 'bg-orange-600' },
    { name: 'เลือกสาขา', href: '/branches', color: 'bg-teal-600' },
    { name: 'อัปโหลดรูปรถ', href: '/upload', color: 'bg-pink-600' },
    { name: 'ดูบิลตัวอย่าง', href: '/receipt', color: 'bg-red-600' },
    { name: 'แดชบอร์ด', href: '/dashboard', color: 'bg-gray-600' },
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">ระบบร้านแอร์รถยนต์</h1>
        <p className="text-center text-gray-400 mb-8">รัษฎาแอร์ สนามบิน</p>

        <div className="grid md:grid-cols-2 gap-4">
          {menus.map((menu) => (
            <a
              key={menu.href}
              href={menu.href}
              className={`${menu.color} hover:opacity-90 text-white p-6 rounded-lg text-center font-medium transition`}
            >
              {menu.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
