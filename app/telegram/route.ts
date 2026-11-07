import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/public'

const PHOTO_KEYS = Array.from({ length: 15 }, (_, i) => `photo${i}`).concat('photo')

function reviewGate(token: string) {
  return (token.split(':')[1] || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

async function telegram(token: string, method: string, body: FormData) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body })
  const data = await res.json()
  if (!data.ok) {
    return NextResponse.json({ ok: false, message: data.description || 'ส่งเข้าเทเลแกรมไม่สำเร็จ' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN หรือ TELEGRAM_CHAT_ID บน Vercel' }, { status: 500 })
  }

  const incoming = await request.formData()
  const caption = String(incoming.get('caption') || '').slice(0, 1000)
  const kind = String(incoming.get('kind') || 'photo')

  if (kind === 'video') {
    const value = incoming.get('video')
    if (!(value instanceof File) || value.size <= 0) {
      return NextResponse.json({ ok: false, message: 'ไม่มีวิดีโอ' }, { status: 400 })
    }
    if (value.size > 4 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: 'วิดีโอยังใหญ่เกิน 4MB ถ่ายคลิปสั้นลง' }, { status: 400 })
    }
    const body = new FormData()
    body.append('chat_id', chatId)
    body.append('caption', caption)
    body.append('supports_streaming', 'true')
    body.append('video', value, value.name || 'clip.mp4')
    return telegram(token, 'sendVideo', body)
  }

  const files: File[] = []
  for (const key of PHOTO_KEYS) {
    const value = incoming.get(key)
    if (value instanceof File && value.size > 0) files.push(value)
  }
  if (files.length === 0) {
    return NextResponse.json({ ok: false, message: 'ไม่มีรูป' }, { status: 400 })
  }
  if (files.length > 10) {
    return NextResponse.json({ ok: false, message: 'ส่งรูปได้ครั้งละไม่เกิน 10 รูป' }, { status: 400 })
  }
  if (files.some((file) => file.size > 4 * 1024 * 1024)) {
    return NextResponse.json({ ok: false, message: 'รูปยังใหญ่เกินไป' }, { status: 400 })
  }

  if (files.length === 1) {
    const clock = String(incoming.get('clock') || '')
    if (clock && !/^[0-9a-f-]{36}$/i.test(clock)) {
      return NextResponse.json({ ok: false, message: 'รหัสเข้างานไม่ถูกต้อง' }, { status: 400 })
    }
    const body = new FormData()
    body.append('chat_id', chatId)
    body.append('caption', caption)
    body.append('photo', files[0], clock ? 'clock.jpg' : 'car.jpg')
    if (clock) {
      body.append('reply_markup', JSON.stringify({
        inline_keyboard: [[
          { text: 'อนุมัติ', callback_data: `c:${clock}` },
          { text: 'ไม่ผ่าน', callback_data: `x:${clock}` },
        ]],
      }))
    }
    const sent = await telegram(token, 'sendPhoto', body)
    if (clock && sent.ok) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      await supabase.rpc('clock_photo_sent', { punch_id: clock, gate: reviewGate(token) })
    }
    return sent
  }

  const body = new FormData()
  body.append('chat_id', chatId)
  body.append('media', JSON.stringify(files.map((file, i) => ({
    type: 'photo',
    media: `attach://file${i}`,
    ...(i === 0 && caption ? { caption } : {}),
  }))))
  files.forEach((file, i) => body.append(`file${i}`, file, `car${i}.jpg`))
  return telegram(token, 'sendMediaGroup', body)
}
// a clock photo carries an approve button and other photos stay plain
