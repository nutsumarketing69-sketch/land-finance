'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

type Punch = {
  id: string
  user_id: string
  full_name: string
  work_date: string
  clocked_at: string
  late_minutes: number
  branch_id: string | null
}

type Person = { user_id: string; full_name: string; branch_id: string | null }

function bangkokNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    label: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }),
  }
}

function monthRange(value: string) {
  const [year, month] = value.split('-').map(Number)
  const last = new Date(year, month, 0).getDate()
  return { from: `${value}-01`, to: `${value}-${String(last).padStart(2, '0')}`, days: last }
}

function shrink(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, 1280 / (img.width || 1280))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        resolve(blob || file)
      }, 'image/jpeg', 0.72)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export default function AttendancePage() {
  const { account, can } = useAccess()
  const seeAll = can('clock_all')
  const [month, setMonth] = useState(() => bangkokNow().date.slice(0, 7))
  const [rows, setRows] = useState<Punch[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [preview, setPreview] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const now = bangkokNow()

  const load = async () => {
    const supabase = createClient()
    const range = monthRange(month)
    const [punchRes, branchRes, roster] = await Promise.all([
      supabase.from('attendance').select('id, user_id, full_name, work_date, clocked_at, late_minutes, branch_id').gte('work_date', range.from).lte('work_date', range.to).order('clocked_at'),
      supabase.from('branches').select('id, name'),
      supabase.rpc('attendance_roster'),
    ])
    setRows((punchRes.data || []) as Punch[])
    setBranches(branchRes.data || [])
    const rosterRows = (roster.data || []) as Person[]
    setPeople(rosterRows.length ? rosterRows : account ? [{ user_id: account.user_id, full_name: account.full_name, branch_id: account.branch_id }] : [])
    if (punchRes.error) setMsg(punchRes.error.message)
  }

  useEffect(() => { void load() }, [month, account?.user_id])

  const punch = async (file?: File) => {
    if (!file || !account) return
    const clock = bangkokNow()
    setBusy(true)
    setMsg('กำลังบันทึกเวลาเข้างาน')
    const supabase = createClient()
    const existing = await supabase.from('attendance').select('clocked_at, late_minutes').eq('user_id', account.user_id).eq('work_date', clock.date).maybeSingle()
    if (existing.data) {
      setBusy(false)
      setMsg(`วันนี้เข้างานแล้วเมื่อ ${new Date(existing.data.clocked_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })}`)
      return
    }
    const late = Math.max(0, clock.hour * 60 + clock.minute - 8 * 60)
    const blob = await shrink(file)
    const photo = new File([blob], 'clock.jpg', { type: 'image/jpeg' })
    const url = URL.createObjectURL(photo.size ? photo : file)
    setPreview(url)
    const branchName = branches.find((item) => item.id === account.branch_id)?.name || 'ไม่ระบุสาขา'
    const body = new FormData()
    body.append('photo', photo.size ? photo : file, 'clock.jpg')
    body.append('caption', [
      'เข้างาน รัษฎาแอร์',
      `ชื่อ: ${account.full_name}`,
      `สาขา: ${branchName}`,
      `เวลา: ${clock.label}`,
      late ? `สถานะ: มาสาย ${late} นาที` : 'สถานะ: ตรงเวลา',
    ].join('\n'))
    const sent = await fetch('/telegram', { method: 'POST', body })
    const result = await sent.json().catch(() => ({ ok: false, message: 'ส่งเทเลแกรมไม่สำเร็จ' }))
    const saved = await supabase.from('attendance').insert({
      user_id: account.user_id,
      staff_id: account.id,
      full_name: account.full_name,
      branch_id: account.branch_id,
      work_date: clock.date,
      late_minutes: late,
      photo_sent: !!result.ok,
    })
    setBusy(false)
    if (saved.error) {
      setMsg(saved.error.message)
      return
    }
    setMsg(result.ok
      ? (late ? `บันทึกแล้ว มาสาย ${late} นาที และส่งเทเลแกรมแล้ว` : 'บันทึกเข้างานตรงเวลา และส่งเทเลแกรมแล้ว')
      : `บันทึกเวลาแล้ว แต่ส่งเทเลแกรมไม่สำเร็จ: ${result.message || ''}`)
    await load()
  }

  const summary = useMemo(() => {
    const range = monthRange(month)
    const today = bangkokNow().date
    const end = range.to < today ? range.to : today
    const endDay = Number(end.slice(-2))
    const names = new Map<string, Person>()
    people.forEach((person) => names.set(person.user_id, person))
    rows.forEach((row) => {
      if (!names.has(row.user_id)) names.set(row.user_id, { user_id: row.user_id, full_name: row.full_name, branch_id: row.branch_id })
    })
    return [...names.values()].map((person) => {
      const mine = rows.filter((row) => row.user_id === person.user_id)
      const lateDays = mine.filter((row) => row.late_minutes > 0).length
      const lateMinutes = mine.reduce((sum, row) => sum + Number(row.late_minutes || 0), 0)
      const worked = mine.length
      return {
        ...person,
        worked,
        lateDays,
        lateMinutes,
        absent: Math.max(0, endDay - worked),
      }
    }).sort((a, b) => b.lateMinutes - a.lateMinutes || a.full_name.localeCompare(b.full_name, 'th'))
  }, [rows, people, month])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">พนักงานเข้างาน</h1>
      <p className="mt-2 text-sm text-gray-300">เวลาประเทศไทย เข้างานไม่เกิน 08:00 น. กดถ่ายได้รูปเดียว ระบบส่งเทเลแกรมและเก็บเวลาไว้สรุปสิ้นเดือน</p>
      <p className="mt-2 text-lg">ตอนนี้ {now.label} {now.hour * 60 + now.minute > 480 ? '· เลยเวลาแล้ว' : '· ยังไม่เกิน 08:00'}</p>
      <label className="relative mt-4 block overflow-hidden rounded-2xl border border-dashed border-gray-500 text-center">
        {preview ? <img src={preview} alt="รูปเข้างาน" className="h-56 w-full object-cover" /> : <span className="flex h-40 items-center justify-center text-lg">กดถ่ายรูปหน้าร้านหรือรูปตัวเอง</span>}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void punch(file)
          }}
        />
      </label>
      {msg && <p className="mt-3 text-amber-200">{msg}</p>}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">สรุปเข้างาน</h2>
          <p className="text-xs text-gray-400">นับทุกวันในเดือนจนถึงวันนี้ ไม่เว้นวันหยุด ขาดงานคือวันที่ไม่มีเวลาเข้า</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-3 py-2" />
      </div>
      {!seeAll && <p className="mt-2 text-sm text-gray-400">บัญชีนี้เห็นเฉพาะเวลาของตัวเอง</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="py-2">พนักงาน</th>
              <th>ทำงาน</th>
              <th>มาสาย</th>
              <th>นาทีที่สาย</th>
              <th>ขาด</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((person) => (
              <tr key={person.user_id} className="border-t border-gray-800">
                <td className="py-2">{person.full_name}</td>
                <td>{person.worked} วัน</td>
                <td>{person.lateDays} วัน</td>
                <td>{person.lateMinutes} นาที</td>
                <td>{person.absent} วัน</td>
              </tr>
            ))}
            {summary.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-500">ยังไม่มีข้อมูลเดือนนี้</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
