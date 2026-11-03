'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
  symptom: string | null
  pickup_date: string | null
  picked_up_at: string | null
  status: string | null
  vehicles?: { license_plate?: string | null; brand?: string | null; model?: string | null; customers?: { full_name?: string | null; phone?: string | null } | { full_name?: string | null; phone?: string | null }[] | null } | null
  branches?: { name?: string | null } | { name?: string | null }[] | null
}

function bangkokDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function thaiFromIso(iso: string) {
  if (!iso || iso.length < 10) return iso
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${Number(year) + 543}`
}

function owner(job: Job) {
  const customer = job.vehicles?.customers
  const row = Array.isArray(customer) ? customer[0] : customer
  return { name: row?.full_name || '', phone: row?.phone || '' }
}

function branch(job: Job) {
  const value = job.branches
  return (Array.isArray(value) ? value[0]?.name : value?.name) || ''
}

export default function PickupPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const today = bangkokDay()

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const rich = await supabase
      .from('jobs')
      .select('id, symptom, pickup_date, picked_up_at, status, vehicles(license_plate, brand, model, customers(full_name, phone)), branches(name)')
      .not('pickup_date', 'is', null)
      .is('picked_up_at', null)
      .order('pickup_date', { ascending: true })
      .limit(200)
    const plain = rich.error
      ? await supabase
        .from('jobs')
        .select('id, symptom, pickup_date, picked_up_at, status, vehicles(license_plate, brand, model), branches(name)')
        .not('pickup_date', 'is', null)
        .is('picked_up_at', null)
        .order('pickup_date', { ascending: true })
        .limit(200)
      : null
    const res = plain || rich
    if (res.error) setMsg(res.error.message.includes('pickup') ? 'ระบบนัดรับยังไม่พร้อม รอสักครู่แล้วรีเฟรช' : res.error.message)
    setJobs((res.data || []) as Job[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const done = async (job: Job) => {
    setBusy(job.id)
    const res = await createClient().from('jobs').update({ picked_up_at: new Date().toISOString() }).eq('id', job.id).select('id')
    setBusy('')
    if (res.error || !(res.data || []).length) {
      setMsg(res.error?.message || 'บันทึกไม่สำเร็จ')
      return
    }
    setJobs((list) => list.filter((item) => item.id !== job.id))
    setMsg(`บันทึกว่ารับรถ ${job.vehicles?.license_plate || ''} แล้ว`)
  }

  const late = jobs.filter((job) => String(job.pickup_date) < today)
  const due = jobs.filter((job) => String(job.pickup_date) === today)
  const later = jobs.filter((job) => String(job.pickup_date) > today)

  const block = (title: string, list: Job[]) => (
    <section className="mt-5">
      <h2 className="text-lg font-semibold">{title} · {list.length}</h2>
      {list.length === 0 && <p className="mt-2 text-sm text-gray-400">ไม่มีรายการ</p>}
      <div className="mt-2 space-y-2">
        {list.map((job) => {
          const who = owner(job)
          return (
            <div key={job.id} className="rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{job.vehicles?.license_plate || 'ไม่มีป้าย'}</div>
                  <div className="text-sm text-gray-300">{[job.vehicles?.brand, job.vehicles?.model].filter(Boolean).join(' ') || '-'}</div>
                  <div className="text-sm text-gray-400">{who.name || 'ไม่ระบุชื่อ'} {who.phone}</div>
                  <div className="text-sm text-gray-400">{branch(job) || 'ไม่ระบุสาขา'} · นัด {thaiFromIso(String(job.pickup_date || ''))}</div>
                  <div className="mt-1 text-sm">{job.symptom || 'ไม่ระบุอาการ'}</div>
                </div>
              </div>
              <button type="button" disabled={busy === job.id} onClick={() => void done(job)} className="mt-3 w-full rounded-xl bg-green-700 py-3 font-semibold disabled:opacity-50">
                {busy === job.id ? 'กำลังบันทึก...' : 'ลูกค้ารับรถแล้ว'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">นัดรับรถ</h1>
      <p className="mt-2 text-sm leading-6 text-gray-300">วันที่นัดใส่ตอนรับรถ หน้าร้านเปิดหน้านี้ดูรถที่ต้องรับวันนี้ รถที่เลยกำหนด และคิววันหน้า</p>
      {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
      {loading ? <p className="mt-4 text-gray-400">กำลังโหลดนัด</p> : (
        <>
          {block('วันนี้', due)}
          {block('เลยกำหนด', late)}
          {block('วันหน้า', later)}
        </>
      )}
    </div>
  )
}
// today's pickups and overdue cars stay on this page
