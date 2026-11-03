'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Card = {
  id: string
  plate: string
  who: string
  detail: string
  when: string
  until: string
  months: number
  active: boolean
  source: string
}

function safeWord(value: string) {
  return value.replace(/[%_,()]/g, '').trim()
}

function addMonths(iso: string, months: number) {
  const until = new Date(iso)
  until.setMonth(until.getMonth() + months)
  return until
}

function readBillWarranty(note: string, created: string) {
  let months = 0
  const raw = String(note || '')
  const meta = raw.split('[[meta]]')[1]
  if (meta) {
    try {
      months = Number(JSON.parse(meta).warrantyMonths) || 0
    } catch {
      months = 0
    }
  }
  if (!months) {
    const found = raw.match(/รับประกัน(?:งาน)?\s*(\d+)\s*เดือน/)
    if (found) months = Number(found[1])
  }
  if (!months) return null
  const until = addMonths(created, months)
  return { months, until, active: until.getTime() >= Date.now() }
}

function thaiDate(value: string | Date) {
  return new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
}

export default function WarrantyPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  const load = async (word = q) => {
    setLoading(true)
    setMsg('')
    const supabase = createClient()
    const text = safeWord(word)
    let billQuery = supabase
      .from('bills')
      .select('id, bill_no, customer_name, license_plate, car_info, note, created_at')
      .order('created_at', { ascending: false })
      .limit(40)
    billQuery = text
      ? billQuery.or(`license_plate.ilike.%${text}%,customer_name.ilike.%${text}%,bill_no.ilike.%${text}%`)
      : billQuery.ilike('note', '%รับประกัน%')

    const jobQuery = supabase
      .from('jobs')
      .select('*, vehicles(license_plate, brand, model, customers(full_name)), employees(full_name), branches(name)')
      .order('created_at', { ascending: false })
      .limit(40)

    const [billRes, jobRes] = await Promise.all([billQuery, jobQuery])
    if (billRes.error) setMsg(billRes.error.message)

    const next: Card[] = []
    for (const bill of billRes.data || []) {
      const cover = readBillWarranty(bill.note, bill.created_at)
      if (!cover) continue
      const plate = bill.license_plate || ''
      if (text && !`${plate} ${bill.customer_name || ''} ${bill.bill_no || ''}`.toLowerCase().includes(text.toLowerCase())) continue
      next.push({
        id: `bill-${bill.id}`,
        plate: plate || '-',
        who: bill.customer_name || '-',
        detail: [bill.car_info, bill.bill_no ? `บิล ${bill.bill_no}` : ''].filter(Boolean).join(' · '),
        when: bill.created_at,
        until: cover.until.toISOString(),
        months: cover.months,
        active: cover.active,
        source: 'บิล',
      })
    }

    for (const job of jobRes.data || []) {
      const plate = job.vehicles?.license_plate || ''
      const who = job.vehicles?.customers?.full_name || ''
      const blob = `${plate} ${who} ${job.repair || ''}`.toLowerCase()
      if (text && !blob.includes(text.toLowerCase())) continue
      const until = job.warranty_until ? new Date(job.warranty_until) : null
      next.push({
        id: `job-${job.id}`,
        plate: plate || '-',
        who: who || '-',
        detail: [job.vehicles?.brand, job.vehicles?.model, job.repair, job.branches?.name].filter(Boolean).join(' · '),
        when: job.created_at,
        until: until ? until.toISOString() : '',
        months: Number(job.warranty_months) || 0,
        active: !!until && until.getTime() >= Date.now(),
        source: 'งานรับรถ',
      })
    }

    next.sort((a, b) => +new Date(b.when) - +new Date(a.when))
    setCards(next)
    setLoading(false)
  }

  useEffect(() => {
    load('')
  }, [])

  const shown = cards.filter((card) => {
    if (filter === 'active') return card.active
    if (filter === 'expired') return !card.active && !!card.until
    return true
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6">
      <h1 className="text-2xl font-bold">รับประกันงาน</h1>
      <p className="mt-1 text-sm text-red-100/80">ค้นจากป้ายทะเบียน ชื่อลูกค้า หรือเลขบิล ระบบดูทั้งบิลที่บันทึกไว้และงานรับรถ</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          load(q)
        }}
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="เช่น กข 1234 หรือชื่อลูกค้า"
          className="w-full"
        />
        <button type="submit" className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">
          ค้นหา
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ['all', 'ทั้งหมด'],
          ['active', 'ยังอยู่ในประกัน'],
          ['expired', 'หมดแล้ว'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-2 ${filter === id ? 'bg-red-600 text-white' : 'bg-gray-800'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
      {loading ? (
        <p className="mt-8 text-center text-red-100">กำลังโหลด...</p>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-center text-red-100/80">ไม่พบรายการรับประกัน ลองพิมพ์ป้ายทะเบียน</p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((card) => (
            <article key={card.id} className="rounded-2xl border border-white/10 bg-gray-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{card.plate}</h2>
                  <p className="text-sm text-red-100/75">{card.who}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${card.active ? 'bg-green-700 text-white' : 'bg-gray-700 text-white'}`}>
                  {card.active ? 'อยู่ในประกัน' : 'หมดประกัน'}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-red-100/80">
                <div>วันที่: {thaiDate(card.when)} · {card.source}</div>
                {card.until && (
                  <div>
                    ถึง {thaiDate(card.until)}
                    {card.months ? ` (${card.months} เดือน)` : ''}
                  </div>
                )}
                {card.detail && <div>{card.detail}</div>}
              </div>
              {card.plate !== '-' && (
                <a href={`/history?plate=${encodeURIComponent(card.plate)}`} className="mt-3 inline-block text-sm font-medium text-red-300">
                  ดูประวัติรถคันนี้
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
