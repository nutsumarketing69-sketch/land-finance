"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calculateContractPayoff, validateLTV } from "@/lib/financeEngine";
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPES, PRESET_INTEREST_RATES, formatBaht, type ContractType } from "@/lib/financeCalculator";
import { createClient } from "@/lib/supabase/client";

type Split = { id?: string; personName: string; roleLabel: string; percentage: string };

type Photo = { path: string; url: string };

const field = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base";

function text(value: unknown) {
  return value == null ? "" : String(value);
}

export default function ContractEditor({ contractId }: { contractId: string }) {
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [landId, setLandId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idCard, setIdCard] = useState("");
  const [address, setAddress] = useState("");
  const [deedNumber, setDeedNumber] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [appraised, setAppraised] = useState("");
  const [nearby, setNearby] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [zoom, setZoom] = useState("");
  const [contractType, setContractType] = useState<ContractType>("sale_redemption");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("1.50");
  const [customRate, setCustomRate] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payoffDate, setPayoffDate] = useState("");
  const [alertDays, setAlertDays] = useState("");
  const [notes, setNotes] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [splits, setSplits] = useState<Split[]>([]);
  const [uplineId, setUplineId] = useState("");
  const [referredBy, setReferredBy] = useState("");

  async function signedPhotos(paths: string[]) {
    const supabase = createClient();
    const next: Photo[] = [];
    for (const path of paths) {
      const signed = await supabase.storage.from("deed-images").createSignedUrl(path, 3600);
      next.push({ path, url: signed.data?.signedUrl || "" });
    }
    return next;
  }

  async function load() {
    const supabase = createClient();
    const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).maybeSingle();
    if (!contract) {
      setMissing(true);
      setReady(true);
      return;
    }
    const row = contract as Record<string, unknown>;
    const [customerRes, landRes, splitRes, userRes] = await Promise.all([
      row.customer_id ? supabase.from("customers").select("*").eq("id", text(row.customer_id)).maybeSingle() : Promise.resolve({ data: null }),
      row.land_id ? supabase.from("land_assets").select("*").eq("id", text(row.land_id)).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("commission_splits").select("*").eq("contract_id", contractId),
      supabase.auth.getUser(),
    ]);
    const customer = (customerRes.data || {}) as Record<string, unknown>;
    const land = (landRes.data || {}) as Record<string, unknown>;
    const userId = userRes.data.user?.id;
    if (userId) {
      const profile = await supabase.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
      setReferredBy(text(profile.data?.referred_by));
    }
    setCustomerId(text(row.customer_id));
    setLandId(text(row.land_id));
    setName(text(customer.full_name));
    setPhone(text(customer.phone));
    setIdCard(text(customer.id_card));
    setAddress(text(customer.address));
    setDeedNumber(text(land.deed_number));
    setProvince(text(land.province));
    setDistrict(text(land.district));
    setArea(text(land.area_size));
    setLatitude(text(land.latitude));
    setLongitude(text(land.longitude));
    setMapUrl(text(land.map_url));
    setAppraised(text(land.appraised_value));
    setNearby(text(land.nearby_appraised_value));
    const paths = Array.isArray(land.deed_images) ? land.deed_images.map((item) => text(item)).filter(Boolean) : [];
    setPhotos(await signedPhotos(paths));
    const type = text(row.contract_type);
    setContractType(CONTRACT_TYPES.includes(type as ContractType) ? (type as ContractType) : "sale_redemption");
    setPrincipal(text(row.principal_amount));
    const storedRate = text(row.interest_rate);
    setRate(PRESET_INTEREST_RATES.includes(storedRate as (typeof PRESET_INTEREST_RATES)[number]) ? storedRate : "1.50");
    setCustomRate(PRESET_INTEREST_RATES.includes(storedRate as (typeof PRESET_INTEREST_RATES)[number]) ? "" : storedRate);
    setPeriod(text(row.interest_period_type) || "monthly");
    setStartDate(text(row.start_date).slice(0, 10));
    setEndDate(text(row.end_date).slice(0, 10));
    setAlertDays(text(row.alert_before_days));
    setNotes(text(row.notes));
    setContractNumber(text(row.contract_number));
    setUplineId(text(row.shared_with_upline_id));
    setSplits(
      ((splitRes.data || []) as Record<string, unknown>[]).map((split) => ({
        id: text(split.id),
        personName: text(split.person_name),
        roleLabel: text(split.role_label),
        percentage: text(split.percentage),
      })),
    );
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setPayoffDate((current) => current || today);
    setMissing(false);
    setReady(true);
  }

  useEffect(() => {
    void load();
  }, [contractId]);

  const activeRate = customRate.trim() || rate;
  let payoffDays = "";
  let payoffInterest = "";
  let payoffTotal = "";
  if (startDate && payoffDate && principal) {
    const quote = calculateContractPayoff(principal || "0", activeRate || "0", period, startDate, payoffDate);
    payoffDays = String(quote.totalDays);
    payoffInterest = formatBaht(String(quote.accruedInterest));
    payoffTotal = formatBaht(String(quote.totalPayoffAmount));
  }

  async function addPhoto(file: File) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const safe = file.name.replace(/[^\w.-]+/g, "-").slice(0, 40);
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const uploaded = await supabase.storage.from("deed-images").upload(path, file);
    if (uploaded.error) {
      setMessage("อัปโหลดรูปไม่สำเร็จ");
      return;
    }
    setPhotos((current) => [...current, { path, url: URL.createObjectURL(file) }]);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const photoPaths = photos.map((photo) => photo.path);
    if (customerId) {
      const customer = await supabase.from("customers").update({
        full_name: name.trim(),
        phone: phone.trim(),
        id_card: idCard.trim() || null,
        address: address.trim() || null,
      }).eq("id", customerId);
      if (customer.error) {
        setSaving(false);
        setMessage("บันทึกลูกค้าไม่สำเร็จ");
        return;
      }
    }
    if (landId) {
      const land = await supabase.from("land_assets").update({
        deed_number: deedNumber.trim(),
        province: province.trim(),
        district: district.trim(),
        area_size: area.trim(),
        latitude: latitude.trim() || null,
        longitude: longitude.trim() || null,
        map_url: mapUrl.trim() || null,
        appraised_value: appraised.trim() || null,
        nearby_appraised_value: nearby.trim() || null,
        deed_images: photoPaths,
      }).eq("id", landId);
      if (land.error) {
        setSaving(false);
        setMessage("บันทึกโฉนดไม่สำเร็จ");
        return;
      }
    }
    const contract = await supabase.from("contracts").update({
      contract_type: contractType,
      principal_amount: principal.trim() || null,
      interest_rate: activeRate.trim() || null,
      interest_period_type: period,
      start_date: startDate || null,
      end_date: endDate || null,
      alert_before_days: alertDays.trim() ? Number(alertDays) : null,
      notes: notes.trim() || null,
    }).eq("id", contractId);
    if (contract.error) {
      setSaving(false);
      setMessage("บันทึกสัญญาไม่สำเร็จ");
      return;
    }
    await supabase.from("commission_splits").delete().eq("contract_id", contractId);
    const rows = splits.filter((split) => split.personName.trim() || split.percentage.trim());
    if (rows.length) {
      const inserted = await supabase.from("commission_splits").insert(rows.map((split) => ({
        contract_id: contractId,
        person_name: split.personName.trim(),
        role_label: split.roleLabel.trim() || null,
        percentage: split.percentage.trim() || null,
        calculated_amount: null,
      })));
      if (inserted.error) {
        setSaving(false);
        setMessage("บันทึกส่วนแบ่งไม่สำเร็จ");
        return;
      }
    }
    await load();
    setSaving(false);
    setMessage("บันทึกแล้ว");
  }

  async function shareUpline() {
    if (!referredBy) {
      setMessage("บัญชีนี้ไม่มีต้นทาง");
      return;
    }
    const { error } = await createClient().from("contracts").update({ shared_with_upline_id: referredBy }).eq("id", contractId);
    if (error) {
      setMessage("ส่งขึ้นต้นทางไม่สำเร็จ");
      return;
    }
    setUplineId(referredBy);
    setMessage("ส่งขึ้นต้นทางแล้ว");
  }

  if (!ready) return <p className="text-sm text-slate-300">กำลังเปิดสัญญา</p>;
  if (missing) return <p className="rounded-2xl bg-amber-300/10 px-4 py-3 text-sm text-amber-100">เปิดรายละเอียดสัญญาไม่สำเร็จ</p>;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-xs font-semibold tracking-[0.14em] text-amber-200">สัญญา</p>
        <h1 className="text-2xl font-semibold" data-testid="saved-contract-number">{contractNumber || "ไม่มีเลขสัญญา"}</h1>
        <p className="mt-1 text-sm text-slate-400">{uplineId ? "ส่งขึ้นต้นทางแล้ว" : "ยังไม่ส่งขึ้นต้นทาง"}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">ชื่อลูกค้า<input className={field} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="text-sm">เบอร์โทร<input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="text-sm">เลขบัตร<input className={field} value={idCard} onChange={(event) => setIdCard(event.target.value)} /></label>
        <label className="text-sm">ที่อยู่<input className={field} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        <label className="text-sm">เลขโฉนด<input data-testid="deed-number" className={field} value={deedNumber} onChange={(event) => setDeedNumber(event.target.value)} /></label>
        <label className="text-sm">จังหวัด<input className={field} value={province} onChange={(event) => setProvince(event.target.value)} /></label>
        <label className="text-sm">อำเภอ<input className={field} value={district} onChange={(event) => setDistrict(event.target.value)} /></label>
        <label className="text-sm">เนื้อที่<input className={field} value={area} onChange={(event) => setArea(event.target.value)} /></label>
        <label className="text-sm">ราคาประเมิน<input className={field} value={appraised} onChange={(event) => setAppraised(event.target.value)} /></label>
        <label className="text-sm">ราคาประเมินข้างเคียง<input className={field} value={nearby} onChange={(event) => setNearby(event.target.value)} /></label>
        <label className="text-sm sm:col-span-2">ลิงก์แผนที่
          <input className={field} value={mapUrl} onChange={(event) => setMapUrl(event.target.value)} />
        </label>
        {mapUrl ? <a className="text-sm text-emerald-200 underline" href={mapUrl} target="_blank" rel="noreferrer">เปิดแผนที่</a> : null}
      </div>
      <div>
        <p className="text-sm">รูปโฉนด</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <button key={photo.path} type="button" onClick={() => photo.url && setZoom(photo.url)} className="h-24 w-24 overflow-hidden rounded-xl border border-slate-700">
              {photo.url ? <img src={photo.url} alt="รูปโฉนด" className="h-full w-full object-cover" /> : <span className="text-xs">ไม่มีตัวอย่าง</span>}
            </button>
          ))}
        </div>
        <input className="mt-2 text-sm" type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void addPhoto(file);
        }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {CONTRACT_TYPES.map((type) => (
          <button key={type} type="button" onClick={() => setContractType(type)} className={`rounded-full px-3 py-2 text-sm ${contractType === type ? "bg-amber-300 text-slate-950" : "bg-slate-800"}`}>
            {CONTRACT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <p data-testid="detail-ltv" className="text-sm text-emerald-100">
        {(() => {
          const check = validateLTV(contractType, Number(principal) || 0, Number(appraised) || 0);
          return `LTV ${check.ltvPercentage.toFixed(2)}% · ช่วงแนะนำ ${check.minAllowed.toLocaleString("th-TH")}–${check.maxAllowed.toLocaleString("th-TH")} บาท${check.warning ? ` · ${check.warning}` : ""}`;
        })()}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">เงินต้น<input data-testid="principal" className={field} value={principal} onChange={(event) => setPrincipal(event.target.value)} /></label>
        <label className="text-sm">งวดดอกเบี้ย
          <select className={field} value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="daily">รายวัน</option>
            <option value="monthly">รายเดือน</option>
            <option value="yearly">รายปี</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <p className="text-sm">อัตราสำเร็จรูป</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_INTEREST_RATES.map((preset) => (
              <button key={preset} type="button" onClick={() => { setRate(preset); setCustomRate(""); }} className={`rounded-full px-3 py-2 text-sm ${!customRate && rate === preset ? "bg-emerald-300 text-slate-950" : "bg-slate-800"}`}>
                {preset}%
              </button>
            ))}
          </div>
          <label className="mt-2 block text-sm">อัตรากำหนดเอง<input className={field} value={customRate} onChange={(event) => setCustomRate(event.target.value)} /></label>
        </div>
        <label className="text-sm">วันเริ่ม<input className={field} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label className="text-sm">วันสิ้นสุด<input className={field} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label className="text-sm">แจ้งเตือนก่อนกี่วัน<input className={field} value={alertDays} onChange={(event) => setAlertDays(event.target.value)} /></label>
        <label className="text-sm sm:col-span-2">บันทึก<textarea className={field} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </div>
      <section className="rounded-2xl border border-emerald-300/30 p-4">
        <h2 className="font-semibold">คำนวณยอดปิด</h2>
        <label className="mt-2 block text-sm">วันที่ปิด
          <input data-testid="detail-payoff-date" className={field} type="date" value={payoffDate} onChange={(event) => setPayoffDate(event.target.value)} />
        </label>
        <p className="mt-3 text-sm" data-testid="detail-payoff-days">จำนวนวัน {payoffDays || "-"}</p>
        <p className="text-sm">ดอกเบี้ยค้าง {payoffInterest || "-"}</p>
        <p className="text-sm">เงินต้นรวมดอกเบี้ย {payoffTotal || "-"}</p>
      </section>
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">ส่วนแบ่ง</h2>
          <button type="button" className="text-sm text-amber-200" onClick={() => setSplits((current) => [...current, { personName: "", roleLabel: "", percentage: "" }])}>เพิ่มแถว</button>
        </div>
        {splits.map((split, index) => (
          <div key={split.id || index} className="mt-2 grid gap-2 sm:grid-cols-3">
            <input className={field} placeholder="ชื่อ" value={split.personName} onChange={(event) => setSplits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, personName: event.target.value } : item))} />
            <input className={field} placeholder="บทบาท" value={split.roleLabel} onChange={(event) => setSplits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, roleLabel: event.target.value } : item))} />
            <input className={field} placeholder="ร้อยละ" value={split.percentage} onChange={(event) => setSplits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, percentage: event.target.value } : item))} />
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="save-contract" disabled={saving} onClick={() => void save()} className="rounded-full bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">
          {saving ? "กำลังบันทึก" : "บันทึก"}
        </button>
        {!uplineId ? <button type="button" onClick={() => void shareUpline()} className="rounded-full border border-amber-200 px-4 py-3 text-sm">ส่งขึ้นต้นทาง</button> : null}
        <Link href="/dashboard" className="rounded-full border border-slate-600 px-4 py-3 text-sm">กลับแดชบอร์ด</Link>
      </div>
      {message ? <p className="text-sm text-amber-100">{message}</p> : null}
      {zoom ? (
        <button type="button" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom("")}>
          <img src={zoom} alt="ขยายรูปโฉนด" className="max-h-[90vh] max-w-full rounded-2xl" />
        </button>
      ) : null}
    </div>
  );
}
