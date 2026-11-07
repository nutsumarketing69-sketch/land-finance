'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
  approved: boolean
  photo_sent: boolean
}

type Person = { user_id: string; full_name: string; branch_id: string | null; job_title?: string | null }

const COLS = 'id, user_id, full_name, work_date, clocked_at, late_minutes, branch_id, approved, photo_sent'

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

function thaiMonth(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    month: 'long',
    year: 'numeric',
  })
}

function clockLabel(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function stampLate(file: Blob, lines: string[]): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width || 1
      canvas.height = img.height || 1
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0)
      const fontSize = Math.max(42, Math.round(canvas.width * 0.11))
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      lines.forEach((line, index) => {
        const size = index === 0 ? fontSize : Math.round(fontSize * 0.62)
        ctx.font = `700 ${size}px sans-serif`
        ctx.lineWidth = Math.max(8, Math.round(size / 7))
        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#e10600'
        const y = fontSize + index * size * 1.25
        ctx.strokeText(line, canvas.width / 2, y)
        ctx.fillText(line, canvas.width / 2, y)
      })
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        resolve(blob || file)
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
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
  const [own, setOwn] = useState<Punch | null>(null)
  const [openId, setOpenId] = useState('')
  const [preview, setPreview] = useState('')
  const [msg, setMsg] = useState('')
  const [msgLate, setMsgLate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const waiting = useRef(false)
  const now = bangkokNow()
  const lateNow = now.hour * 60 + now.minute > 8 * 60

  const branchName = (id: string | null) => branches.find((item) => item.id === id)?.name || 'ไม่ระบุสาขา'

  const load = async () => {
    if (!account) return
    const supabase = createClient()
    const range = monthRange(month)
    const today = bangkokNow().date
    const [punchRes, branchRes, roster, ownRes] = await Promise.all([
      supabase.from('attendance').select(COLS).eq('approved', true).gte('work_date', range.from).lte('work_date', range.to).order('clocked_at'),
      supabase.from('branches').select('id, name'),
      supabase.rpc('attendance_roster'),
      supabase.from('attendance').select(COLS).eq('user_id', account.user_id).eq('work_date', today).maybeSingle(),
    ])
    setRows((punchRes.data || []) as Punch[])
    setBranches(branchRes.data || [])
    const rosterRows = ((roster.data || []) as Person[])
    setPeople(rosterRows)
    const mine = (ownRes.data || null) as Punch | null
    setOwn(mine)
    if (waiting.current && mine?.approved) {
      setMsgLate(Number(mine.late_minutes) > 0)
      setMsg(Number(mine.late_minutes) > 0 ? `บันทึกเข้างานแล้ว มาสาย ${mine.late_minutes} นาที` : 'บันทึกเข้างานตรงเวลาแล้ว')
    }
    waiting.current = !!mine && !mine.approved && !!mine.photo_sent
    if (punchRes.error) setMsg(punchRes.error.message)
  }

  useEffect(() => { void load() }, [month, account?.user_id])

  useEffect(() => {
    if (!own || own.approved || !own.photo_sent) return
    const timer = window.setInterval(() => { void load() }, 6000)
    return () => window.clearInterval(timer)
  }, [own?.id, own?.approved, own?.photo_sent, month, account?.user_id])

  const punch = async (file?: File) => {
    if (!file || !account) return
    setBusy(true)
    setMsg('')
    const supabase = createClient()
    const today = bangkokNow().date
    const found = await supabase.from('attendance').select(COLS).eq('user_id', account.user_id).eq('work_date', today).maybeSingle()
    let row = (found.data || null) as Punch | null
    if (row?.approved) {
      const wasLate = Number(row.late_minutes) > 0
      setBusy(false)
      setMsgLate(wasLate)
      setOwn(row)
      setMsg(`วันนี้เข้างานแล้วเมื่อ ${timeLabel(row.clocked_at)}${wasLate ? ' มาสาย' : ''}`)
      return
    }
    if (row && row.photo_sent && !row.approved) {
      setBusy(false)
      setOwn(row)
      setMsgLate(Number(row.late_minutes) > 0)
      setMsg('ส่งรูปแล้ว รอผู้ดูแลกดอนุมัติในเทเลแกรม จึงจะเข้าสรุปเข้างาน')
      return
    }
    if (!row) {
      const clock = bangkokNow()
      const lateGuess = Math.max(0, clock.hour * 60 + clock.minute - 8 * 60)
      const inserted = await supabase.from('attendance').insert({
        user_id: account.user_id,
        staff_id: account.id,
        full_name: account.full_name,
        branch_id: account.branch_id,
        work_date: clock.date,
        late_minutes: lateGuess,
        approved: false,
        photo_sent: false,
      }).select(COLS).single()
      if (inserted.error || !inserted.data) {
        const again = await supabase.from('attendance').select(COLS).eq('user_id', account.user_id).eq('work_date', today).maybeSingle()
        row = (again.data || null) as Punch | null
        if (!row) {
          setBusy(false)
          setMsg(inserted.error?.message || 'บันทึกชั่วคราวไม่สำเร็จ')
          return
        }
      } else {
        row = inserted.data as Punch
      }
    }
    if (row.approved) {
      setBusy(false)
      setOwn(row)
      setMsg(`วันนี้เข้างานแล้วเมื่อ ${timeLabel(row.clocked_at)}`)
      return
    }
    const late = Number(row.late_minutes) || 0
    setMsgLate(late > 0)
    const shrunk = await shrink(file)
    const blob = late > 0 ? await stampLate(shrunk, ['มาสาย', `${late} นาที`]) : shrunk
    const photo = new File([blob], 'clock.jpg', { type: 'image/jpeg' })
    setPreview(URL.createObjectURL(photo.size ? photo : file))
    const body = new FormData()
    body.append('photo', photo.size ? photo : file, 'clock.jpg')
    body.append('clock', row.id)
    body.append('caption', [
      'เข้างาน รัษฎาแอร์',
      `ชื่อ: ${row.full_name}`,
      `สาขา: ${branchName(row.branch_id)}`,
      `เวลา: ${clockLabel(row.clocked_at)}`,
      late ? `ผลตรวจ: มาสาย ${late} นาที` : 'ผลตรวจ: ตรงเวลา',
      'สถานะ: รออนุมัติ',
    ].join('\n'))
    const sent = await fetch('/telegram', { method: 'POST', body })
    const result = await sent.json().catch(() => ({ ok: false, message: 'ส่งเทเลแกรมไม่สำเร็จ' }))
    if (!result.ok) {
      await supabase.rpc('cancel_clock', { punch_id: row.id })
      setOwn(null)
      setBusy(false)
      setMsg(`ส่งเทเลแกรมไม่สำเร็จ ยังไม่บันทึกเข้างาน ${result.message || ''}`)
      return
    }
    setOwn({ ...row, photo_sent: true })
    waiting.current = true
    setBusy(false)
    setMsg(late
      ? `ส่งรูปแล้ว มาสาย ${late} นาที รอผู้ดูแลกดอนุมัติ จึงจะเข้าสรุปเข้างาน`
      : 'ส่งรูปแล้ว รอผู้ดูแลกดอนุมัติ จึงจะเข้าสรุปเข้างาน')
  }

  const summary = useMemo(() => {
    const range = monthRange(month)
    const today = bangkokNow().date
    const end = range.to < today ? range.to : today
    const endDay = range.from > today ? 0 : Number(end.slice(-2))
    const names = new Map<string, Person & { active: boolean }>()
    people.forEach((person) => names.set(person.user_id, { ...person, active: true }))
    rows.forEach((row) => {
      if (!names.has(row.user_id)) {
        names.set(row.user_id, { user_id: row.user_id, full_name: row.full_name, branch_id: row.branch_id, active: false })
      }
    })
    return [...names.values()].map((person) => {
      const mine = rows.filter((row) => row.user_id === person.user_id)
      const lateDays = mine.filter((row) => row.late_minutes > 0).length
      const lateMinutes = mine.reduce((sum, row) => sum + Number(row.late_minutes || 0), 0)
      const worked = mine.length
      const lastDay = mine.reduce((max, row) => (row.work_date > max ? row.work_date : max), '')
      const cap = person.active ? endDay : Math.min(endDay, Number(lastDay.slice(-2) || 0))
      const branchId = mine[mine.length - 1]?.branch_id || person.branch_id
      return {
        ...person,
        full_name: person.active ? person.full_name : (mine[mine.length - 1]?.full_name || person.full_name),
        branchId,
        worked,
        lateDays,
        lateMinutes,
        absent: Math.max(0, cap - worked),
        days: [...mine].sort((a, b) => a.work_date.localeCompare(b.work_date) || a.clocked_at.localeCompare(b.clocked_at)),
      }
    }).sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'))
  }, [rows, people, month])

  const totals = summary.reduce((sum, person) => ({
    worked: sum.worked + person.worked,
    lateDays: sum.lateDays + person.lateDays,
    lateMinutes: sum.lateMinutes + person.lateMinutes,
    absent: sum.absent + person.absent,
  }), { worked: 0, lateDays: 0, lateMinutes: 0, absent: 0 })

  const exportExcel = async () => {
    setExporting(true)
    try {
      const loaded = await import('xlsx')
      const title = `สรุปเข้างาน รัษฎาแอร์ ${thaiMonth(month)}`
      const head = ['ลำดับ', 'ชื่อ', 'สาขา', 'ตำแหน่ง', 'สถานะ', 'วันทำงาน', 'วันมาสาย', 'นาทีที่สาย', 'วันขาด']
      const body = summary.map((person, index) => [
        index + 1,
        person.full_name,
        branchName(person.branchId),
        person.job_title || '-',
        person.active ? 'ทำงานอยู่' : 'พ้นสภาพ',
        person.worked,
        person.lateDays,
        person.lateMinutes,
        person.absent,
      ])
      const summaryRows = [
        [title],
        ['นับทุกวันจนถึงวันนี้ ไม่เว้นวันหยุด คนที่ลบแล้วเก็บบัญชีถึงวันสุดท้ายที่เข้างาน'],
        [],
        head,
        ...body,
        [],
        ['รวม', summary.length + ' คน', '', '', '', totals.worked, totals.lateDays, totals.lateMinutes, totals.absent],
      ]
      const daily = [
        ['วันที่', 'ชื่อ', 'สาขา', 'เวลา', 'นาทีที่สาย', 'ผล', 'สถานะคน'],
        ...summary.flatMap((person) => person.days.map((day) => [
          dayLabel(day.work_date),
          person.full_name,
          branchName(day.branch_id),
          timeLabel(day.clocked_at),
          Number(day.late_minutes) || 0,
          Number(day.late_minutes) > 0 ? 'มาสาย' : 'ตรงเวลา',
          person.active ? 'ทำงานอยู่' : 'พ้นสภาพ',
        ])),
      ]
      const book = loaded.utils.book_new()
      const summarySheet = loaded.utils.aoa_to_sheet(summaryRows)
      summarySheet['!cols'] = [8, 28, 18, 18, 14, 12, 12, 12, 12].map((wch) => ({ wch }))
      const dailySheet = loaded.utils.aoa_to_sheet(daily)
      dailySheet['!cols'] = [18, 28, 18, 12, 12, 12, 14].map((wch) => ({ wch }))
      loaded.utils.book_append_sheet(book, summarySheet, 'สรุป')
      loaded.utils.book_append_sheet(book, dailySheet, 'รายวัน')
      loaded.writeFile(book, `สรุปเข้างาน-${month}.xlsx`)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'ส่งออกไม่สำเร็จ')
    }
    setExporting(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 text-white">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .sheet, .sheet * { color: #111 !important; background: #fff !important; box-shadow: none !important; }
          .sheet { max-width: none !important; padding: 0 !important; }
          .sheet table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .sheet th, .sheet td { border: 1px solid #222 !important; padding: 2px 4px !important; }
          .sheet h1 { font-size: 16px !important; margin: 0 0 2px !important; }
          .sheet .late { color: #9b0000 !important; font-weight: 700; }
        }
        .only-print { display: none; }
      `}</style>
      <a href="/" className="no-print mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <div className="no-print">
        <h1 className="text-2xl font-bold">พนักงานเข้างาน</h1>
        <p className="mt-2 text-sm leading-6 text-gray-300">เวลาประเทศไทย เข้าก่อน 08:00 น. ถ่ายรูปแล้วระบบส่งเข้ากลุ่มเทเลแกรม ผู้ดูแลกดอนุมัติก่อน รายการจึงเข้าสรุปเข้างาน ถ้ามาสายยังส่งได้ รูปจะมีตัวแดงว่ามาสาย</p>
        <p className="mt-2 text-lg" style={lateNow ? { color: '#e10600', fontWeight: 700 } : undefined}>ตอนนี้ {now.label} {lateNow ? '· มาสาย' : '· ยังไม่เกิน 08:00'}</p>
        <label className="relative mt-4 block overflow-hidden rounded-2xl border border-dashed border-gray-500 text-center">
          {preview ? <img src={preview} alt="รูปเข้างาน" className="h-56 w-full object-cover" /> : <span className="flex h-40 items-center justify-center px-4 text-lg">กดถ่ายรูปหน้าร้านหรือรูปตัวเอง</span>}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy || (!!own && !own.approved && !!own.photo_sent)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              void punch(file)
            }}
          />
        </label>
        {own && !own.approved && (
          <p className="mt-3 text-amber-200">รออนุมัติในเทเลแกรม เวลาที่ส่ง {clockLabel(own.clocked_at)} ยังไม่เข้าสรุปเข้างาน</p>
        )}
        {msg && <p className="mt-3 text-amber-200" style={msgLate ? { color: '#e10600', fontWeight: 700, fontSize: '1.25rem' } : undefined}>{msg}</p>}
      </div>

      <div className="sheet mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">สรุปเข้างาน รัษฎาแอร์</h1>
            <p className="text-sm text-gray-300">{thaiMonth(month)}</p>
            <p className="only-print text-xs">พิมพ์เมื่อ {now.label} · หนึ่งแผ่นสำหรับบัญชี</p>
            <p className="no-print mt-1 text-xs leading-5 text-gray-400">กดชื่อเพื่อดูรายวันของคนนั้น คนที่ลบออกจากร้านแล้ว ยังอยู่ในเดือนที่มีวันเข้างาน ให้บัญชีปิดเดือน วันขาดของคนพ้นสภาพคิดถึงวันสุดท้ายที่เข้างาน</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-3 py-2" />
            <button type="button" onClick={() => window.print()} className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-medium">พิมพ์สรุป{seeAll ? 'พนักงานทั้งหมด' : 'ของฉัน'}</button>
            <button type="button" onClick={() => void exportExcel()} disabled={exporting} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50">{exporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}</button>
          </div>
        </div>
        {!seeAll && <p className="no-print mt-2 text-sm text-gray-400">บัญชีนี้เห็นเฉพาะเวลาของตัวเอง</p>}
        <div className="scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="py-2 pr-2">ชื่อ</th>
                <th className="pr-2">สาขา</th>
                <th className="pr-2">ทำงาน</th>
                <th className="pr-2">มาสาย</th>
                <th className="pr-2">นาทีที่สาย</th>
                <th className="pr-2">ขาด</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((person) => (
                <Fragment key={person.user_id}>
                  <tr
                    onClick={() => setOpenId(openId === person.user_id ? '' : person.user_id)}
                    className="cursor-pointer border-t border-gray-800"
                  >
                    <td className="py-2 pr-2 font-medium">{person.full_name}</td>
                    <td className="pr-2">{branchName(person.branchId)}</td>
                    <td className="pr-2">{person.worked} วัน</td>
                    <td className={`pr-2 ${person.lateDays > 0 ? 'late' : ''}`} style={person.lateDays > 0 ? { color: '#e10600', fontWeight: 700 } : undefined}>{person.lateDays} วัน</td>
                    <td className={`pr-2 ${person.lateMinutes > 0 ? 'late' : ''}`} style={person.lateMinutes > 0 ? { color: '#e10600', fontWeight: 700 } : undefined}>{person.lateMinutes} นาที</td>
                    <td className="pr-2">{person.absent} วัน</td>
                    <td>{person.active ? (person.job_title || '') : 'พ้นสภาพ'}</td>
                  </tr>
                  {openId === person.user_id && (
                    <tr className="no-print border-t border-gray-900 bg-black/30">
                      <td colSpan={7} className="px-2 py-3">
                        {person.days.length === 0 && <p className="text-sm text-gray-400">เดือนนี้ยังไม่มีวันที่อนุมัติแล้ว</p>}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {person.days.map((day) => (
                            <div key={day.id} className="rounded-xl border border-gray-800 px-3 py-2 text-sm">
                              <div className="font-medium">{dayLabel(day.work_date)} · {timeLabel(day.clocked_at)}</div>
                              <div style={Number(day.late_minutes) > 0 ? { color: '#e10600', fontWeight: 700 } : undefined}>
                                {Number(day.late_minutes) > 0 ? `มาสาย ${day.late_minutes} นาที` : 'ตรงเวลา'} · {branchName(day.branch_id)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {summary.length === 0 && <tr><td colSpan={7} className="py-4 text-gray-500">ยังไม่มีข้อมูลเดือนนี้</td></tr>}
              {summary.length > 0 && (
                <tr className="border-t border-gray-600 font-semibold">
                  <td className="py-2">รวม {summary.length} คน</td>
                  <td />
                  <td>{totals.worked} วัน</td>
                  <td className={totals.lateDays > 0 ? 'late' : ''}>{totals.lateDays} วัน</td>
                  <td className={totals.lateMinutes > 0 ? 'late' : ''}>{totals.lateMinutes} นาที</td>
                  <td>{totals.absent} วัน</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// clock approval stays on the same telegram message and the monthly sheet keeps removed staff
