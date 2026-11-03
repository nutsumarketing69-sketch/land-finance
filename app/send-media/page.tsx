'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStaff } from '@/app/components/AuthShell'

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
      }, 'image/jpeg', 0.7)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export default function SendMediaPage() {
  const { account } = useStaff()
  const [plate, setPlate] = useState('')
  const [symptom, setSymptom] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<{ url: string; file: File }[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [hits, setHits] = useState<{ id: string; license_plate: string; symptom: string; note: string; created_at: string; photo_count: number; video_count: number }[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async (value: string) => {
    setPlate(value)
    const word = value.trim().replace(/[%_,()]/g, '')
    if (!word) {
      setHits([])
      return
    }
    const res = await createClient().from('media_logs').select('id, license_plate, symptom, note, created_at, photo_count, video_count').ilike('license_plate', `%${word}%`).order('created_at', { ascending: false }).limit(30)
    setHits(res.data || [])
  }

  const addPhotos = async (list: FileList | null) => {
    if (!list) return
    const next = [...photos]
    for (const file of Array.from(list)) {
      if (next.length >= 15) break
      const blob = await shrink(file)
      const jpeg = new File([blob], `photo-${next.length}.jpg`, { type: 'image/jpeg' })
      next.push({ url: URL.createObjectURL(jpeg), file: jpeg })
    }
    setPhotos(next)
    if (list.length + photos.length > 15) setMsg('เก็บได้สูงสุด 15 รูป')
  }

  const addVideos = (list: FileList | null) => {
    if (!list) return
    const next = [...videos]
    for (const file of Array.from(list)) {
      if (next.length >= 2) break
      if (file.size > 4 * 1024 * 1024) {
        setMsg('วิดีโอต้องไม่เกิน 4MB ถ่ายคลิปสั้นลง')
        continue
      }
      next.push(file)
    }
    setVideos(next)
  }

  const send = async () => {
    const plateNo = plate.trim()
    if (!plateNo) {
      setMsg('ใส่ป้ายทะเบียนก่อน ส่งแล้วจะค้นจากป้ายนี้ได้')
      return
    }
    if (!photos.length && !videos.length) {
      setMsg('ถ่ายรูปหรือวิดีโอก่อนส่ง')
      return
    }
    setBusy(true)
    const caption = [
      `ป้าย: ${plateNo}`,
      `อาการ: ${symptom.trim() || '-'}`,
      `ช่างอธิบาย: ${note.trim() || '-'}`,
      `ผู้ส่ง: ${account?.full_name || '-'}`,
      `เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
    ].join('\n')
    for (let start = 0; start < photos.length; start += 10) {
      const chunk = photos.slice(start, start + 10)
      const body = new FormData()
      chunk.forEach((item, index) => body.append(`photo${index}`, item.file, `car${index}.jpg`))
      if (start === 0) body.append('caption', caption)
      const res = await fetch('/telegram', { method: 'POST', body })
      const data = await res.json().catch(() => ({ ok: false, message: 'ส่งรูปไม่สำเร็จ' }))
      if (!data.ok) {
        setBusy(false)
        setMsg(data.message || 'ส่งรูปไม่สำเร็จ')
        return
      }
    }
    for (let index = 0; index < videos.length; index += 1) {
      const body = new FormData()
      body.append('kind', 'video')
      body.append('video', videos[index], videos[index].name || 'clip.mp4')
      body.append('caption', index === 0 && photos.length === 0 ? caption : `ป้าย: ${plateNo}\nคลิปที่ ${index + 1}`)
      const res = await fetch('/telegram', { method: 'POST', body })
      const data = await res.json().catch(() => ({ ok: false, message: 'ส่งวิดีโอไม่สำเร็จ' }))
      if (!data.ok) {
        setBusy(false)
        setMsg(data.message || 'ส่งวิดีโอไม่สำเร็จ')
        return
      }
    }
    const saved = await createClient().from('media_logs').insert({
      user_id: account?.user_id || null,
      full_name: account?.full_name || null,
      license_plate: plateNo,
      symptom: symptom.trim() || null,
      note: note.trim() || null,
      photo_count: photos.length,
      video_count: videos.length,
    })
    setBusy(false)
    if (saved.error) {
      setMsg(`ส่งเทเลแกรมแล้ว แต่บันทึกป้ายค้นหาไม่สำเร็จ: ${saved.error.message}`)
      return
    }
    setMsg(`ส่งเข้าเทเลแกรมแล้ว ${photos.length} รูป ${videos.length} คลิป ของป้าย ${plateNo}`)
    setPhotos([])
    setVideos([])
    await search(plateNo)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 text-white">
      <a href="/" className="mb-4 inline-block rounded-full border border-gray-600 px-4 py-2 text-sm">กลับหน้าหลัก</a>
      <h1 className="text-2xl font-bold">ส่งรูปเข้าเทเลแกรม</h1>
      <p className="mt-2 text-sm text-gray-300">ป้ายทะเบียนต้องมีทุกครั้ง รูป 1–15 ใบ และวิดีโอได้ 1–2 คลิป ภายหลังค้นป้ายนี้แล้วเจออาการกับคำอธิบายของช่าง</p>
      <input value={plate} onChange={(e) => { void search(e.target.value) }} placeholder="ป้ายทะเบียน เช่น กข 1234" className="mt-4 w-full rounded border border-gray-600 bg-gray-800 p-3 text-lg" />
      <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="อาการเป็นอย่างไร" rows={2} className="mt-3 w-full rounded border border-gray-600 bg-gray-800 p-3" />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ช่างอธิบายเพิ่ม" rows={3} className="mt-3 w-full rounded border border-gray-600 bg-gray-800 p-3" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="rounded-xl border border-dashed border-gray-500 px-3 py-4 text-center">
          ถ่ายรูปหรือเลือก {photos.length}/15
          <input type="file" accept="image/*" capture="environment" multiple className="mt-2 block w-full text-sm" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        </label>
        <label className="rounded-xl border border-dashed border-gray-500 px-3 py-4 text-center">
          วิดีโอ {videos.length}/2
          <input type="file" accept="video/*" capture="environment" className="mt-2 block w-full text-sm" onChange={(e) => { addVideos(e.target.files); e.target.value = '' }} />
        </label>
      </div>
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((item, index) => <img key={item.url} src={item.url} alt="" className="h-24 w-full rounded object-cover" onClick={() => setPhotos(photos.filter((_, i) => i !== index))} />)}
        </div>
      )}
      {videos.length > 0 && <p className="mt-2 text-sm text-gray-300">{videos.map((file) => file.name).join(' · ')} กดส่งได้เลย</p>}
      <button onClick={send} disabled={busy} className="mt-4 w-full rounded-xl bg-red-600 py-3 font-semibold disabled:opacity-50">{busy ? 'กำลังส่ง...' : 'ส่งเข้าเทเลแกรม'}</button>
      {msg && <p className="mt-3 text-amber-200">{msg}</p>}
      <h2 className="mt-8 font-semibold">รูปที่เคยส่งของป้ายนี้</h2>
      <div className="mt-2 space-y-2">
        {hits.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-700 p-3 text-sm">
            <div className="font-semibold">{item.license_plate}</div>
            <div>{new Date(item.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · รูป {item.photo_count} · คลิป {item.video_count}</div>
            <div className="text-gray-300">อาการ: {item.symptom || '-'}</div>
            <div className="text-gray-300">ช่าง: {item.note || '-'}</div>
          </div>
        ))}
        {plate.trim() && hits.length === 0 && <p className="text-sm text-gray-500">ยังไม่พบบันทึกป้ายนี้ในระบบ ค้นในกลุ่มเทเลแกรมด้วยป้ายเดียวกันได้</p>}
      </div>
    </div>
  )
}
