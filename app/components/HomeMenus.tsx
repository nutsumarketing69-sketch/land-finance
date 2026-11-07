'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'
import { firstDeskHref } from '@/lib/desks'

const DAILY: { name: string; desc: string; href: string; icon: string; cap?: string }[] = [
  { name: 'เข้างาน', desc: 'ถ่ายรูป แล้วรออนุมัติในกลุ่ม', href: '/attendance', icon: '⏰', cap: 'clock' },
  { name: 'รับรถ', desc: 'เปิดงานใหม่ ค้นป้าย และถ่ายรถ', href: '/receive', icon: '🚗', cap: 'receive' },
  { name: 'นัดรับรถ', desc: 'วันนี้ เลยกำหนด และวันหน้า', href: '/pickup', icon: '📅', cap: 'jobs' },
  { name: 'ออกบิล', desc: 'ทำใบเสร็จ พิมพ์ และบันทึก', href: '/receipt', icon: '🧾', cap: 'receipt' },
  { name: 'คิวพิมพ์', desc: 'พิมพ์บิลที่เครื่องสาขา', href: '/print-queue', icon: '🖨️', cap: 'receipt' },
  { name: 'ส่งรูป', desc: 'รูปและคลิปเข้ากลุ่มเทเลแกรม', href: '/send-media', icon: '📸', cap: 'media' },
  { name: 'ลูกหนี้', desc: 'ยอดค้าง และบันทึกเมื่อรับเงิน', href: '/credit', icon: '📒', cap: 'credit' },
  { name: 'ปิดยอดวัน', desc: 'สรุปเงินก่อนเลิกงาน', href: '/daily-close', icon: '🌙', cap: 'daily_close' },
]

const HUBS: { desk: string; name: string; desc: string; icon: string }[] = [
  { desk: 'lookup', name: 'ค้นหาและประวัติ', desc: 'ค้นรถ ค้นบิล เปิดใบจริงตามสาขา งาน และรับประกัน', icon: '🔍' },
  { desk: 'parts', name: 'อะไหล่และสต็อก', desc: 'รายการสินค้ากับจำนวนคงเหลือ', icon: '🔧' },
  { desk: 'customers', name: 'ลูกค้า', desc: 'รายชื่อ เพิ่มลูกค้า และเพิ่มรถ', icon: '👥' },
  { desk: 'money', name: 'รายงาน', desc: 'รายวัน ยอดขาย ปิดยอด สาขา และภาพรวม', icon: '📊' },
]

function Card({ href, icon, name, desc, badge }: { href: string; icon: string; name: string; desc: string; badge?: string }) {
  return (
    <a
      href={href}
      className="group relative rounded-2xl border border-gray-800 bg-gray-900 p-3 text-center transition-all duration-200 hover:border-red-500/60 hover:bg-gray-800 hover:shadow-lg hover:shadow-red-900/20 sm:p-6"
    >
      {badge && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">{badge}</span>}
      <div className="mb-2 text-3xl sm:text-4xl">{icon}</div>
      <div className="font-semibold text-white group-hover:text-red-300">{name}</div>
      <div className="mt-1 text-xs leading-tight text-gray-400">{desc}</div>
    </a>
  )
}

export default function HomeMenus() {
  const { can, ready, account } = useAccess()
  const [pending, setPending] = useState<number | null>(null)
  const admin = account?.role === 'admin'

  useEffect(() => {
    if (!admin || account?.status !== 'approved') return
    createClient()
      .from('staff_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPending(count ?? 0))
  }, [admin, account?.status])

  if (!ready) return <p className="text-sm text-gray-400">กำลังจัดเมนู...</p>

  const daily = DAILY.filter((item) => !item.cap || can(item.cap))
  const hubs = HUBS
    .map((item) => ({ ...item, href: firstDeskHref(item.desk, can, account?.role) }))
    .filter((item) => item.href)
  const shopHref = firstDeskHref('shop', can, account?.role)

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold text-white">งานวันนี้</h2>
        <p className="mt-1 text-sm text-gray-400">เรียงตามลำดับที่ใช้ในร้าน ตั้งแต่เข้างานจนปิดยอด</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {daily.map((item) => <Card key={item.href} {...item} />)}
        </div>
      </section>

      {hubs.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white">ดูข้อมูลและจัดการ</h2>
          <p className="mt-1 text-sm text-gray-400">กดครั้งเดียว แล้วสลับหัวข้อย่อยในหน้านั้นได้ โดยไม่ต้องกลับมาหน้านี้</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {hubs.map((item) => <Card key={item.desk} href={item.href} icon={item.icon} name={item.name} desc={item.desc} />)}
          </div>
        </section>
      )}

      {shopHref && (
        <section>
          <h2 className="text-lg font-bold text-white">{admin ? 'ผู้ดูแลระบบ' : 'ดูแลร้าน'}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {admin
              ? 'อนุมัติ สิทธิ์ พนักงาน สาขา นำเข้าบิล และสำรองข้อมูลอยู่ชุดนี้ที่เดียว'
              : 'พนักงาน สาขา และนำเข้าบิลอยู่ชุดนี้ที่เดียว'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            <Card
              href={shopHref}
              icon="🔐"
              name={admin ? 'ผู้ดูแลระบบ' : 'ดูแลร้าน'}
              desc={pending ? `มีคนรออนุมัติ ${pending} คน` : admin ? 'อนุมัติ สิทธิ์ พนักงาน สาขา นำเข้า และสำรอง' : 'พนักงาน สาขา และนำเข้าบิล'}
              badge={pending ? String(pending) : undefined}
            />
          </div>
        </section>
      )}
    </div>
  )
}
// the home screen keeps the daily work first and groups the rest
// bill history includes the branch choice on the same page
// clock in waits for a telegram approval before the monthly sheet
