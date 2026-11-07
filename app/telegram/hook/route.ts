import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/public'

function reviewGate(token: string) {
  return (token.split(':')[1] || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

async function telegram(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ ok: false }))
  return data.ok === true
}

function clockCaption(caption: string, status: string) {
  const lines = String(caption || '').replace(/\r/g, '').split('\n').filter((line) => line.trim() && !line.startsWith('สถานะ:'))
  if (!lines.length) lines.push('เข้างาน รัษฎาแอร์')
  lines.push(`สถานะ: ${status}`)
  return lines.join('\n').slice(0, 1024)
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const gate = reviewGate(token)
  if (!token || gate.length < 20) return NextResponse.json({ ok: false, gateLength: gate.length })
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const bound = await supabase.rpc('telegram_bind_gate', { gate })
  const hook = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://aircon.tppth.cam/telegram/hook',
      secret_token: gate,
      allowed_updates: ['callback_query'],
    }),
  })
  const data = await hook.json().catch(() => ({ ok: false }))
  return NextResponse.json({ ok: !!data.ok && !bound.error, bound: !bound.error, webhook: data.ok === true })
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const gate = reviewGate(token)
  const header = request.headers.get('x-telegram-bot-api-secret-token') || ''
  if (!gate || header !== gate) return NextResponse.json({ ok: false }, { status: 401 })
  const update = await request.json().catch(() => null)
  const query = update?.callback_query
  if (!query) return NextResponse.json({ ok: true })
  const data = String(query.data || '')
  if (data.startsWith('c:') || data.startsWith('x:')) {
    const punchId = data.slice(2)
    const approve = data.startsWith('c:')
    if (!/^[0-9a-f-]{36}$/i.test(punchId)) {
      await telegram(token, 'answerCallbackQuery', { callback_query_id: query.id, text: 'คำสั่งไม่ถูกต้อง' })
      return NextResponse.json({ ok: true })
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const reviewed = await supabase.rpc('telegram_clock', {
      punch_id: punchId,
      decision: approve ? 'approved' : 'rejected',
      gate,
    })
    const state = reviewed.error ? '' : String(reviewed.data || '')
    const saved = state === 'saved' || state === 'already'
    const rejected = state === 'rejected'
    const missing = state === 'missing'
    const toast = saved ? 'บันทึกพนักงานแล้ว' : rejected ? 'ไม่บันทึก' : 'บันทึกไม่สำเร็จ'
    await telegram(token, 'answerCallbackQuery', { callback_query_id: query.id, text: toast })
    if ((saved || rejected || missing) && query.message?.chat?.id && query.message?.message_id) {
      const caption = clockCaption(String(query.message.caption || query.message.text || ''), saved ? 'บันทึกพนักงานแล้ว' : 'ไม่บันทึก')
      const edit = {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] },
      }
      if (query.message.photo) {
        await telegram(token, 'editMessageCaption', { ...edit, caption })
      } else {
        await telegram(token, 'editMessageText', { ...edit, text: caption })
      }
    }
    return NextResponse.json({ ok: true })
  }
  const decision = data.startsWith('a:') ? 'approved' : data.startsWith('r:') ? 'rejected' : ''
  const accountId = data.slice(2)
  if (!decision || !/^[0-9a-f-]{36}$/i.test(accountId)) {
    await telegram(token, 'answerCallbackQuery', { callback_query_id: query.id, text: 'คำสั่งไม่ถูกต้อง' })
    return NextResponse.json({ ok: true })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const reviewed = await supabase.rpc('telegram_review_staff', { account_id: accountId, decision, gate })
  const done = !reviewed.error
  const label = decision === 'approved' ? 'อนุมัติแล้ว' : 'ไม่ผ่าน'
  await telegram(token, 'answerCallbackQuery', {
    callback_query_id: query.id,
    text: done ? label : 'ทำไม่สำเร็จ',
  })
  if (done && query.message?.chat?.id && query.message?.message_id) {
    const previous = String(query.message.text || '')
    await telegram(token, 'editMessageText', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      text: `${previous}\n\n${label}`,
    })
  }
  return NextResponse.json({ ok: true })
}
// the button is answered before the same photo caption is updated
