'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('กำลังอัปโหลด...')

    const supabase = createClient()
    const fileName = `${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('vehicle-photos')
      .upload(fileName, file)

    if (error) {
      setMessage('อัปโหลดไม่สำเร็จ: ' + error.message)
    } else {
      setMessage('อัปโหลดสำเร็จ!')
    }
    setUploading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">อัปโหลดรูปรถ</h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="mb-4"
      />
      {message && <p className="mt-4">{message}</p>}
    </div>
  )
}
