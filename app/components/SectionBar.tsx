'use client'

import { usePathname } from 'next/navigation'
import { useAccess } from '@/app/components/AuthShell'
import { canOpenDeskItem, deskById, type DeskItem } from '@/lib/desks'

function currentHref(pathname: string, items: DeskItem[]) {
  const path = pathname.split('?')[0] || '/'
  const hits = items.filter((item) => path === item.href || path.startsWith(item.href + '/'))
  hits.sort((a, b) => b.href.length - a.href.length)
  return hits[0]?.href || ''
}

export default function SectionBar({ desk }: { desk: string }) {
  const pathname = usePathname() || '/'
  const { can, account, ready } = useAccess()
  const group = deskById(desk)
  if (!group || !ready) return null
  const items = group.items.filter((item) => canOpenDeskItem(item, can, account?.role))
  if (items.length < 2) return null
  const current = currentHref(pathname, group.items)

  return (
    <div className="no-print mb-4">
      <div className="text-sm font-semibold text-red-200">{group.title}</div>
      <p className="mt-0.5 text-xs leading-5 text-gray-400">{group.note}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const on = item.href === current
          return (
            <a
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm ${on ? 'bg-red-600 font-semibold text-white' : 'border border-gray-600 text-gray-100'}`}
            >
              {item.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
// the active desk tab stays red and the rest stay one tap away
