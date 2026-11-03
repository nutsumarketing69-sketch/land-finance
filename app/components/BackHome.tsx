'use client'

import { usePathname } from 'next/navigation'

export default function BackHome() {
  const path = usePathname()
  if (!path || path === '/' || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/pending') || path.startsWith('/auth') || path.startsWith('/branch-printer')) return null
  return (
    <>
      <style>{`@media print { .back-home { display: none !important; } }`}</style>
      <a href="/" className="back-home no-print fixed bottom-4 left-4 z-[80] rounded-full bg-black/85 text-white border border-white/30 px-4 py-3 text-sm shadow-lg">
        กลับหน้าหลัก
      </a>
    </>
  )
}
