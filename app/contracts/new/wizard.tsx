"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { alertBeforeDays, ALERT_DAYS_PER_MONTH, type AlertUnit } from "@/lib/contractAlert";
import { parseGoogleMapsUrl } from "@/lib/mapLink";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPES,
  INTEREST_PERIOD_LABELS,
  INTEREST_PERIOD_TYPES,
  PRESET_INTEREST_RATES,
  calculateInterest,
  evaluateLoanToValue,
  formatBaht,
  splitCommission,
  toDecimal,
  type ContractType,
  type InterestPeriodType,
} from "@/lib/financeCalculator";
import MapPicker from "./map-picker";

const STEPS = [
  { id: "customer", label: "ลูกค้าและโฉนด" },
  { id: "location", label: "ที่ตั้งและราคา" },
  { id: "ltv", label: "ประเภทและวงเงิน" },
  { id: "interest", label: "ดอกเบี้ย" },
  { id: "commission", label: "ส่วนแบ่งและบันทึก" },
] as const;

const control =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-emerald-300";

type CustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  id_card: string | null;
  address: string | null;
};

type DeedPhoto = {
  localId: string;
  name: string;
  previewUrl: string;
  storagePath: string | null;
  error: string;
};

type CommissionRow = {
  id: string;
  personName: string;
  roleLabel: string;
  percentage: string;
};

type ValuationBasis = "plot" | "nearby";

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

function publicSaveError(message: string, fallback: string) {
  if (/row-level security|permission denied|JWT/i.test(message)) return "ไม่มีสิทธิ์บันทึก ต้องเป็นสมาชิกที่เข้าสู่ระบบ";
  if (/duplicate key|unique constraint/i.test(message)) return "ข้อมูลซ้ำกับรายการที่มีอยู่";
  if (/check constraint/i.test(message)) return "ข้อมูลไม่ตรงเงื่อนไขของสัญญา";
  if (/does not exist|schema cache/i.test(message)) return "ยังไม่มีตารางสัญญาในฐานข้อมูล";
  if (/bucket|storage/i.test(message)) return "ยังอัปโหลดรูปโฉนดไม่ได้";
  return fallback;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-emerald-50">{label}</span>
      {children}
      {hint ? <span className="text-xs text-emerald-100/60">{hint}</span> : null}
    </label>
  );
}

export default function ContractWizard() {
  const router = useRouter();
  const customRateRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customerNote, setCustomerNote] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdCard, setNewIdCard] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [deedNumber, setDeedNumber] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [photos, setPhotos] = useState<DeedPhoto[]>([]);
  const [mapUrl, setMapUrl] = useState("");
  const [mapNote, setMapNote] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [appraisedValue, setAppraisedValue] = useState("");
  const [nearbyValue, setNearbyValue] = useState("");
  const [basis, setBasis] = useState<ValuationBasis>("plot");
  const [contractType, setContractType] = useState<ContractType>("sale_redemption");
  const [principal, setPrincipal] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [presetRate, setPresetRate] = useState("1.50");
  const [customRate, setCustomRate] = useState("");
  const [highIntent, setHighIntent] = useState(false);
  const [period, setPeriod] = useState<InterestPeriodType>("monthly");
  const [splits, setSplits] = useState<CommissionRow[]>([]);
  const [notes, setNotes] = useState("");
  const [alertAmount, setAlertAmount] = useState("7");
  const [alertUnit, setAlertUnit] = useState<AlertUnit>("days");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCustomerId, setSavedCustomerId] = useState("");

  useEffect(() => {
    const start = todayIso();
    setStartDate((current) => current || start);
    setEndDate((current) => current || plusOneYear(start));
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (!cancel) setCustomerNote("เข้าสู่ระบบเพื่อค้นหาลูกค้าเดิม หรือสร้างลูกค้าใหม่ในหน้านี้");
        return;
      }
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, id_card, address")
        .eq("owner_id", userId)
        .order("full_name");
      if (cancel) return;
      if (error) {
        setCustomerNote("โหลดรายชื่อลูกค้าไม่สำเร็จ ยังสร้างลูกค้าใหม่ในหน้านี้ได้");
        return;
      }
      setCustomers((data ?? []) as CustomerRow[]);
      setCustomerNote("");
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    return customers.filter((customer) => {
      if (!query) return true;
      const name = (customer.full_name ?? "").toLowerCase();
      const phone = customer.phone ?? "";
      return name.includes(query) || phone.toLowerCase().includes(query) || (digits && phone.replace(/\D/g, "").includes(digits));
    });
  }, [customers, customerQuery]);

  const activeRate = customRate.trim() ? customRate.trim() : presetRate;
  const ltvBase = basis === "nearby" ? nearbyValue : appraisedValue;

  const comparison = useMemo(() => {
    try {
      const plot = toDecimal(appraisedValue, "ราคาประเมินแปลงนี้");
      const nearby = toDecimal(nearbyValue, "ราคาประเมินข้างเคียง");
      const difference = plot.minus(nearby).abs();
      const higher = plot.eq(nearby) ? "เท่ากัน" : plot.gt(nearby) ? "แปลงนี้สูงกว่า" : "ที่ดินข้างเคียงสูงกว่า";
      return { difference: formatBaht(difference), higher };
    } catch {
      return null;
    }
  }, [appraisedValue, nearbyValue]);

  const ltv = useMemo(() => {
    try {
      return evaluateLoanToValue({ contractType, appraisedValue: ltvBase, principal });
    } catch {
      return null;
    }
  }, [contractType, ltvBase, principal]);

  const interest = useMemo(() => {
    try {
      return calculateInterest({
        principal,
        interestRate: activeRate,
        interestPeriodType: period,
        startDate,
        payoffDate: endDate,
      });
    } catch {
      return null;
    }
  }, [principal, activeRate, period, startDate, endDate]);

  const commission = useMemo(() => {
    const recipients = splits.filter((row) => row.percentage.trim());
    if (!recipients.length) return null;
    try {
      return splitCommission({
        baseAmount: principal,
        recipients: recipients.map((row) => ({
          personName: row.personName,
          roleLabel: row.roleLabel,
          percentage: row.percentage,
        })),
      });
    } catch {
      return null;
    }
  }, [splits, principal]);

  const alert = alertBeforeDays(alertAmount, alertUnit);

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
    if (parsed.status === "unparsed") setMapNote("ยังอ่านพิกัดจากลิงก์นี้ไม่ได้");
    else setMapNote("");
  }

  async function onPhotos(list: FileList | null) {
    if (!list?.length) return;
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? "";
    for (const file of Array.from(list)) {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((current) => [...current, { localId, name: file.name, previewUrl, storagePath: null, error: "" }]);
      if (!userId) {
        setPhotos((current) =>
          current.map((photo) =>
            photo.localId === localId ? { ...photo, error: "เข้าสู่ระบบก่อนอัปโหลดรูป รูปนี้ยังอยู่บนหน้าจอ" } : photo,
          ),
        );
        continue;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "deed.jpg";
      const storagePath = `${userId}/${localId}-${safe}`;
      const { error } = await supabase.storage.from("deed-images").upload(storagePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      setPhotos((current) =>
        current.map((photo) =>
          photo.localId === localId
            ? {
                ...photo,
                storagePath: error ? null : storagePath,
                error: error ? "อัปโหลดรูปไม่สำเร็จ รูปนี้ยังแสดงอยู่ แต่จะไม่ถูกบันทึกในสัญญา" : "",
              }
            : photo,
        ),
      );
    }
  }

  async function removePhoto(photo: DeedPhoto) {
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((item) => item.localId !== photo.localId));
    if (!photo.storagePath) return;
    await createClient().storage.from("deed-images").remove([photo.storagePath]);
  }

  function addSplit() {
    setSplits((current) => [...current, { id: crypto.randomUUID(), personName: "", roleLabel: "", percentage: "" }]);
  }

  async function save() {
    setFormError("");
    if (customerMode === "existing" && !selectedCustomerId) {
      setFormError("เลือกลูกค้า หรือสร้างลูกค้าใหม่");
      setStep(0);
      return;
    }
    if (customerMode === "new" && (!newName.trim() || !newPhone.trim())) {
      setFormError("กรอกชื่อและเบอร์โทรของลูกค้าใหม่");
      setStep(0);
      return;
    }
    if (!deedNumber.trim() || !areaSize.trim() || !province.trim() || !district.trim()) {
      setFormError("กรอกเลขโฉนด ขนาดที่ดิน จังหวัด และอำเภอ");
      setStep(0);
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      setFormError("ระบุตำแหน่งที่ดินจากลิงก์ พิกัด หรือหมุดบนแผนที่");
      setStep(1);
      return;
    }
    if (!ltv) {
      setFormError("กรอกราคาประเมินที่ใช้เป็นฐาน และเงินต้นให้เป็นจำนวนเงิน");
      setStep(basis === "nearby" && !nearbyValue.trim() ? 1 : 2);
      return;
    }
    if (!interest || "error" in alert) {
      setFormError("error" in alert ? alert.error : "ตรวจอัตราดอกเบี้ยและวันเริ่มกับวันสิ้นสุด");
      setStep("error" in alert ? 4 : 3);
      return;
    }
    const namedSplits = splits.filter((row) => row.personName.trim() || row.roleLabel.trim() || row.percentage.trim());
    if (namedSplits.some((row) => !row.personName.trim() || !row.percentage.trim())) {
      setFormError("ผู้รับส่วนแบ่งต้องมีชื่อและร้อยละ");
      setStep(4);
      return;
    }
    if (namedSplits.length && !commission) {
      setFormError("ตรวจร้อยละของส่วนแบ่งและเงินต้น");
      setStep(4);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      setFormError("เข้าสู่ระบบสมาชิกก่อนบันทึกสัญญา");
      return;
    }

    let customerId = customerMode === "existing" ? selectedCustomerId : savedCustomerId;
    if (customerMode === "new" && !customerId) {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          owner_id: userId,
          full_name: newName.trim(),
          phone: newPhone.trim(),
          id_card: newIdCard.trim() || null,
          address: newAddress.trim() || null,
        })
        .select("id")
        .single();
      if (error || !data?.id) {
        setSaving(false);
        setFormError(publicSaveError(error?.message ?? "", "สร้างลูกค้าไม่สำเร็จ"));
        return;
      }
      customerId = String(data.id);
      setSavedCustomerId(customerId);
    }

    const storedMap = mapUrl.trim() || `https://www.google.com/maps?q=${latitude.trim()},${longitude.trim()}`;
    const { data: land, error: landError } = await supabase
      .from("land_assets")
      .insert({
        owner_id: userId,
        customer_id: customerId,
        deed_number: deedNumber.trim(),
        area_size: areaSize.trim(),
        province: province.trim(),
        district: district.trim(),
        latitude: latitude.trim(),
        longitude: longitude.trim(),
        map_url: storedMap,
        appraised_value: appraisedValue.trim(),
        nearby_appraised_value: nearbyValue.trim(),
        deed_images: photos.flatMap((photo) => (photo.storagePath ? [photo.storagePath] : [])),
      })
      .select("id")
      .single();
    if (landError || !land?.id) {
      setSaving(false);
      setFormError(publicSaveError(landError?.message ?? "", "บันทึกที่ดินไม่สำเร็จ"));
      return;
    }

    const number = contractNumber.trim() || `LF-${startDate.replaceAll("-", "")}-${customerId.slice(0, 4).toUpperCase()}`;
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        contract_number: number,
        owner_id: userId,
        customer_id: customerId,
        land_id: land.id,
        contract_type: contractType,
        principal_amount: interest.principal.exact,
        interest_rate: interest.interestRate.exact,
        interest_period_type: period,
        start_date: startDate,
        end_date: endDate,
        alert_before_days: alert.days,
        notes: notes.trim() || null,
        status: "active",
      })
      .select("id, contract_number")
      .single();
    if (contractError || !contract?.id) {
      setSaving(false);
      setFormError(publicSaveError(contractError?.message ?? "", "บันทึกสัญญาไม่สำเร็จ"));
      return;
    }

    if (commission?.lines.length) {
      const { error: splitError } = await supabase.from("commission_splits").insert(
        commission.lines.map((line) => ({
          contract_id: contract.id,
          person_name: line.personName.trim(),
          role_label: line.roleLabel.trim() || null,
          percentage: line.percentage.exact,
          calculated_amount: line.calculatedAmount.exact,
        })),
      );
      if (splitError) {
        setSaving(false);
        setFormError(`${publicSaveError(splitError.message, "บันทึกส่วนแบ่งไม่สำเร็จ")} สัญญา ${contract.contract_number ?? number} ถูกสร้างแล้ว`);
        router.push(`/contracts/${contract.id}`);
        return;
      }
    }

    router.push(`/contracts/${contract.id}`);
  }

  return (
    <main className="min-h-screen bg-[#0c1210] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200/80">สัญญาที่ดิน</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">สร้างสัญญาและประเมินที่ดิน</h1>
        </header>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="ขั้นตอน">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              data-testid={`step-${item.id}`}
              onClick={() => setStep(index)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm ${
                step === index ? "bg-emerald-400 text-emerald-950" : "bg-white/5 text-emerald-50"
              }`}
            >
              {index + 1}. {item.label}
            </button>
          ))}
        </nav>

        {step === 0 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`rounded-full px-3 py-2 text-sm ${customerMode === "existing" ? "bg-emerald-400 text-emerald-950" : "bg-black/30"}`} onClick={() => setCustomerMode("existing")}>
                  ลูกค้าเดิม
                </button>
                <button type="button" data-testid="customer-create" className={`rounded-full px-3 py-2 text-sm ${customerMode === "new" ? "bg-emerald-400 text-emerald-950" : "bg-black/30"}`} onClick={() => setCustomerMode("new")}>
                  สร้างลูกค้าใหม่
                </button>
              </div>
              {customerMode === "existing" ? (
                <>
                  <Field label="ค้นหาชื่อหรือเบอร์โทร">
                    <input data-testid="customer-search" className={control} value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="เช่น สมชาย หรือ 081" />
                  </Field>
                  <ul data-testid="customer-results" className="max-h-64 space-y-2 overflow-auto">
                    {filteredCustomers.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`w-full rounded-xl px-3 py-3 text-left text-sm ${selectedCustomerId === customer.id ? "bg-emerald-400 text-emerald-950" : "bg-black/30"}`}
                        >
                          <span className="block font-medium">{customer.full_name || "ไม่ระบุชื่อ"}</span>
                          <span className="block text-xs opacity-80">{customer.phone || "ไม่มีเบอร์"}</span>
                        </button>
                      </li>
                    ))}
                    {!filteredCustomers.length ? <li className="text-sm text-emerald-100/70">ไม่พบลูกค้าที่ตรงกับคำค้น</li> : null}
                  </ul>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ชื่อ-นามสกุล">
                    <input className={control} value={newName} onChange={(event) => setNewName(event.target.value)} />
                  </Field>
                  <Field label="เบอร์โทร">
                    <input className={control} value={newPhone} onChange={(event) => setNewPhone(event.target.value)} inputMode="tel" />
                  </Field>
                  <Field label="เลขบัตรประชาชน">
                    <input className={control} value={newIdCard} onChange={(event) => setNewIdCard(event.target.value)} />
                  </Field>
                  <Field label="ที่อยู่">
                    <input className={control} value={newAddress} onChange={(event) => setNewAddress(event.target.value)} />
                  </Field>
                </div>
              )}
              {customerNote ? <p className="text-sm text-amber-100">{customerNote}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
              <Field label="เลขที่โฉนด">
                <input className={control} value={deedNumber} onChange={(event) => setDeedNumber(event.target.value)} />
              </Field>
              <Field label="ขนาดที่ดิน">
                <input className={control} value={areaSize} onChange={(event) => setAreaSize(event.target.value)} placeholder="เช่น 2-1-50" />
              </Field>
              <Field label="จังหวัด">
                <input className={control} value={province} onChange={(event) => setProvince(event.target.value)} />
              </Field>
              <Field label="อำเภอ">
                <input className={control} value={district} onChange={(event) => setDistrict(event.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200/40 px-3 py-4 text-sm">
                  <ImagePlus className="h-4 w-4" />
                  อัปโหลดรูปโฉนด
                  <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => void onPhotos(event.target.files)} />
                </label>
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <li key={photo.localId} className="overflow-hidden rounded-xl bg-black/30">
                      <img src={photo.previewUrl} alt={photo.name} className="h-24 w-full object-cover" />
                      <button type="button" className="flex w-full items-center justify-center gap-1 px-2 py-2 text-xs" onClick={() => void removePhoto(photo)}>
                        <Trash2 className="h-3 w-3" />
                        เอาออก
                      </button>
                      {photo.error ? <p className="px-2 pb-2 text-xs text-amber-100">{photo.error}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="flex flex-col gap-3">
              <Field label="ลิงก์ Google Maps" hint="หรือกรอกพิกัดแยก หรือปักหมุดบนแผนที่">
                <input data-testid="map-url" className={control} value={mapUrl} onChange={(event) => applyMapUrl(event.target.value)} placeholder="https://www.google.com/maps/..." />
              </Field>
              {mapNote ? <p className="text-sm text-amber-100">{mapNote}</p> : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="ละติจูด">
                  <input data-testid="latitude" className={control} value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" />
                </Field>
                <Field label="ลองจิจูด">
                  <input data-testid="longitude" className={control} value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" />
                </Field>
              </div>
              <MapPicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <Field label="ราคาประเมินแปลงนี้">
                <input data-testid="appraised-value" className={control} value={appraisedValue} onChange={(event) => setAppraisedValue(event.target.value)} inputMode="decimal" />
              </Field>
              <Field label="ราคาประเมินที่ดินข้างเคียง">
                <input data-testid="nearby-value" className={control} value={nearbyValue} onChange={(event) => setNearbyValue(event.target.value)} inputMode="decimal" />
              </Field>
              <div data-testid="valuation-compare" className="rounded-xl bg-black/30 px-3 py-3 text-sm">
                {comparison ? (
                  <>
                    <p>ส่วนต่าง {comparison.difference}</p>
                    <p className="mt-1 text-emerald-100">{comparison.higher}</p>
                  </>
                ) : (
                  <p className="text-emerald-100/70">กรอกราคาทั้งสองเพื่อเทียบส่วนต่าง</p>
                )}
              </div>
              <fieldset className="space-y-2 text-sm">
                <legend className="mb-2 font-medium">ฐานที่ใช้คิด LTV</legend>
                <label className="flex items-center gap-2">
                  <input data-testid="valuation-basis-plot" type="radio" name="valuation-basis" checked={basis === "plot"} onChange={() => setBasis("plot")} />
                  ใช้ราคาประเมินแปลงนี้
                </label>
                <label className="flex items-center gap-2">
                  <input data-testid="valuation-basis-nearby" type="radio" name="valuation-basis" checked={basis === "nearby"} onChange={() => setBasis("nearby")} />
                  ใช้ราคาประเมินที่ดินข้างเคียง
                </label>
                <p className="text-emerald-100">
                  {basis === "plot" ? "ตอนนี้ LTV ใช้ราคาประเมินแปลงนี้" : "ตอนนี้ LTV ใช้ราคาประเมินที่ดินข้างเคียง"}
                </p>
              </fieldset>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <p className="text-sm font-medium">ประเภทสัญญา</p>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      data-testid={`contract-type-${type}`}
                      onClick={() => setContractType(type)}
                      className={`rounded-full px-3 py-2 text-sm ${contractType === type ? "bg-emerald-400 text-emerald-950" : "bg-white/5"}`}
                    >
                      {CONTRACT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="เงินต้น">
                <input data-testid="principal" className={control} value={principal} onChange={(event) => setPrincipal(event.target.value)} inputMode="decimal" />
              </Field>
              <Field label="เลขที่สัญญา">
                <input className={control} value={contractNumber} onChange={(event) => setContractNumber(event.target.value)} placeholder="เว้นว่างได้ ระบบจะออกเลขให้" />
              </Field>
              <Field label="วันเริ่ม">
                <input className={control} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field label="วันสิ้นสุด">
                <input className={control} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </Field>
            </div>
            <aside data-testid="ltv-panel" className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <p className="font-medium">{CONTRACT_TYPE_LABELS[contractType]}</p>
              {ltv ? (
                <div className="mt-3 space-y-2">
                  <p data-testid="ltv-min">ต่ำสุดที่แนะนำ {formatBaht(ltv.suggestedMinPrincipal.exact)}</p>
                  <p data-testid="ltv-max">สูงสุดที่แนะนำ {formatBaht(ltv.suggestedMaxPrincipal.exact)}</p>
                  <p data-testid="ltv-actual">
                    LTV จริง {ltv.ltvPercent ? `${ltv.ltvPercent.fixed}%` : "คำนวณเป็นสัดส่วนไม่ได้"}
                  </p>
                  <p data-testid="ltv-position" className={ltv.position === "inside" ? "text-emerald-200" : "text-amber-100"}>
                    {ltv.positionLabel}
                  </p>
                  {ltv.position !== "inside" ? (
                    <p className="rounded-xl bg-amber-300/10 px-3 py-2 text-amber-50">
                      เงินต้นอยู่นอกช่วงที่แนะนำ ยังบันทึกได้
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-emerald-100/70">กรอกราคาประเมินและเงินต้นเพื่อดูช่วงที่แนะนำ</p>
              )}
            </aside>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_INTEREST_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    data-testid={`rate-pill-${rate}`}
                    onClick={() => {
                      setPresetRate(rate);
                      setCustomRate("");
                      setHighIntent(false);
                    }}
                    className={`rounded-full px-3 py-2 text-sm ${!customRate && !highIntent && presetRate === rate ? "bg-emerald-400 text-emerald-950" : "bg-white/5"}`}
                  >
                    {rate}%
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="rate-pill-high"
                  onClick={() => {
                    setHighIntent(true);
                    customRateRef.current?.focus();
                  }}
                  className={`rounded-full px-3 py-2 text-sm ${highIntent || Number(customRate) > 50 ? "bg-amber-300 text-amber-950" : "bg-white/5"}`}
                >
                  &gt;50%
                </button>
              </div>
              <Field label="อัตราเอง" hint="เมื่อพิมพ์ในช่องนี้ ค่าที่พิมพ์จะถูกใช้แทนปุ่มด้านบน รวม 0.5 และ 60">
                <input
                  ref={customRateRef}
                  data-testid="rate-custom"
                  className={control}
                  value={customRate}
                  inputMode="decimal"
                  onChange={(event) => {
                    setCustomRate(event.target.value);
                    if (event.target.value.trim()) setHighIntent(false);
                  }}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {INTEREST_PERIOD_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-testid={`period-${item}`}
                    onClick={() => setPeriod(item)}
                    className={`rounded-full px-3 py-2 text-sm ${period === item ? "bg-emerald-400 text-emerald-950" : "bg-white/5"}`}
                  >
                    {INTEREST_PERIOD_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <aside data-testid="interest-panel" className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <p>อัตราที่ใช้ {activeRate}% {INTEREST_PERIOD_LABELS[period]}</p>
              {interest ? (
                <div className="mt-3 space-y-2">
                  <p data-testid="interest-daily">ดอกเบี้ยรายวัน {formatBaht(interest.dailyInterest.exact)}</p>
                  <p data-testid="interest-monthly">ดอกเบี้ยรายเดือน {formatBaht(interest.monthlyInterest.exact)}</p>
                  <p data-testid="interest-yearly">ดอกเบี้ยรายปี {formatBaht(interest.yearlyInterest.exact)}</p>
                  <p data-testid="interest-payoff">ยอดชำระ ณ วันสิ้นสุด {formatBaht(interest.totalPayoff.exact)}</p>
                </div>
              ) : (
                <p className="mt-3 text-emerald-100/70">กรอกเงินต้น อัตรา และวันที่เพื่อดูยอด</p>
              )}
            </aside>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <button type="button" data-testid="add-commission" onClick={addSplit} className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950">
                <Plus className="h-4 w-4" />
                เพิ่มผู้รับส่วนแบ่ง
              </button>
              <p className="text-xs text-emerald-100/70">ยอดบาทคำนวณจากเงินต้น</p>
              {splits.map((row, index) => {
                const line = commission?.lines[splits.slice(0, index).filter((item) => item.percentage.trim()).length];
                const amount = row.percentage.trim() && line ? formatBaht(line.calculatedAmount.exact) : "";
                return (
                  <div key={row.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
                    <input data-testid={`commission-name-${index}`} className={control} placeholder="ชื่อ" value={row.personName} onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, personName: event.target.value } : item))} />
                    <input className={control} placeholder="บทบาท" value={row.roleLabel} onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, roleLabel: event.target.value } : item))} />
                    <input data-testid={`commission-percent-${index}`} className={control} placeholder="ร้อยละ" inputMode="decimal" value={row.percentage} onChange={(event) => setSplits((current) => current.map((item) => item.id === row.id ? { ...item, percentage: event.target.value } : item))} />
                    <p data-testid={`commission-amount-${index}`} className="flex items-center text-sm">{amount || "—"}</p>
                  </div>
                );
              })}
              <div className="text-sm">
                <p data-testid="commission-total">
                  รวม {commission ? `${commission.totalPercentage.fixed}%` : "0.00%"}
                </p>
                <p data-testid="commission-remainder" className={commission && !commission.sumsToFull ? "text-amber-100" : ""}>
                  {commission
                    ? commission.sumsToFull
                      ? "ส่วนแบ่งครบ 100%"
                      : `ยังเหลือ ${commission.remainderPercentage.fixed}% บันทึกได้แม้ไม่ครบ 100`
                    : "ยังไม่มีผู้รับส่วนแบ่ง"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="บันทึกสัญญา">
                <textarea data-testid="notes" className={`${control} min-h-40`} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </Field>
              <Field label="แจ้งเตือนก่อนวันสิ้นสุด" hint={`ถ้าเลือกเป็นเดือน ระบบคูณ ${ALERT_DAYS_PER_MONTH} วันต่อเดือน`}>
                <div className="flex gap-2">
                  <input data-testid="alert-amount" className={control} value={alertAmount} onChange={(event) => setAlertAmount(event.target.value)} inputMode="numeric" />
                  <button type="button" data-testid="alert-unit-days" className={`rounded-xl px-3 ${alertUnit === "days" ? "bg-emerald-400 text-emerald-950" : "bg-white/5"}`} onClick={() => setAlertUnit("days")}>วัน</button>
                  <button type="button" data-testid="alert-unit-months" className={`rounded-xl px-3 ${alertUnit === "months" ? "bg-emerald-400 text-emerald-950" : "bg-white/5"}`} onClick={() => setAlertUnit("months")}>เดือน</button>
                </div>
              </Field>
              <p data-testid="alert-days" className="text-sm text-emerald-100">
                {"days" in alert
                  ? `จะบันทึกการแจ้งเตือนล่วงหน้า ${alert.days} วัน`
                  : alert.error}
              </p>
            </div>
          </section>
        ) : null}

        {formError ? <p className="rounded-xl bg-amber-300/10 px-3 py-3 text-sm text-amber-50">{formError}</p> : null}

        <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-[#0c1210]/95 py-4">
          <button type="button" className="rounded-full bg-white/10 px-4 py-3 text-sm disabled:opacity-40" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
            ย้อนกลับ
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="rounded-full bg-emerald-400 px-4 py-3 text-sm font-medium text-emerald-950" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}>
              ถัดไป
            </button>
          ) : (
            <button type="button" data-testid="save-contract" className="rounded-full bg-emerald-400 px-4 py-3 text-sm font-medium text-emerald-950 disabled:opacity-60" disabled={saving} onClick={() => void save()}>
              {saving ? "กำลังบันทึก" : "บันทึกสัญญา"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
