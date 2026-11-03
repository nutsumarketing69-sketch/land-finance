import { createClient as createSupabase } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/public'

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้งเทเลแกรม' }, { status: 500 })
  }
  const header = request.headers.get('authorization') || ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  const supabase = bearer
    ? createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
        accessToken: async () => bearer,
      })
    : await createClient()
  const { data: userData } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser()
  if (!userData.user) return NextResponse.json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' }, { status: 401 })
  const account = await supabase
    .from('staff_accounts')
    .select('id, username, full_name, phone, position, status, branch_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  const row = account.data
  if (!row || row.status !== 'pending') {
    return NextResponse.json({ ok: false, message: 'ไม่มีคำขอที่รออนุมัติ' }, { status: 400 })
  }
  let branchName = '-'
  if (row.branch_id) {
    const branch = await supabase.from('branches').select('name').eq('id', row.branch_id).maybeSingle()
    branchName = branch.data?.name || '-'
  }
  const text = [
    'พนักงานสมัครใหม่ รออนุมัติ',
    `ชื่อ: ${row.full_name}`,
    `ผู้ใช้: ${row.username}`,
    `เบอร์: ${row.phone || '-'}`,
    `สาขา: ${branchName}`,
    `หน้าที่: ${row.position || '-'}`,
  ].join('\n')
  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[
          { text: 'อนุมัติ', callback_data: `a:${row.id}` },
          { text: 'ไม่ผ่าน', callback_data: `r:${row.id}` },
        ]],
      },
    }),
  })
  const data = await sent.json().catch(() => ({ ok: false }))
  if (!data.ok) {
    return NextResponse.json({ ok: false, message: 'ส่งเข้ากลุ่มไม่สำเร็จ' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
// signup posts the request with approve and reject buttons
