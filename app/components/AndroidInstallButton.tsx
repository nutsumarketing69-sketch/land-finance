const STEPS = "เปิดเมนู Chrome แล้วเลือกเพิ่มไปที่หน้าจอหลัก";

export default function AndroidInstallButton() {
  return (
    <div className="flex flex-col gap-2">
      <a
        href="/land-finance.apk"
        download="land-finance.apk"
        data-testid="android-install"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300/50 px-4 py-3 text-center text-sm font-semibold text-emerald-100"
      >
        ติดตั้งแอปแอนดรอยด์
      </a>
      <p data-testid="android-install-steps" className="text-sm leading-6 text-slate-300">
        {STEPS}
      </p>
    </div>
  );
}
