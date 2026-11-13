"use client";

import { useState } from "react";
import Link from "next/link";
import LandNav from "@/app/components/LandNav";
import * as XLSX from "xlsx";
import {
  backupToWorkbook,
  downloadJson,
  parseBackup,
  planRestore,
  type BackupFile,
} from "@/lib/backupFile";
import { createClient } from "@/lib/supabase/client";

export default function BackupScreen({
  file,
  ownerId,
  existing,
  preview,
  loadError,
}: {
  file: BackupFile;
  ownerId: string;
  existing: { customerIds: string[]; landIds: string[]; contractIds: string[] };
  preview: boolean;
  loadError: string;
}) {
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  function exportJson() {
    downloadJson(file, "land-backup.json");
  }

  function exportXlsx() {
    XLSX.writeFile(backupToWorkbook(file), "land-backup.xlsx");
  }

  async function onFile(list: FileList | null) {
    const selected = list?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".json")) {
      setSummary("รับเฉพาะไฟล์ .json");
      return;
    }
    setBusy(true);
    const parsed = parseBackup(await selected.text());
    if (!parsed.ok) {
      setBusy(false);
      setSummary(parsed.error);
      return;
    }
    const plan = planRestore(parsed.data, ownerId, {
      customerIds: new Set(existing.customerIds),
      landIds: new Set(existing.landIds),
      contractIds: new Set(existing.contractIds),
    });
    if (preview) {
      setBusy(false);
      setSummary(`โหมดตัวอย่าง ไม่ได้เขียนลงฐานข้อมูล จะเพิ่มหรือแก้ ${plan.inserted + plan.updated} แถว ข้าม ${plan.skipped.length} แถว`);
      return;
    }
    const supabase = createClient();
    const steps: { table: string; rows: Record<string, unknown>[] }[] = [
      { table: "customers", rows: plan.customers },
      { table: "land_assets", rows: plan.landAssets },
      { table: "contracts", rows: plan.contracts },
      { table: "commission_splits", rows: plan.splits },
    ];
    const failures: string[] = [];
    for (const step of steps) {
      if (!step.rows.length) continue;
      const { error } = await supabase.from(step.table).upsert(step.rows);
      if (error) {
        failures.push(`${step.table}: บันทึกไม่สำเร็จ`);
        break;
      }
    }
    setBusy(false);
    const skipped = plan.skipped.map((row) => `${row.table} ${row.id} ${row.reason}`).join(" · ");
    setSummary(`บันทึกแล้ว ${plan.inserted + plan.updated} แถว ข้าม ${plan.skipped.length} แถว${failures.length ? ` · ${failures.join(" ")} ตารางถัดไปยังไม่ถูกเขียน` : ""}${skipped ? ` · ${skipped}` : ""}`);
  }

  return (
    <LandNav preview={preview}>
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">สัญญาที่ดิน</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">สำรองและกู้คืน</h1>
        </header>
        {preview ? (
          <p data-testid="preview-banner" className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            โหมดตัวอย่าง ไฟล์ที่ส่งออกเป็นข้อมูลจำลอง และยังไม่เขียนทับฐานข้อมูล
          </p>
        ) : null}
        {loadError ? <p className="text-sm text-amber-200">{loadError}</p> : null}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" data-testid="export-json" onClick={exportJson} className="rounded-3xl bg-amber-400 px-4 py-5 text-left font-semibold text-slate-950">
            ส่งออก JSON
            <span className="mt-1 block text-sm font-normal">ลูกค้า ที่ดิน สัญญา และส่วนแบ่ง</span>
          </button>
          <button type="button" data-testid="export-xlsx" onClick={exportXlsx} className="rounded-3xl border border-amber-300/50 px-4 py-5 text-left font-semibold text-amber-200">
            ส่งออก Excel
            <span className="mt-1 block text-sm font-normal text-slate-300">หนึ่งชีตต่อหนึ่งตาราง</span>
          </button>
        </section>
        <label className="rounded-3xl border border-dashed border-emerald-300/40 bg-slate-900 px-4 py-6 text-sm">
          นำเข้า JSON
          <input data-testid="import-json" className="mt-3 block w-full text-sm" type="file" accept="application/json,.json" onChange={(event) => void onFile(event.target.files)} />
        </label>
        {summary ? <p data-testid="restore-summary" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-emerald-200">{summary}</p> : null}
        {busy ? <p className="text-sm text-slate-400">กำลังตรวจสอบไฟล์</p> : null}
        <Link href={preview ? "/dashboard?preview=1" : "/dashboard"} className="text-sm text-amber-200">กลับแดชบอร์ด</Link>
      </div>
    </main>
    </LandNav>
  );
}
