import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID บน Vercel' }, { status: 500 })
  }

  const incoming = await request.formData()
  const photo = incoming.get('photo')
  const caption = String(incoming.get('caption') || '').slice(0, 1000)
  if (!(photo instanceof File)) {
    return NextResponse.json({ ok: false, message: 'ไม่มีรูป' }, { status: 400 })
  }
  if (photo.size > 4 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: 'รูปยังใหญ่เกินไป' }, { status: 400 })
  }

  const body = new FormData()
  body.append('chat_id', chatId)
  body.append('caption', caption)
  body.append('photo', photo, 'car.jpg')

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body })
  const data = await res.json()
  if (!data.ok) {
    return NextResponse.json({ ok: false, message: data.description || 'ส่งเข้าเทเลแกรมไม่สำเร็จ' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
