'use client'

import { useState } from 'react'
import AuthFrame from '@/app/components/AuthFrame'
import { usernameError } from '@/lib/staff'

export default function ForgotPage() {
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nameError = usernameError(username)
    if (nameError) {
      setOk(false)
      setMsg(nameError)
      return
    }
    setBusy(true)
    setMsg('')
    const res = await fetch('/telegram/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    })
    const data = await res.json().catch(() => ({ ok: false, message: 'ส่งไม่สำเร็จ' }))
    setBusy(false)
    setOk(!!data.ok)
    setMsg(data.message || (data.ok ? 'ส่งรหัสชั่วคราวเข้ากลุ่มเทเลแกรมแล้ว' : 'ส่งไม่สำเร็จ'))
  }

  return (
    <AuthFrame title="ลืมรหัสผ่าน" subtitle="ตั้งรหัสใหม่แล้วส่งเข้ากลุ่มเทเลแกรมร้าน">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-gray-600">
          รหัสเดิมเปิดกลับมาไม่ได้ ระบบจะตั้งรหัสชั่วคราวใหม่ แล้วส่งชื่อผู้ใช้กับรหัสนั้นเข้ากลุ่มเทเลแกรมของร้าน
          ให้ผู้ดูแลบอกพนักงาน หลังจากเข้าได้แล้วให้เปลี่ยนรหัสที่เมนูบัญชีของฉัน
        </p>
        <label className="block text-sm font-medium text-gray-700">
          ชื่อผู้ใช้ USER
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            placeholder="ภาษาอังกฤษเท่านั้น"
          />
        </label>
        {msg && (
          <p className={`rounded-xl px-3 py-2 text-sm ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg}</p>
        )}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-red-600 py-3 text-base font-semibold text-white disabled:opacity-60">
          {busy ? 'กำลังส่ง...' : 'ส่งรหัสชั่วคราวเข้าเทเลแกรม'}
        </button>
        <a href="/login" className="block text-center text-sm font-medium text-red-700">กลับไปเข้าสู่ระบบ</a>
      </form>
    </AuthFrame>
  )
}
// a temporary password is sent to the shop group
