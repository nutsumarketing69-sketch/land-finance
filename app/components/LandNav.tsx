"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LandMark from "@/app/components/LandMark";
import { FilePlus, Home, Scale, Search, UserRound } from "lucide-react";

const itemClass =
  "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-medium";

export default function LandNav({ children, preview = false }: { children: ReactNode; preview?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const suffix = preview ? "?preview=1" : "";

  function goSearch() {
    const params = new URLSearchParams();
    if (preview) params.set("preview", "1");
    params.set("focus", "search");
    const box = document.getElementById("land-omnibox");
    if (box instanceof HTMLInputElement) {
      box.focus();
      box.scrollIntoView({ block: "center" });
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  function goProfile() {
    router.push(preview ? "/profile?preview=1" : "/profile");
  }

  const homeActive = pathname === "/dashboard";
  const createActive = pathname.startsWith("/contracts/new");
  const valueActive = pathname.startsWith("/valuation");

  return (
    <div className="min-h-screen bg-slate-950 md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside data-testid="land-sidebar" className="hidden border-r border-slate-800 bg-slate-900 md:flex md:flex-col md:gap-2 md:p-4">
        <div className="px-2 pb-3">
          <LandMark />
        </div>
        <Link href={`/dashboard${suffix}`} className={`${itemClass} ${homeActive ? "bg-amber-400 text-slate-950" : "text-slate-100"}`}>
          <Home className="h-5 w-5" />
          หน้าแรก
        </Link>
        <Link href={`/contracts/new${suffix}`} className={`${itemClass} ${createActive ? "bg-amber-400 text-slate-950" : "text-slate-100"}`}>
          <FilePlus className="h-5 w-5" />
          สร้างสัญญา
        </Link>
        <Link href={`/valuation${suffix}`} data-testid="nav-valuation" className={`${itemClass} ${valueActive ? "bg-amber-400 text-slate-950" : "text-slate-100"}`}>
          <Scale className="h-5 w-5" />
          ประเมินราคา
        </Link>
        <button type="button" onClick={goSearch} className={`${itemClass} text-slate-100`}>
          <Search className="h-5 w-5" />
          ค้นหาด่วน
        </button>
        <button type="button" onClick={goProfile} className={`${itemClass} text-slate-100`}>
          <UserRound className="h-5 w-5" />
          โปรไฟล์
        </button>
      </aside>
      <div className="min-w-0 pb-24 md:pb-0">{children}</div>
      <nav data-testid="land-bottom-nav" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-800 bg-slate-900 md:hidden">
        <Link href={`/dashboard${suffix}`} className={`${itemClass} flex-col text-xs ${homeActive ? "text-amber-300" : "text-slate-200"}`}>
          <Home className="h-5 w-5" />
          หน้าแรก
        </Link>
        <Link href={`/contracts/new${suffix}`} className={`${itemClass} flex-col px-1 text-[11px] leading-tight ${createActive ? "text-amber-300" : "text-slate-200"}`}>
          <FilePlus className="h-5 w-5" />
          สร้างสัญญา
        </Link>
        <Link href={`/valuation${suffix}`} data-testid="nav-valuation" className={`${itemClass} flex-col px-1 text-[11px] leading-tight ${valueActive ? "text-amber-300" : "text-slate-200"}`}>
          <Scale className="h-5 w-5" />
          ประเมินราคา
        </Link>
        <button type="button" data-testid="nav-search" onClick={goSearch} className={`${itemClass} flex-col px-1 text-[11px] leading-tight text-slate-200`}>
          <Search className="h-5 w-5" />
          ค้นหาด่วน
        </button>
        <button type="button" data-testid="nav-profile" onClick={goProfile} className={`${itemClass} flex-col text-xs text-slate-200`}>
          <UserRound className="h-5 w-5" />
          โปรไฟล์
        </button>
      </nav>
    </div>
  );
}
