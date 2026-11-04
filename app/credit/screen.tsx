'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccess } from '@/app/components/AuthShell'

type Row = {
  id: string
  bill_no: string | null
  customer_name: string | null
  phone: string | null
  license_plate: string | null
  total: number | null
  created_at: string | null
  note: string | null
  branch_id: string | null
  branches?: { name?: string | null } | { name?: string | null }[] | null
}

function bangkokDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function unpack(raw: string) {
  const text = String(raw || '')
  const marker = text.lastIndexOf('[[meta]]')
  let meta: Record<string, unknown> = {}
  if (marker >= 0) {
    try { meta = JSON.parse(text.slice(marker + 8)) || {} } catch { meta = {} }
  }
  return meta
}

function paidNote(raw: string, payType: 'cash' | 'transfer') {
  const text = String(raw || '')
  const marker = text.lastIndexOf('[[meta]]')
  let body = marker >= 0 ? text.slice(0, marker) : text
  const meta = unpack(text)
  const label = payType === 'cash' ? 'เงินสด' : 'โอน'
  meta.payType = payType
  meta.payLabel = label
  meta.paidAt = bangkokDay()
  const lines = body.split('\n').filter((line) => !line.trim().startsWith('ชำระโดย:'))
  body = lines.join('\n').replace(/\s+$/g, '')
  body = [body, `ชำระโดย: ${label}`].filter(Boolean).join('\n')
  return `${body}\n[[meta]]${JSON.stringify(meta)}`
}

function branchName(row: Row) {
  const joined = Array.isArray(row.branches) ? row.branches[0]?.name : row.branches?.name
  return joined || ''
}

export default function CreditPage() {
  const { showPrice, can, ready } = useAccess()
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const all: Row[] = []
    for (let offset = 0; ; offset += 1000) {
      const res = await supabase
        .from('bills')
        .select('id, bill_no, customer_name, phone, license_plate, total, created_at, note, branch_id, branches(name)')
        .is('voided_at', null)
        .ilike('note', '%"payType":"credit"%')
        .order('created_at', { ascending: true })
        .range(offset, offset + 999)
      const page = res.error
        ? await supabase
          .from('bills')
          .select('id, bill_no, customer_name, phone, license_plate, total, created_at, note, branch_id')
          .is('voided_at', null)
          .ilike('note', '%"payType":"credit"%')
          .order('created_at', { ascending: true })
          .range(offset, offset + 999)
        : res
      if (page.error) {
        setMsg(page.error.message)
        setLoading(false)
        return
      }
      const data = (page.data || []) as Row[]
      all.push(...data)
      if (data.length < 1000) break
    }
    setRows(all.filter((row) => unpack(row.note || '').payType === 'credit'))
    setMsg('')
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; total: number; rows: Row[] }>()
    rows.forEach((row) => {
      const name = row.customer_name || 'ไม่ระบุชื่อ'
      const key = `${name}|${row.phone || ''}`
      const group = map.get(key) || { name, phone: row.phone || '', total: 0, rows: [] }
      group.total += Number(row.total || 0)
      group.rows.push(row)
      map.set(key, group)
    })
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [rows])

  const grand = groups.reduce((sum, group) => sum + group.total, 0)

  const mark = async (row: Row, payType: 'cash' | 'transfer') => {
    if (!can('credit') && !can('sales')) return
    setBusy(row.id + payType)
    const supabase = createClient()
    const res = await supabase.from('bills').update({ note: paidNote(row.note || '', payType) }).eq('id', row.id).select('id')
    setBusy('')
    if (res.error || !(res.data || []).length) {
      setMsg(res.error?.message || 'บันทึกไม่สำเร็จ')
      return
    }
    setRows((list) => list.filter((item) => item.id !== row.id))
    setMsg(`บันทึกบิล ${row.bill_no} ว่าชำระด้วย${payType === 'cash' ? 'เงินสด' : 'การโอน'}แล้ว`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">ลูกหนี้</h1>
      <p className="mt-2 text-sm leading-6 text-gray-300">บิลที่ออกเป็นลูกหนี้เครดิตและยังไม่บันทึกรับเงิน เมื่อรับเงินแล้วเลือกเงินสดหรือโอน บิลจะออกจากรายการค้าง</p>
      <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-900 px-4 py-4">
        <div className="text-sm text-gray-400">ยอดค้างทั้งหมด</div>
        <div className="text-3xl font-bold">{showPrice ? grand.toLocaleString() : '—'} บาท</div>
        <div className="text-sm text-gray-400">{rows.length.toLocaleString()} บิล · {groups.length.toLocaleString()} ราย</div>
      </div>
      {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
      {loading && <p className="mt-4 text-gray-400">กำลังโหลดยอดค้าง</p>}
      {!loading && groups.length === 0 && <p className="mt-4 text-gray-400">ยังไม่มีลูกหนี้ค้าง</p>}
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <section key={group.name + group.phone} className="rounded-2xl border border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{group.name}</h2>
                <p className="text-sm text-gray-400">{group.phone || 'ไม่มีเบอร์'}</p>
              </div>
              <div className="text-right font-bold">{showPrice ? group.total.toLocaleString() : '—'} บาท</div>
            </div>
            <div className="mt-3 space-y-3">
              {group.rows.map((row) => {
                const day = unpack(row.note || '').signDate
                const when = typeof day === 'string' && day ? thaiFromIso(day) : thaiFromIso(String(row.created_at || '').slice(0, 10))
                return (
                  <div key={row.id} className="rounded-xl bg-gray-900 px-3 py-3">
                    <div className="flex justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium">{row.bill_no || '-'} · {when}</div>
                        <div className="text-gray-400">{row.license_plate || '-'} · {branchName(row) || 'ไม่ระบุสาขา'}</div>
                      </div>
                      <div className="font-semibold">{showPrice ? Number(row.total || 0).toLocaleString() : '—'}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" disabled={!!busy} onClick={() => void mark(row, 'cash')} className="rounded-lg bg-green-700 px-3 py-2 text-sm disabled:opacity-50">
                        {busy === row.id + 'cash' ? 'กำลังบันทึก...' : 'รับเป็นเงินสด'}
                      </button>
                      <button type="button" disabled={!!busy} onClick={() => void mark(row, 'transfer')} className="rounded-lg bg-blue-700 px-3 py-2 text-sm disabled:opacity-50">
                        {busy === row.id + 'transfer' ? 'กำลังบันทึก...' : 'รับเป็นเงินโอน'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {ready && !showPrice && <p className="mt-4 text-sm text-amber-200">บัญชีนี้เห็นรายการได้ แต่ไม่เห็นจำนวนเงิน</p>}
    </div>
  )
}
// open credit bills can be marked paid here
// shown inside the desk without loading a new page
