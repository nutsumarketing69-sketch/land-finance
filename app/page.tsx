import HomeMenus from './components/HomeMenus'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <header className="bg-red-600 px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-white text-red-600 font-black px-3 py-2 rounded-xl text-xl sm:text-2xl tracking-wider">
            RATSADA
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">รัษฎาแอร์</h1>
            <p className="text-sm opacity-90">ระบบจัดการร้านแอร์รถยนต์แบบหลายสาขา</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-6 sm:px-6 sm:py-10">
        <HomeMenus />

        <footer className="mt-10 text-center text-gray-500 text-sm space-y-1 break-words px-2">
          <p>Tel. 099-4102559 , 076-602429</p>
          <p>201/2 หมู่ที่ 5 ถนนสนามบินเมืองใหม่ ตำบลเทพกระษัตรี อำเภอถลาง จังหวัดภูเก็ต 83110</p>
        </footer>
      </main>
    </div>
  )
}
