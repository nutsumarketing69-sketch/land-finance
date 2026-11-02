import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID บน Vercel' }, { status: 500 })
  }

  const incoming = await request.formData()
  const caption = String(incoming.get('caption') || '').slice(0, 1000)
  const files: File[] = []
  for (const key of ['photo0', 'photo1', 'photo2', 'photo']) {
    const value = incoming.get(key)
    if (value instanceof File && value.size > 0) files.push(value)
  }
  if (files.length === 0) {
    return NextResponse.json({ ok: false, message: 'ไม่มีรูป' }, { status: 400 })
  }
  if (files.some((file) => file.size > 4 * 1024 * 1024)) {
    return NextResponse.json({ ok: false, message: 'รูปยังใหญ่เกินไป' }, { status: 400 })
  }

  if (files.length === 1) {
    const body = new FormData()
    body.append('chat_id', chatId)
    body.append('caption', caption)
    body.append('photo', files[0], 'car.jpg')
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body })
    const data = await res.json()
    if (!data.ok) return NextResponse.json({ ok: false, message: data.description || 'ส่งเข้าเทเลแกรมไม่สำเร็จ' }, { status: 502 })
    return NextResponse.json({ ok: true })
  }

  const body = new FormData()
  body.append('chat_id', chatId)
  body.append('media', JSON.stringify(files.map((file, i) => ({
    type: 'photo',
    media: `attach://file${i}`,
    ...(i === 0 && caption ? { caption } : {}),
  }))))
  files.forEach((file, i) => body.append(`file${i}`, file, `car${i}.jpg`))
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: 'POST', body })
  const data = await res.json()
  if (!data.ok) return NextResponse.json({ ok: false, message: data.description || 'ส่งเข้าเทเลแกรมไม่สำเร็จ' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
