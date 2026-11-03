import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/public'

function reviewGate(token: string) {
  return (token.split(':')[1] || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
}

async function telegram(token: string, method: string, body: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
// the approve button is answered here
