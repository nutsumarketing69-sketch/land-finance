"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Calculator, Copy, Phone, Search } from "lucide-react";
import LandNav from "@/app/components/LandNav";
import ReferralProfile from "@/app/components/ReferralProfile";
import { playAlertChime } from "@/lib/alertSound";
import {
  CONTRACT_TYPE_LABELS,
  INTEREST_PERIOD_LABELS,
  calculateInterest,
  formatBaht,
  type ContractType,
  type InterestPeriodType,
} from "@/lib/financeCalculator";
import type { LandProfile } from "@/lib/landProfile";
import { createClient } from "@/lib/supabase/client";
import {
  MATCH_REASON_LABELS,
  classifyAlert,
  matchContracts,
  type DashboardContract,
} from "@/lib/dashboardData";

const SOUND_KEY = "land-finance-sound-alerts";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function typeLabel(value: string) {
  return value in CONTRACT_TYPE_LABELS ? CONTRACT_TYPE_LABELS[value as ContractType] : value;
}

function money(value: string) {
  try {
    return formatBaht(value);
  } catch {
    return value;
  }
}

export default function DashboardScreen({
  profile,
  owned,
  incoming,
  preview,
  loadError,
}: {
  profile: LandProfile;
  owned: DashboardContract[];
  incoming: DashboardContract[];
  preview: boolean;
  loadError: string;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"owned" | "incoming">("owned");
  const [today, setToday] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [payoffId, setPayoffId] = useState("");
  const [payoffDate, setPayoffDate] = useState("");
  const [copiedDeed, setCopiedDeed] = useState("");
  const played = useRef(false);

  useEffect(() => {
    const current = localToday();
    setToday(current);
    setPayoffDate(current);
    setSoundOn(window.localStorage.getItem(SOUND_KEY) === "1");
    if (window.location.hash === "#land-omnibox") document.getElementById("land-omnibox")?.focus();
    if (window.location.hash === "#land-profile") document.getElementById("land-profile")?.scrollIntoView();
  }, []);

  const alerts = useMemo(() => {
    if (!today) return { upcoming: [] as DashboardContract[], overdue: [] as DashboardContract[] };
    const upcoming = owned.filter((contract) => classifyAlert(contract, today) === "upcoming");
    const overdue = owned.filter((contract) => classifyAlert(contract, today) === "overdue");
    return { upcoming, overdue };
  }, [owned, today]);

  const hits = useMemo(() => matchContracts(owned, query), [owned, query]);
  const searching = query.trim().length > 0;
  const visible = tab === "incoming" ? incoming : owned;
  const payoff = owned.find((contract) => contract.id === payoffId) ?? incoming.find((contract) => contract.id === payoffId) ?? null;

  function enableSound() {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    const due = alerts.upcoming.length + alerts.overdue.length > 0;
    if (next && due && !played.current) {
      played.current = true;
      playAlertChime();
    }
    if (!next) played.current = false;
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function sendUpline() {
    setConfirming(false);
    if (!profile.referred_by) {
      setNotice("บัญชีนี้ไม่มีต้นทาง ยังไม่ส่งสัญญา");
      return;
    }
    if (preview) {
      setNotice(`โหมดตัวอย่าง: ยังไม่ได้ส่ง ${selected.length} สัญญาขึ้นฐานข้อมูล`);
      setSelected([]);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contracts")
      .update({ shared_with_upline_id: profile.referred_by })
      .in("id", selected)
      .eq("owner_id", profile.id)
      .select("id");
    if (error) {
      setNotice("ส่งสัญญาขึ้นต้นทางไม่สำเร็จ");
      return;
    }
    const count = Array.isArray(data) ? data.length : selected.length;
    setSelected([]);
    setNotice(`ส่งแล้ว ${count} สัญญา`);
  }

  async function copyDeed(deed: string) {
    if (!deed) return;
    try {
      await navigator.clipboard.writeText(deed);
    } catch {
      const area = document.createElement("textarea");
      area.value = deed;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedDeed(deed);
    window.setTimeout(() => setCopiedDeed(""), 1500);
  }

  return (
    <LandNav preview={preview}>
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">สัญญาที่ดิน</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">แดชบอร์ด</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/contracts/new" className="rounded-full bg-amber-400 px-4 py-3 text-center text-sm font-semibold text-slate-950">
                สร้างสัญญาใหม่
              </Link>
              <Link href="/settings/backup" className="rounded-full border border-amber-300/50 px-4 py-3 text-center text-sm font-semibold text-amber-200">
                สำรองข้อมูล
              </Link>
            </div>
          </div>
          {preview ? (
            <p data-testid="preview-banner" className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              โหมดตัวอย่าง ข้อมูลนี้ไม่ได้มาจากบัญชีที่เข้าสู่ระบบ และยังไม่ถูกเขียนลงฐานข้อมูล
            </p>
          ) : null}
          <div id="land-profile">
            <ReferralProfile profile={profile} />
          </div>
        </header>

        <label className="relative block">
          <span className="sr-only">ค้นหาสัญญา</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-300" />
          <input
            id="land-omnibox"
            data-testid="omnibox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นชื่อ เบอร์โทร เลขโฉนด หรือเลขสัญญา"
            className="w-full rounded-2xl border border-amber-300/40 bg-slate-900 py-4 pl-12 pr-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
          />
        </label>

        {loadError ? <p className="rounded-2xl bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{loadError}</p> : null}
        <section data-testid="alert-banner" className="rounded-3xl border border-amber-300/40 bg-slate-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <h2 className="font-semibold text-amber-200">สัญญาที่ต้องติดตาม</h2>
                    <p className="text-sm text-slate-400">ใกล้ครบกำหนด {alerts.upcoming.length} รายการ · เลยกำหนด {alerts.overdue.length} รายการ</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="sound-toggle"
                  aria-pressed={soundOn}
                  onClick={enableSound}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${soundOn ? "bg-amber-400 text-slate-950" : "border border-amber-300/50 text-amber-200"}`}
                >
                  {soundOn ? "เปิดเสียงเตือนแล้ว" : "เปิดเสียงเตือน"}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <AlertList title="ใกล้ครบกำหนด" rows={alerts.upcoming} />
                <AlertList title="เลยกำหนด" rows={alerts.overdue} />
              </div>
        </section>

        {searching ? (
          <ul data-testid="search-results" className="flex flex-col gap-2">
            {hits.length ? hits.map((hit) => (
              <li key={hit.contract.id} data-testid="search-hit" className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm">
                <p className="font-medium text-white">{hit.contract.customerName || "ไม่ระบุชื่อ"} · {hit.contract.contractNumber || "ไม่มีเลขสัญญา"}</p>
                <p className="mt-1 text-amber-200">ตรงกับ{hit.reasons.map((reason) => MATCH_REASON_LABELS[reason]).join(" ")}</p>
              </li>
            )) : <li className="text-sm text-slate-400">ไม่พบรายการที่ตรงกับคำค้น</li>}
          </ul>
        ) : (
          <>
            <div className="flex gap-2">
              <button type="button" data-testid="tab-owned" onClick={() => setTab("owned")} className={`rounded-full px-4 py-2 text-sm ${tab === "owned" ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-200"}`}>
                สัญญาของฉัน
              </button>
              <button type="button" data-testid="tab-incoming" onClick={() => setTab("incoming")} className={`rounded-full px-4 py-2 text-sm ${tab === "incoming" ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-slate-200"}`}>
                สัญญาจากลูกข่าย
              </button>
            </div>

            {notice ? <p data-testid="upline-notice" className="text-sm text-amber-200">{notice}</p> : null}

            <section>
              <div data-testid="contract-cards" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:hidden">
                {visible.map((contract) => (
                  <article key={contract.id} data-testid="contract-card" className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-slate-900 p-4">
                    <ContractHeading contract={contract} owned={tab === "owned"} selected={selected.includes(contract.id)} onSelect={() => toggleSelected(contract.id)} />
                    <p className="text-emerald-300">{money(contract.principal)}</p>
                    <p className="text-sm text-slate-400">{contract.district} {contract.province} · ถึง {contract.endDate || "-"}</p>
                    <ContractTools
                      contract={contract}
                      copied={copiedDeed === contract.deedNumber}
                      onCopy={() => void copyDeed(contract.deedNumber)}
                      onPayoff={() => { setPayoffId(contract.id); setPayoffDate(today || contract.endDate); }}
                    />
                  </article>
                ))}
              </div>
              <div data-testid="contract-table" className="hidden overflow-x-auto rounded-3xl border border-slate-700 xl:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-4 py-3">สัญญา</th>
                      <th className="px-4 py-3">ลูกค้า</th>
                      <th className="px-4 py-3">เงินต้น</th>
                      <th className="px-4 py-3">โฉนด</th>
                      <th className="px-4 py-3">ถึง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((contract) => (
                      <tr key={contract.id} className="border-t border-slate-800">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {tab === "owned" ? (
                              <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={selected.includes(contract.id)} onChange={() => toggleSelected(contract.id)} aria-label={`เลือก ${contract.contractNumber}`} />
                            ) : null}
                            <span>{contract.contractNumber || "ไม่มีเลขสัญญา"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{contract.customerName || "ไม่ระบุชื่อ"}</td>
                        <td className="px-4 py-3 text-emerald-300">{money(contract.principal)}</td>
                        <td className="px-4 py-3">
                          <ContractTools
                            contract={contract}
                            copied={copiedDeed === contract.deedNumber}
                            onCopy={() => void copyDeed(contract.deedNumber)}
                            onPayoff={() => { setPayoffId(contract.id); setPayoffDate(today || contract.endDate); }}
                          />
                        </td>
                        <td className="px-4 py-3">{contract.endDate || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visible.length ? <p className="text-sm text-slate-400">ยังไม่มีสัญญาในแท็บนี้</p> : null}
            </section>
          </>
        )}
      </div>

      {tab === "owned" && selected.length > 0 ? (
        <div data-testid="upline-bar" className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl flex-col gap-3 rounded-3xl border border-amber-300/50 bg-slate-900/95 p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between md:bottom-4">
          <p className="text-sm text-amber-100">เลือกแล้ว {selected.length} สัญญา</p>
          <button type="button" data-testid="send-upline" onClick={() => setConfirming(true)} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950">
            ส่งสัญญาขึ้นต้นทาง (Send Selected to Upline)
          </button>
        </div>
      ) : null}

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">ยืนยันการส่งขึ้นต้นทาง</h2>
            <p className="mt-2 text-sm text-slate-300">จะแชร์ {selected.length} สัญญาให้ต้นทางที่แนะนำบัญชีนี้ อ่านได้อย่างเดียว</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="rounded-full bg-slate-800 px-4 py-3 text-sm">ยกเลิก</button>
              <button type="button" data-testid="upline-confirm" onClick={() => void sendUpline()} className="rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950">ยืนยัน</button>
            </div>
          </div>
        </div>
      ) : null}

      {payoff ? (
        <PayoffModal contract={payoff} date={payoffDate} onDate={setPayoffDate} onClose={() => setPayoffId("")} />
      ) : null}
    </main>
    </LandNav>
  );
}

function ContractHeading({
  contract,
  owned,
  selected,
  onSelect,
}: {
  contract: DashboardContract;
  owned: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-amber-300">{typeLabel(contract.contractType)}</p>
        <h3 className="text-lg font-semibold text-white">{contract.contractNumber || "ไม่มีเลขสัญญา"}</h3>
        <p className="text-sm text-slate-300">{contract.customerName || "ไม่ระบุชื่อ"}</p>
      </div>
      {owned ? (
        <input
          data-testid={`select-${contract.id}`}
          type="checkbox"
          className="mt-1 h-5 w-5 accent-amber-400"
          checked={selected}
          onChange={onSelect}
          aria-label={`เลือก ${contract.contractNumber}`}
        />
      ) : null}
    </div>
  );
}

function ContractTools({
  contract,
  copied,
  onCopy,
  onPayoff,
}: {
  contract: DashboardContract;
  copied: boolean;
  onCopy: () => void;
  onPayoff: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        data-testid="call-customer"
        href={contract.customerPhone ? `tel:${contract.customerPhone}` : undefined}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-400 px-3 text-sm font-semibold text-slate-950"
      >
        <Phone className="h-4 w-4" />
        โทร
      </a>
      <button type="button" data-testid="copy-deed" onClick={onCopy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-300/50 px-3 text-sm text-amber-100">
        <Copy className="h-4 w-4" />
        {copied ? "คัดลอกแล้ว" : `คัดลอกโฉนด ${contract.deedNumber || "-"}`}
      </button>
      <button
        type="button"
        data-testid={`payoff-${contract.id}`}
        onClick={onPayoff}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-300/40 px-3 text-sm text-emerald-200"
      >
        <Calculator className="h-4 w-4" />
        คำนวณยอดปิด
      </button>
    </div>
  );
}

function AlertList({ title, rows }: { title: string; rows: DashboardContract[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-amber-200">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-200">
        {rows.length ? rows.map((row) => (
          <li key={row.id}>{row.contractNumber || row.customerName} · ถึง {row.endDate}</li>
        )) : <li className="text-slate-500">ไม่มี</li>}
      </ul>
    </div>
  );
}

function PayoffModal({
  contract,
  date,
  onDate,
  onClose,
}: {
  contract: DashboardContract;
  date: string;
  onDate: (value: string) => void;
  onClose: () => void;
}) {
  let accrued = "";
  let total = "";
  let error = "";
  const period = contract.interestPeriodType;
  const periodOk = period === "daily" || period === "monthly" || period === "yearly";
  if (!contract.startDate || !date) error = "เลือกวันที่เพื่อคำนวณ";
  else if (!periodOk) error = "งวดดอกเบี้ยของสัญญานี้ไม่ถูกต้อง";
  else {
    try {
      const result = calculateInterest({
        principal: contract.principal || "0",
        interestRate: contract.interestRate || "0",
        interestPeriodType: period,
        startDate: contract.startDate,
        payoffDate: date,
      });
      accrued = formatBaht(result.accruedInterest.exact);
      total = formatBaht(result.totalPayoff.exact);
    } catch {
      error = "ยังคำนวณยอดปิดไม่ได้";
    }
  }
  const periodLabel = periodOk ? INTEREST_PERIOD_LABELS[period as InterestPeriodType] : period;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-emerald-300/30 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">คำนวณยอดปิด</h2>
        <p className="mt-1 text-sm text-slate-400">{contract.contractNumber} · อัตรา {contract.interestRate}% {periodLabel}</p>
        <label className="mt-4 block text-sm">
          วันที่ปิดบัญชี
          <input data-testid="payoff-date" type="date" value={date} onChange={(event) => onDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base" />
        </label>
        {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt>ดอกเบี้ยค้าง</dt><dd data-testid="payoff-accrued" className="text-emerald-300">{accrued}</dd></div>
            <div className="flex justify-between gap-3"><dt>ยอดปิด</dt><dd data-testid="payoff-total" className="text-emerald-300">{total}</dd></div>
          </dl>
        )}
        <button type="button" onClick={onClose} className="mt-5 rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950">ปิด</button>
      </div>
    </div>
  );
}
