export type DeskItem = {
  href: string
  label: string
  cap?: string
  admin?: boolean
}

export type Desk = {
  id: string
  title: string
  note: string
  items: DeskItem[]
}

export const DESKS: Desk[] = [
  {
    id: 'lookup',
    title: 'ค้นหาและประวัติ',
    note: 'สลับหัวข้อในแถบนี้ได้เลย ไม่ต้องกลับหน้าหลัก',
    items: [
      { href: '/search', label: 'ค้นหา', cap: 'search' },
      { href: '/bills', label: 'ประวัติบิล', cap: 'bills' },
      { href: '/bills-by-branch', label: 'บิลตามสาขา', cap: 'bills' },
      { href: '/history', label: 'ประวัติรถ', cap: 'history' },
      { href: '/jobs', label: 'งานซ่อม', cap: 'jobs' },
      { href: '/jobs-by-branch', label: 'งานตามสาขา', cap: 'jobs' },
      { href: '/warranty', label: 'รับประกัน', cap: 'warranty' },
    ],
  },
  {
    id: 'parts',
    title: 'อะไหล่และสต็อก',
    note: 'รายการสินค้ากับจำนวนคงเหลืออยู่ในชุดเดียวกัน',
    items: [
      { href: '/parts', label: 'อะไหล่ / บริการ', cap: 'parts' },
      { href: '/stock', label: 'สต็อก', cap: 'stock' },
    ],
  },
  {
    id: 'customers',
    title: 'ลูกค้า',
    note: 'รายชื่อ การเพิ่มลูกค้า และการเพิ่มรถอยู่ในชุดเดียวกัน',
    items: [
      { href: '/customers', label: 'รายชื่อลูกค้า', cap: 'customers' },
      { href: '/customer/new', label: 'เพิ่มลูกค้า', cap: 'customers' },
      { href: '/vehicle/new', label: 'เพิ่มรถ', cap: 'customers' },
    ],
  },
  {
    id: 'money',
    title: 'รายงาน',
    note: 'ยอดเงินทุกแบบสลับได้จากแถบนี้',
    items: [
      { href: '/report', label: 'รายวัน', cap: 'reports' },
      { href: '/report-advanced', label: 'ช่วงเวลา', cap: 'reports' },
      { href: '/sales', label: 'ยอดขาย', cap: 'sales' },
      { href: '/daily-close', label: 'ปิดยอดวัน', cap: 'daily_close' },
      { href: '/credit', label: 'ลูกหนี้', cap: 'credit' },
      { href: '/summary', label: 'ทุกสาขา', cap: 'summary' },
      { href: '/dashboard', label: 'ภาพรวม', cap: 'reports' },
    ],
  },
  {
    id: 'shop',
    title: 'ดูแลร้าน',
    note: 'งานตั้งค่าร้านอยู่ชุดนี้ที่เดียว สลับได้จากแถบนี้',
    items: [
      { href: '/approvals', label: 'อนุมัติ', admin: true },
      { href: '/access', label: 'กำหนดสิทธิ์', cap: 'access' },
      { href: '/employees', label: 'พนักงาน', cap: 'employees' },
      { href: '/branches', label: 'สาขา', cap: 'branches' },
      { href: '/import-bills', label: 'นำเข้าบิล', cap: 'import_bills' },
      { href: '/backup', label: 'สำรองข้อมูล', cap: 'backup' },
    ],
  },
]

export function deskById(id: string) {
  return DESKS.find((desk) => desk.id === id)
}

export function canOpenDeskItem(
  item: DeskItem,
  can: (cap: string) => boolean,
  role?: string | null,
) {
  if (item.admin && role !== 'admin') return false
  if (item.cap && !can(item.cap)) return false
  return true
}

export function firstDeskHref(
  id: string,
  can: (cap: string) => boolean,
  role?: string | null,
) {
  const desk = deskById(id)
  if (!desk) return ''
  return desk.items.find((item) => canOpenDeskItem(item, can, role))?.href || ''
}
// home cards and the in-page bars share this desk list
