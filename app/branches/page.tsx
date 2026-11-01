import { createClient } from '@/lib/supabase/server'

export default async function BranchesPage() {
  const supabase = await createClient()
  
  const { data: branches, error } = await supabase
    .from('branches')
    .select('*')

  if (error) {
    return <div className="p-8 text-red-500">เกิดข้อผิดพลาด: {error.message}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">รายชื่อสาขา</h1>
      {!branches || branches.length === 0 ? (
        <p>ยังไม่มีข้อมูลสาขา</p>
      ) : (
        <div className="space-y-4">
          {branches.map((branch: any) => (
            <div key={branch.id} className="border p-4 rounded-lg">
              <h2 className="font-semibold">{branch.name}</h2>
              <p className="text-gray-600">{branch.address || '-'}</p>
              <p className="text-gray-600">{branch.phone || '-'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
