'use client'

import { useAccess } from '@/app/components/AuthShell'
import AdminShortcut from '@/app/components/AdminShortcut'

const MENUS: { name: string; desc: string; href: string; icon: string; cap?: string }[] = [
  { name: 'รับรถ', desc: 'ค้นหาและรับงานใหม่', href: '/receive', icon: '🚗', cap: 'receive' },
  { name: 'ออกบิล', desc: 'สร้างและพิมพ์บิล', href: '/receipt', icon: '🧾', cap: 'receipt' },
  { name: 'เข้างาน', desc: 'ตอกบัตรก่อน 08:00 น.', href: '/attendance', icon: '⏰', cap: 'clock' },
  { name: 'ส่งรูป', desc: 'รูปและคลิปเข้าเทเลแกรม', href: '/send-media', icon: '📸', cap: 'media' },
  { name: 'นำเข้าบิล', desc: 'อัปโหลด Excel บิลเก่า', href: '/import-bills', icon: '📥', cap: 'import_bills' },
  { name: 'สำรองข้อมูล', desc: 'ส่งออก Excel ลูกค้าและบิล', href: '/backup', icon: '💾', cap: 'backup' },
  { name: 'สรุปทุกสาขา', desc: 'รายวัน เดือน ปี และช่วงที่เลือก', href: '/summary', icon: '🧮', cap: 'summary' },
  { name: 'กำหนดสิทธิ์', desc: 'เปิดปิดฟังก์ชันพนักงาน', href: '/access', icon: '🔐', cap: 'access' },
  { name: 'อะไหล่ / บริการ', desc: 'เลือกรายการและเพิ่มใหม่', href: '/parts', icon: '🔧', cap: 'parts' },
  { name: 'ประวัติงาน', desc: 'ดูประวัติรถแต่ละคัน', href: '/history', icon: '📋', cap: 'history' },
  { name: 'ค้นหาขั้นสูง', desc: 'ค้นป้าย ชื่อ และเลขที่บิล', href: '/search', icon: '🔍', cap: 'search' },
  { name: 'รายงานประจำวัน', desc: 'สรุปงานรายวัน', href: '/report', icon: '📊', cap: 'reports' },
  { name: 'รายงานขั้นสูง', desc: 'สรุปตามช่วงเวลา', href: '/report-advanced', icon: '📈', cap: 'reports' },
  { name: 'สต็อกอะไหล่', desc: 'จัดการจำนวนคงเหลือ', href: '/stock', icon: '📦', cap: 'stock' },
  { name: 'รับประกันงาน', desc: 'ตรวจสอบการรับประกัน', href: '/warranty', icon: '🛡️', cap: 'warranty' },
  { name: 'จัดการงาน', desc: 'ดูและเปลี่ยนสถานะงาน', href: '/jobs', icon: '⚙️', cap: 'jobs' },
  { name: 'ประวัติบิล', desc: 'ดูบิลที่บันทึกไว้', href: '/bills', icon: '📜', cap: 'bills' },
  { name: 'บิลตามสาขา', desc: 'ดูบิลแยกสาขา', href: '/bills-by-branch', icon: '🏢', cap: 'bills' },
  { name: 'พนักงาน', desc: 'เพิ่ม ลบ จัดการพนักงาน', href: '/employees', icon: '👤', cap: 'employees' },
  { name: 'ลูกค้า', desc: 'จัดการข้อมูลลูกค้า', href: '/customers', icon: '👥', cap: 'customers' },
  { name: 'สาขา', desc: 'จัดการสาขา', href: '/branches', icon: '🏪', cap: 'branches' },
  { name: 'แดชบอร์ด', desc: 'ภาพรวมระบบ', href: '/dashboard', icon: '🏠', cap: 'reports' },
  { name: 'อัปโหลดรูป', desc: 'ถ่ายรูปรถเข้าสู่ระบบ', href: '/upload', icon: '📷', cap: 'media' },
  { name: 'ยอดขายรายวัน', desc: 'สรุปบิลและยอดขาย', href: '/sales', icon: '💰', cap: 'sales' },
  { name: 'งานตามสาขา', desc: 'ดูงานแยกสาขา', href: '/jobs-by-branch', icon: '🏭', cap: 'jobs' },
  { name: 'คิวพิมพ์บิล', desc: 'พิมพ์บิลที่สาขา', href: '/print-queue', icon: '🖨️', cap: 'receipt' },
  { name: 'ปิดยอดวัน', desc: 'สรุปก่อนเลิกงาน', href: '/daily-close', icon: '🌙', cap: 'daily_close' },
]

export default function HomeMenus() {
  const { can, ready } = useAccess()
  const menus = MENUS.filter((item) => !item.cap || can(item.cap))
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      <AdminShortcut />
      {ready && menus.map((menu) => (
        <a
          key={menu.href}
          href={menu.href}
          className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-red-500/60 rounded-2xl p-3 sm:p-6 text-center transition-all duration-200 hover:shadow-lg hover:shadow-red-900/20"
        >
          <div className="text-3xl sm:text-4xl mb-2">{menu.icon}</div>
          <div className="font-semibold text-white group-hover:text-red-400">{menu.name}</div>
          <div className="text-xs text-gray-400 mt-1 leading-tight">{menu.desc}</div>
        </a>
      ))}
    </div>
  )
}
// backup menu is admin only
