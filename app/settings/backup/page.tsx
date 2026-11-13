import { Suspense } from "react";
import { previewBackupFile } from "@/lib/backupFile";
import { asLandProfile } from "@/lib/landProfile";
import { loadOwnedBackup, type ScopeClient } from "@/lib/landScope";
import { createClient } from "@/lib/supabase/server";
import BackupScreen from "./screen";

export const instant = false;

export default function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return (
    <Suspense fallback={<main className="bg-slate-950 p-8 text-center text-slate-200">กำลังเปิดหน้าสำรองข้อมูล</main>}>
      <BackupContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BackupContent({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const query = await searchParams;
  const previewFlag = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === "1";
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user && previewFlag) {
    const file = previewBackupFile();
    return (
      <BackupScreen
        file={file}
        ownerId="00000000-0000-4000-8000-000000000001"
        existing={{ customerIds: [], landIds: [], contractIds: [] }}
        preview
        loadError=""
      />
    );
  }

  if (!user) {
    return <main className="bg-slate-950 p-8 text-slate-200">เข้าสู่ระบบสมาชิกก่อนสำรองข้อมูล</main>;
  }

  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, invite_code, referred_by")
    .eq("id", user.id)
    .maybeSingle();
  const profile = error ? null : asLandProfile(profileRow);
  if (!profile) {
    return <main className="bg-slate-950 p-8 text-slate-200">หน้านี้สำหรับสมาชิกสัญญาที่ดิน</main>;
  }

  const loaded = await loadOwnedBackup(supabase as unknown as ScopeClient, profile.id);
  const ids = (rows: Record<string, unknown>[]) => rows.map((row) => String(row.id ?? "")).filter(Boolean);
  return (
    <BackupScreen
      file={loaded.file}
      ownerId={profile.id}
      existing={{
        customerIds: ids(loaded.file.customers),
        landIds: ids(loaded.file.land_assets),
        contractIds: ids(loaded.file.contracts),
      }}
      preview={false}
      loadError={loaded.error}
    />
  );
}
