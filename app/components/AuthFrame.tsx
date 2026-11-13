export default function AuthFrame({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#140406] px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.38),transparent_58%)]" />
      <div className={`relative mx-auto w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="overflow-hidden rounded-3xl bg-white text-gray-900 shadow-2xl shadow-black/40">
          <div className="bg-gradient-to-b from-red-700 to-red-600 px-6 pb-6 pt-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
              <img src="/ratsada-logo.png" alt="โลโก้รัษฎาแอร์" className="h-full w-full object-contain" />
            </div>
            <p className="text-xs font-semibold tracking-[0.22em] text-red-100">RATSADA AIR</p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-red-50">{subtitle}</p>
          </div>
          <div className="px-5 py-6 sm:px-7">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-red-100/80">
          ระบบพนักงานรัษฎาแอร์ · ใช้งานได้หลังผู้ดูแลระบบอนุมัติ
        </p>
      </div>
    </div>
  );
}
