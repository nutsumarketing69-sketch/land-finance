import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/public'
import { normalizeUsername, usernameError } from '@/lib/staff'

function reviewGate(token: string) {
  return (token.split(':')[1] || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

function tempPassword() {
  const number = Math.floor(100000 + Math.random() * 900000)
  return `Rd${number}`
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''
  const gate = reviewGate(token)
  if (!token || !chatId || gate.length < 20) {
    return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้งเทเลแกรมของร้าน' }, { status: 500 })
  }
  const body = await request.json().catch(() => null)
  const username = normalizeUsername(String(body?.username || ''))
  const nameError = usernameError(username)
  if (nameError) return NextResponse.json({ ok: false, message: nameError }, { status: 400 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  await supabase.rpc('telegram_bind_gate', { gate })
  const password = tempPassword()
  const reset = await supabase.rpc('telegram_reset_password', {
    p_username: username,
    p_password: password,
    gate,
  })
  if (reset.error) {
    const text = reset.error.message || ''
    if (text.includes('missing')) return NextResponse.json({ ok: false, message: 'ไม่พบชื่อผู้ใช้นี้ หรือบัญชียังไม่ได้รับอนุมัติ' })
    if (text.includes('soon')) return NextResponse.json({ ok: false, message: 'เพิ่งส่งรหัสไปแล้ว รอประมาณ 10 นาทีแล้วค่อยกดใหม่' })
    return NextResponse.json({ ok: false, message: 'ตั้งรหัสใหม่ไม่สำเร็จ' }, { status: 500 })
  }

  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: [
        'พนักงานลืมรหัสผ่าน',
        `ผู้ใช้: ${username}`,
        `รหัสชั่วคราว: ${password}`,
        'ให้พนักงานเข้าสู่ระบบแล้วเปลี่ยนรหัสที่เมนูบัญชีของฉัน',
      ].join('\n'),
    }),
  })
  const data = await sent.json().catch(() => ({ ok: false }))
  if (!data.ok) {
    await supabase.rpc('telegram_reset_clear', { p_username: username, gate })
    return NextResponse.json({ ok: false, message: 'ส่งเข้ากลุ่มไม่สำเร็จ กดอีกครั้งได้เลย' }, { status: 502 })
  }
  return NextResponse.json({
    ok: true,
    message: 'ส่งรหัสชั่วคราวเข้ากลุ่มเทเลแกรมแล้ว ให้ผู้ดูแลบอกพนักงาน',
  })
}
// a failed telegram send clears the wait so the employee can try again
