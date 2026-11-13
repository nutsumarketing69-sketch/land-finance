import Link from "next/link";
import type { LandProfile } from "@/lib/landProfile";
import ReferralProfile from "./ReferralProfile";

export default function LandHome({ profile }: { profile: LandProfile }) {
  return (
    <main className="min-h-screen bg-[#0c1210] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200/80">สัญญาที่ดิน</p>
          <h1 className="mt-1 text-2xl font-semibold">แดชบอร์ด</h1>
          <p className="mt-1 text-sm text-emerald-50/80">ขายฝาก จำนอง และจำนำโฉนด</p>
        </header>
        <Link href="/contracts/new" className="rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-medium text-emerald-950">
          สร้างสัญญาใหม่
        </Link>
        <ReferralProfile profile={profile} />
      </div>
    </main>
  );
}
