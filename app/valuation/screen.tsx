"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import LandNav from "@/app/components/LandNav";
import MapPicker from "@/app/contracts/new/map-picker";
import { parseGoogleMapsUrl } from "@/lib/mapLink";
import { createClient } from "@/lib/supabase/client";
import {
  compareAppraisals,
  quoteCommission,
  quoteInterest,
  quoteLoanToValue,
  type AppraisalBasis,
} from "@/lib/valuationQuote";

export type ValuationCustomer = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

const RATES = ["1", "1.25", "1.50", "1.75", "2", "2.25", "2.50", "2.75", "3"] as const;
const TYPES = [
  { id: "sale_redemption", label: "ขายฝาก" },
  { id: "mortgage", label: "จำนอง" },
  { id: "pawn", label: "จำนำโฉนด" },
] as const;

const control =
  "land-control min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-base text-slate-100 outline-none placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-emerald-400/70";

type SplitRow = { id: string; personName: string; roleLabel: string; percentage: string };

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function plusOneYear(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${Number(year) + 1}-${month}-${day}`;
}

function formatThb(value: number) {
  const text = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return `${text} บาท`;
}

function publicSaveError(message: string, fallback: string) {
  if (/row-level security|permission denied|JWT/i.test(message)) return "ไม่มีสิทธิ์บันทึก ต้องเป็นสมาชิกที่เข้าสู่ระบบ";
  if (/duplicate key|unique constraint/i.test(message)) return "ข้อมูลซ้ำกับรายการที่มีอยู่";
  if (/check constraint/i.test(message)) return "ข้อมูลไม่ตรงเงื่อนไขของสัญญา";
  if (/does not exist|schema cache/i.test(message)) return "ยังไม่มีตารางสัญญาในฐานข้อมูล";
  return fallback;
}

export default function ValuationScreen({
  preview,
  customers,
}: {
  preview: boolean;
  customers: ValuationCustomer[];
}) {
  const customRateRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deedNumber, setDeedNumber] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [mapNote, setMapNote] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [plotValue, setPlotValue] = useState("");
  const [nearbyValue, setNearbyValue] = useState("");
  const [basis, setBasis] = useState<AppraisalBasis>("plot");
  const [contractType, setContractType] = useState<(typeof TYPES)[number]["id"]>("sale_redemption");
  const [principal, setPrincipal] = useState("");
  const [presetRate, setPresetRate] = useState("1.50");
  const [customRate, setCustomRate] = useState("");
  const [highIntent, setHighIntent] = useState(false);
  const [monthly, setMonthly] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>([
    { id: "split-1", personName: "", roleLabel: "", percentage: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  useEffect(() => {
    const start = todayIso();
    setStartDate(start);
    setTargetDate(plusOneYear(start));
  }, []);

  const activeRate = customRate.trim() || presetRate;
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    const digits = needle.replace(/\D/g, "");
    return customers.filter((customer) => {
      const customerName = (customer.full_name ?? "").toLowerCase();
      const customerPhone = customer.phone ?? "";
      return customerName.includes(needle) || customerPhone.includes(needle) || (digits && customerPhone.replace(/\D/g, "").includes(digits));
    });
  }, [customers, query]);
  const comparison = compareAppraisals(plotValue, nearbyValue);
  const ltv = quoteLoanToValue(contractType, principal, plotValue, nearbyValue, basis);
  const interest = quoteInterest(principal, activeRate, startDate, targetDate, monthly);
  const commission = quoteCommission(principal, splits.map((row) => row.percentage));

  function applyMapUrl(value: string) {
    setMapUrl(value);
    const parsed = parseGoogleMapsUrl(value);
    if (parsed.status === "point") {
      setLatitude(parsed.latitude);
      setLongitude(parsed.longitude);
      setMapNote("");
      return;
    }
    if (parsed.status === "short") {
      setMapNote("ลิงก์สั้นอ่านพิกัดไม่ได้ กรอกละติจูดกับลองจิจูด หรือวางลิงก์ Google Maps แบบเต็ม");
      return;
    }
    setMapNote(parsed.status === "unparsed" ? "ยังอ่านพิกัดจากลิงก์นี้ไม่ได้" : "");
  }

  function chooseCustomer(customer: ValuationCustomer) {
    setSelectedId(customer.id);
    setName(customer.full_name ?? "");
    setPhone(customer.phone ?? "");
  }

  async function save() {
    setSaveNote("");
    if (preview) {
      setSaveNote("โหมดตัวอย่างคำนวณได้ แต่ยังไม่บันทึกลงฐานข้อมูล");
      return;
    }
    if (!selectedId && (!name.trim() || !phone.trim())) {
      setSaveNote("เลือกลูกค้า หรือกรอกชื่อและเบอร์โทรก่อนบันทึก");
      return;
    }
    if (!deedNumber.trim()) {
      setSaveNote("กรอกเลขโฉนดก่อนบันทึก");
      return;
    }
    if (!interest) {
      setSaveNote("ตรวจเงินต้น อัตรา และวันที่ก่อนบันทึก");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      setSaveNote("เข้าสู่ระบบสมาชิกก่อนบันทึกสัญญา");
      return;
    }
    let customerId = selectedId;
    if (!customerId) {
      const { data, error } = await supabase
        .from("customers")
        .insert({ owner_id: userId, full_name: name.trim(), phone: phone.trim() })
        .select("id")
        .single();
      if (error || !data?.id) {
        setSaving(false);
        setSaveNote(publicSaveError(error?.message ?? "", "สร้างลูกค้าไม่สำเร็จ"));
        return;
      }
      customerId = String(data.id);
      setSelectedId(customerId);
    }
    const storedMap = mapUrl.trim() || (latitude.trim() && longitude.trim() ? `https://www.google.com/maps?q=${latitude.trim()},${longitude.trim()}` : null);
    const { data: land, error: landError } = await supabase
      .from("land_assets")
      .insert({
        owner_id: userId,
        customer_id: customerId,
        deed_number: deedNumber.trim(),
        latitude: latitude.trim() || null,
        longitude: longitude.trim() || null,
        map_url: storedMap,
        appraised_value: plotValue.trim() || null,
        nearby_appraised_value: nearbyValue.trim() || null,
      })
      .select("id")
      .single();
    if (landError || !land?.id) {
      setSaving(false);
      setSaveNote(publicSaveError(landError?.message ?? "", "บันทึกที่ดินไม่สำเร็จ"));
      return;
    }
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        owner_id: userId,
        customer_id: customerId,
        land_id: land.id,
        contract_type: contractType,
        principal_amount: principal.trim(),
        interest_rate: activeRate,
        interest_period_type: monthly ? "monthly" : "yearly",
        start_date: startDate,
        end_date: targetDate,
        status: "active",
      })
      .select("id")
      .single();
    if (contractError || !contract?.id) {
      setSaving(false);
      setSaveNote(publicSaveError(contractError?.message ?? "", "บันทึกสัญญาไม่สำเร็จ"));
      return;
    }
    const rows = splits.flatMap((row, index) => {
      if (!row.personName.trim() && !row.percentage.trim()) return [];
      const amount = commission.lines[index]?.amount;
      return [{
        contract_id: contract.id,
        person_name: row.personName.trim(),
        role_label: row.roleLabel.trim() || null,
        percentage: row.percentage.trim() || null,
        calculated_amount: amount == null ? null : amount.toFixed(2),
      }];
    });
    if (rows.length) {
      const { error: splitError } = await supabase.from("commission_splits").insert(rows);
      if (splitError) {
        setSaving(false);
        setSaveNote(publicSaveError(splitError.message, "บันทึกส่วนแบ่งไม่สำเร็จ"));
        return;
      }
    }
    setSaving(false);
    setSaveNote("บันทึกสัญญาแล้ว");
  }

  return (
    <LandNav preview={preview}>
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <header>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">สัญญาที่ดิน</p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">ประเมินโฉนดและวงเงิน</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">คำนวณบนหน้านี้ได้ทันที การบันทึกสัญญาเป็นทางเลือก</p>
          </header>
          {preview ? (
            <p data-testid="preview-banner" className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              โหมดตัวอย่าง คำนวณได้โดยไม่เข้าสู่ระบบ และยังไม่เขียนลงฐานข้อมูล
            </p>
          ) : null}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="text-lg font-semibold text-white">ลูกค้าและโฉนด</h2>
              <label className="flex flex-col gap-1 text-sm">
                ค้นหาลูกค้าเดิม
                <input data-testid="customer-search" className={control} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหรือเบอร์โทร" />
              </label>
              <ul data-testid="customer-results" className="max-h-48 space-y-2 overflow-auto">
                {matches.map((customer) => (
                  <li key={customer.id}>
                    <button type="button" onClick={() => chooseCustomer(customer)} className={`min-h-11 w-full rounded-xl px-3 text-left text-sm ${selectedId === customer.id ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-slate-100"}`}>
                      {customer.full_name || "ไม่ระบุชื่อ"} · {customer.phone || "ไม่มีเบอร์"}
                    </button>
                  </li>
                ))}
                {!matches.length ? <li className="text-sm text-slate-400">ไม่พบลูกค้าที่ตรงกับคำค้น</li> : null}
              </ul>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  ชื่อ
                  <input data-testid="customer-name" className={control} value={name} onChange={(event) => { setName(event.target.value); setSelectedId(""); }} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  เบอร์โทร
                  <input data-testid="customer-phone" className={control} value={phone} inputMode="tel" onChange={(event) => { setPhone(event.target.value); setSelectedId(""); }} />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  เลขโฉนด
                  <input data-testid="deed-number" className={control} value={deedNumber} onChange={(event) => setDeedNumber(event.target.value)} />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="text-lg font-semibold text-white">ตำแหน่งที่ดิน</h2>
              <label className="flex flex-col gap-1 text-sm">
                ลิงก์ Google Maps
                <input data-testid="map-url" className={control} value={mapUrl} onChange={(event) => applyMapUrl(event.target.value)} placeholder="https://www.google.com/maps/..." />
              </label>
              {mapNote ? <p className="text-sm text-amber-200">{mapNote}</p> : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  ละติจูด
                  <input data-testid="latitude" className={control} value={latitude} inputMode="decimal" onChange={(event) => setLatitude(event.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  ลองจิจูด
                  <input data-testid="longitude" className={control} value={longitude} inputMode="decimal" onChange={(event) => setLongitude(event.target.value)} />
                </label>
              </div>
              <MapPicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="text-lg font-semibold text-white">ราคาประเมินและวงเงิน</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  ราคาประเมินแปลงนี้
                  <input data-testid="appraised-value" className={control} value={plotValue} inputMode="decimal" onChange={(event) => setPlotValue(event.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  ราคาประเมินที่ดินข้างเคียง
                  <input data-testid="nearby-value" className={control} value={nearbyValue} inputMode="decimal" onChange={(event) => setNearbyValue(event.target.value)} />
                </label>
              </div>
              <div data-testid="valuation-compare" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm">
                {comparison ? (
                  <>
                    <p data-testid="compare-difference">ส่วนต่าง {formatThb(comparison.difference)}</p>
                    <p data-testid="compare-higher" className="mt-1 text-amber-200">{comparison.label}</p>
                  </>
                ) : <p className="text-slate-400">กรอกราคาทั้งสองเพื่อเทียบส่วนต่าง</p>}
              </div>
              <fieldset className="flex flex-col gap-2 text-sm">
                <legend className="font-medium">ฐานที่ใช้คิดวงเงิน</legend>
                <label className="flex min-h-11 items-center gap-2">
                  <input data-testid="valuation-basis-plot" type="radio" name="valuation-basis" checked={basis === "plot"} onChange={() => setBasis("plot")} />
                  ใช้ราคาประเมินแปลงนี้
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input data-testid="valuation-basis-nearby" type="radio" name="valuation-basis" checked={basis === "nearby"} onChange={() => setBasis("nearby")} />
                  ใช้ราคาประเมินที่ดินข้างเคียง
                </label>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <button key={type.id} type="button" data-testid={`contract-type-${type.id}`} onClick={() => setContractType(type.id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${contractType === type.id ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-slate-100"}`}>
                    {type.label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1 text-sm">
                เงินต้น
                <input data-testid="principal" className={control} value={principal} inputMode="decimal" onChange={(event) => setPrincipal(event.target.value)} />
              </label>
            </div>
            <aside data-testid="ltv-panel" className="rounded-3xl border border-emerald-300/30 bg-slate-900 p-4 text-sm">
              <p className="text-lg font-semibold text-white">{ltv.label}</p>
              <p data-testid="ltv-percent" className="mt-3 text-emerald-300">สัดส่วน {ltv.ltvPercentage.toFixed(2)}%</p>
              <p data-testid="ltv-min" className="mt-2">ต่ำสุดที่แนะนำ {formatThb(ltv.minAllowed)}</p>
              <p data-testid="ltv-max">สูงสุดที่แนะนำ {formatThb(ltv.maxAllowed)}</p>
              {ltv.warning ? <p data-testid="ltv-warning" className="mt-3 text-amber-200">{ltv.warning}</p> : <p className="mt-3 text-emerald-200">อยู่ในช่วงที่แนะนำ</p>}
            </aside>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="text-lg font-semibold text-white">ดอกเบี้ย</h2>
              <div className="flex flex-wrap gap-2">
                {RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    data-testid={`rate-${rate}`}
                    onClick={() => { setPresetRate(rate); setCustomRate(""); setHighIntent(false); }}
                    className={`min-h-11 rounded-full px-4 text-sm ${!customRate && !highIntent && presetRate === rate ? "bg-emerald-400 text-slate-950" : "bg-slate-950 text-slate-100"}`}
                  >
                    {rate}%
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="rate-high"
                  onClick={() => { setHighIntent(true); customRateRef.current?.focus(); }}
                  className={`min-h-11 rounded-full px-4 text-sm ${highIntent ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-slate-100"}`}
                >
                  &gt;50%
                </button>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                อัตรากำหนดเอง
                <input ref={customRateRef} data-testid="rate-custom" className={control} value={customRate} inputMode="decimal" placeholder="เช่น 0.5 หรือ 60" onChange={(event) => { setCustomRate(event.target.value); setHighIntent(false); }} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" data-testid="rate-monthly" onClick={() => setMonthly(true)} className={`min-h-11 rounded-full px-4 text-sm ${monthly ? "bg-amber-400 text-slate-950" : "bg-slate-950"}`}>
                  อัตรารายเดือน
                </button>
                <button type="button" data-testid="rate-yearly" onClick={() => setMonthly(false)} className={`min-h-11 rounded-full px-4 text-sm ${monthly ? "bg-slate-950" : "bg-amber-400 text-slate-950"}`}>
                  อัตรารายปี
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  วันเริ่ม
                  <input data-testid="start-date" className={control} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  วันสิ้นสุด
                  <input data-testid="target-date" className={control} type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                </label>
              </div>
            </div>
            <aside data-testid="interest-panel" className="rounded-3xl border border-emerald-300/30 bg-slate-900 p-4 text-sm">
              {interest ? (
                <dl className="space-y-2">
                  <div className="flex justify-between gap-3"><dt>จำนวนวัน</dt><dd data-testid="interest-days">{interest.totalDays}</dd></div>
                  <div className="flex justify-between gap-3"><dt>ดอกเบี้ยรายวัน</dt><dd data-testid="interest-daily">{formatThb(interest.dailyInterest)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>ดอกเบี้ยรายเดือน</dt><dd data-testid="interest-monthly">{formatThb(interest.monthlyInterest)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>ดอกเบี้ยรายปี</dt><dd data-testid="interest-yearly">{formatThb(interest.yearlyInterest)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>ดอกเบี้ยค้าง</dt><dd data-testid="interest-accrued">{formatThb(interest.accruedInterest)}</dd></div>
                  <div className="flex justify-between gap-3 text-base font-semibold text-emerald-300"><dt>ยอดปิด</dt><dd data-testid="interest-payoff">{formatThb(interest.totalPayoffAmount)}</dd></div>
                </dl>
              ) : <p className="text-slate-400">กรอกเงินต้น อัตรา และวันที่เพื่อดูยอด</p>}
            </aside>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">ส่วนแบ่งค่าตอบแทน</h2>
              <button
                type="button"
                data-testid="commission-add"
                onClick={() => setSplits((current) => [...current, { id: crypto.randomUUID(), personName: "", roleLabel: "", percentage: "" }])}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-400 px-4 text-sm font-semibold text-slate-950"
              >
                <Plus className="h-4 w-4" />
                เพิ่มผู้รับ
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {splits.map((row, index) => (
                <div key={row.id} data-testid="commission-row" className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-950 p-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
                  <label className="text-sm">ชื่อ
                    <input data-testid="commission-name" className={control} value={row.personName} onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, personName: event.target.value } : item))} />
                  </label>
                  <label className="text-sm">บทบาท
                    <input data-testid="commission-role" className={control} value={row.roleLabel} onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, roleLabel: event.target.value } : item))} />
                  </label>
                  <label className="text-sm">ร้อยละ
                    <input data-testid="commission-percent" className={control} value={row.percentage} inputMode="decimal" onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, percentage: event.target.value } : item))} />
                  </label>
                  <div className="flex items-center justify-between gap-2 pb-2">
                    <p data-testid="commission-amount" className="text-sm text-emerald-300">{commission.lines[index]?.amount == null ? "-" : formatThb(commission.lines[index].amount)}</p>
                    <button type="button" aria-label="ลบผู้รับ" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-300" onClick={() => setSplits((current) => current.filter((item) => item.id !== row.id))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {commission.warning ? <p data-testid="commission-warning" className="mt-3 text-sm text-amber-200">{commission.warning}</p> : null}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" data-testid="save-contract" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {saving ? "กำลังบันทึก" : "บันทึกสัญญา (ไม่บังคับ)"}
            </button>
            {saveNote ? <p data-testid="save-note" className="text-sm text-amber-200">{saveNote}</p> : null}
          </div>
        </div>
      </main>
    </LandNav>
  );
}
