'use client'

import { useEffect, useState, type ComponentType, type MouseEvent } from 'react'
import { useAccess } from '@/app/components/AuthShell'
import { canOpenDeskItem, deskById, type DeskItem } from '@/lib/desks'

const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  '/search': () => import('@/app/search/screen'),
  '/bills': () => import('@/app/bills/screen'),
  '/history': () => import('@/app/history/screen'),
  '/jobs': () => import('@/app/jobs/screen'),
  '/jobs-by-branch': () => import('@/app/jobs-by-branch/screen'),
  '/warranty': () => import('@/app/warranty/screen'),
  '/parts': () => import('@/app/parts/screen'),
  '/stock': () => import('@/app/stock/screen'),
  '/customers': () => import('@/app/customers/screen'),
  '/customer/new': () => import('@/app/customer/new/screen'),
  '/vehicle/new': () => import('@/app/vehicle/new/screen'),
  '/report': () => import('@/app/report/screen'),
  '/report-advanced': () => import('@/app/report-advanced/screen'),
  '/sales': () => import('@/app/sales/screen'),
  '/daily-close': () => import('@/app/daily-close/screen'),
  '/credit': () => import('@/app/credit/screen'),
  '/summary': () => import('@/app/summary/screen'),
  '/dashboard': () => import('@/app/dashboard/screen'),
  '/approvals': () => import('@/app/approvals/screen'),
  '/access': () => import('@/app/access/screen'),
  '/employees': () => import('@/app/employees/screen'),
  '/branches': () => import('@/app/branches/screen'),
  '/import-bills': () => import('@/app/import-bills/screen'),
  '/backup': () => import('@/app/backup/screen'),
}

export default function DeskScreen({ desk, initial }: { desk: string; initial: string }) {
  const { can, account, ready } = useAccess()
  const group = deskById(desk)
  const [tab, setTab] = useState(initial)
  const [mounted, setMounted] = useState<Record<string, ComponentType>>({})

  const items = (group?.items || []).filter((item) => canOpenDeskItem(item, can, account?.role))
  const active = items.some((item) => item.href === tab) ? tab : (items[0]?.href || initial)

  useEffect(() => {
    if (!ready) return
    if (active !== tab) setTab(active)
  }, [ready, active, tab])

  useEffect(() => {
    const href = active
    const load = LOADERS[href]
    if (!load || mounted[href]) return
    let cancel = false
    load().then((mod) => {
      if (cancel) return
      setMounted((prev) => (prev[href] ? prev : { ...prev, [href]: mod.default }))
    })
    return () => {
      cancel = true
    }
  }, [active, mounted])

  useEffect(() => {
    if (!group) return
    const timer = window.setTimeout(() => {
      group.items.forEach((item) => {
        const load = LOADERS[item.href]
        if (load) void load()
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [group])

  const open = (href: string, search = '') => {
    if (href === active && !search) return
    setTab(href)
    window.dispatchEvent(new CustomEvent('desk-tab', { detail: { href, search } }))
  }

  const followDeskLink = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    const raw = anchor.getAttribute('href') || ''
    if (!raw.startsWith('/') || raw.startsWith('//')) return
    const url = new URL(raw, window.location.origin)
    if (!LOADERS[url.pathname]) return
    if (!items.some((item) => item.href === url.pathname)) return
    event.preventDefault()
    open(url.pathname, url.search)
  }

  if (!ready || !group) return <p className="px-4 py-8 text-sm text-gray-300">กำลังเปิด...</p>

  return (
    <div onClick={followDeskLink}>
      <div className="no-print sticky top-0 z-30 border-b border-white/10 bg-[#140406]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <div className="text-sm font-semibold text-red-200">{group.title}</div>
          <p className="mt-0.5 text-xs leading-5 text-gray-400">{group.note}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {items.map((item: DeskItem) => {
              const on = item.href === active
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => open(item.href)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm ${on ? 'bg-red-600 font-semibold text-white' : 'border border-gray-600 text-gray-100'}`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {items.map((item) => {
        const Panel = mounted[item.href]
        if (!Panel) {
          if (item.href !== active) return null
          return <p key={item.href} className="px-4 py-8 text-center text-sm text-gray-300">กำลังเปิด...</p>
        }
        return (
          <div key={item.href} hidden={item.href !== active}>
            <Panel />
          </div>
        )
      })}
    </div>
  )
}
// the topic bar stays put and only the lower pane changes
