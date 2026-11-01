'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranches = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('branches').select('*')
      setBranches(data || [])
      setLoading(false)
    }
    fetchBranches()
  }, [])

  if (loading) return <div className="p-8">กำลังโหลด...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">เลือกสาขา</h1>

      <div className="space-y-3">
        {branches.map((branch) => (
          <div
            key={branch.id}
            onClick={() => setSelected(branch.id)}
            className={`border p-4 rounded cursor-pointer transition ${
              selected === branch.id ? 'border-blue-500 bg-blue-900/20' : ''
            }`}
          >
            <div className="font-medium">{branch.name}</div>
            <div className="text-sm text-gray-400">{branch.address || '-'}</div>
            <div className="text-sm text-gray-400">{branch.phone || '-'}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-6 p-4 bg-green-900/30 border border-green-600 rounded">
          เลือกสาขาแล้ว: {branches.find(b => b.id === selected)?.name}
        </div>
      )}
    </div>
  )
}
