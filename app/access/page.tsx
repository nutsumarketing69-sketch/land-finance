'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStaff } from '@/app/components/AuthShell'
import { CAPS, explicitPermissions } from '@/lib/access'
import { ROLE_LABEL, type StaffAccount } from '@/lib/staff'

const ROLES = [
  { id: 'staff', label: 'พนักงาน' },
  { id: 'manager', label: 'ผู้จัดการสาขา' },
  { id: 'admin', label: 'ผู้ดูแลระบบ' },
]
const POSITIONS = ['พนักงานหน้าร้าน', 'ช่าง', 'ผู้จัดการสาขา']

export default function AccessPage() {
  const { account: me, ready } = useStaff()
  const [rows, setRows] = useState<StaffAccount[]>([])
  const [current, setCurrent] = useState('')
  const [role, setRole] = useState('staff')
  const [position, setPosition] = useState('พนักงานหน้าร้าน')
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await createClient()
      .from('staff_accounts')
      .select('id, user_id, username, full_name, phone, branch_id, position, requested_role, role, status, employee_id, permissions, created_at')
      .eq('status', 'approved')
      .order('full_name')
    if (res.error) setMsg(res.error.message)
    setRows((res.data || []) as StaffAccount[])
  }

  useEffect(() => {
    if (ready && me?.role === 'admin') void load()
  }, [ready, me?.role])

  const open = (row: StaffAccount) => {
    setCurrent(row.id)
    setRole(row.role || 'staff')
    setPosition(row.position || 'พนักงานหน้าร้าน')
    setFlags(explicitPermissions(row))
    setMsg('')
  }

  const usePreset = () => {
    setFlags(explicitPermissions({ role, position, permissions: null }))
  }

  const save = async () => {
    const row = rows.find((item) => item.id === current)
    if (!row) return
    setBusy(true)
    const { error } = await createClient().rpc('set_staff_access', {
      account_id: row.id,
      new_role: role,
      new_position: position,
      new_permissions: flags,
    })
    setBusy(false)
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg(`บันทึกสิทธิ์ของ ${row.full_name} แล้ว เขาต้องเปิดหน้าใหม่หรือเข้าใหม่หนึ่งครั้ง`)
    await load()
  }

  const selected = rows.find((item) => item.id === current)
  const groups = [...new Set(CAPS.map((item) => item.group))]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">กำหนดสิทธิ์พนักงาน</h1>
      <p className="mt-2 text-sm text-gray-300">
        ช่างค่าเริ่มต้นไม่เห็นราคา แต่เปิดบิลได้ พนักงานหน้าร้านใช้งานหน้าร้าน ผู้จัดการสาขาส่งพิมพ์ข้ามสาขาได้
        หน้านี้เปิดปิดได้ทีละฟังก์ชัน การอนุมัติคนสมัครใหม่ยังทำได้เฉพาะผู้ดูแลระบบที่หน้าอนุมัติพนักงาน
      </p>
      {me?.role !== 'admin' && <p className="mt-4 text-amber-200">เฉพาะผู้ดูแลระบบกำหนดสิทธิ์ได้</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {rows.map((row) => (
            <button key={row.id} onClick={() => open(row)} className={`block w-full rounded-xl border px-3 py-2 text-left ${current === row.id ? 'border-red-500 bg-red-950/40' : 'border-gray-700'}`}>
              <div className="font-medium">{row.full_name}</div>
              <div className="text-xs text-gray-400">{row.username} · {ROLE_LABEL[row.role] || row.role} · {row.position || '-'}</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="rounded-2xl border border-gray-700 p-4">
            <h2 className="text-xl font-semibold">{selected.full_name}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-sm">ระดับ
                <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2">
                  {ROLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm">ตำแหน่ง
                <input list="positions" value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2" />
                <datalist id="positions">{POSITIONS.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
            </div>
            <button onClick={usePreset} className="mt-3 rounded-full border border-gray-500 px-4 py-2 text-sm">ใส่สิทธิ์มาตรฐานของระดับและตำแหน่งนี้</button>
            {groups.map((group) => (
              <div key={group} className="mt-4">
                <h3 className="font-semibold text-red-200">{group}</h3>
                <div className="mt-2 space-y-2">
                  {CAPS.filter((item) => item.group === group).map((item) => (
                    <label key={item.id} className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5"
                        checked={!!flags[item.id]}
                        disabled={item.id === 'access' && role === 'admin'}
                        onChange={(e) => setFlags({ ...flags, [item.id]: e.target.checked })}
                      />
                      <span><b>{item.label}</b><span className="block text-gray-400">{item.detail}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={save} disabled={busy} className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}</button>
            {msg && <p className="mt-3 text-amber-200">{msg}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
