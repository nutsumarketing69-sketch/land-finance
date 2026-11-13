import LandMark from "@/app/components/LandMark";

export default function LandScreen({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.16),transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-md flex-col">
        <LandMark />
        <p className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-amber-100/70">ขายฝาก · จำนอง · จำนำโฉนด</p>
        <section className="mt-5 rounded-[28px] border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/50 sm:p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {lede ? <p className="mt-2 text-sm leading-6 text-slate-400">{lede}</p> : null}
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function landFieldClass() {
  return "mt-1 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3 text-slate-100 focus-within:border-amber-200/80 focus-within:ring-2 focus-within:ring-amber-100/20";
}

export function landButtonClass() {
  return "w-full rounded-2xl bg-amber-200 py-3 text-base font-semibold text-slate-950 disabled:opacity-60";
}
