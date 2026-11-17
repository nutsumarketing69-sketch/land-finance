import { Suspense } from "react";
import DeskScreen from "@/app/components/DeskScreen";
import ReferralProfile from "@/app/components/ReferralProfile";
import { previewContracts, PREVIEW_PROFILE } from "@/lib/dashboardData";
import { asLandProfile, type LandProfile } from "@/lib/landProfile";
import { loadContractCards, type ScopeClient } from "@/lib/landScope";
import { landAuthConfigured } from "@/lib/supabase/land";
import { createClient, createLandClient } from "@/lib/supabase/server";
import DashboardScreen from "./land-screen";

export default function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[]; focus?: string | string[] }> }) {
  return (
    <Suspense fallback={<main className="bg-slate-950 p-8 text-center text-slate-200">กำลังโหลดแดชบอร์ด</main>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ preview?: string | string[]; focus?: string | string[] }> }) {
  const query = await searchParams;
  const previewFlag = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === "1";
  const focusSearch = (Array.isArray(query.focus) ? query.focus[0] : query.focus) === "search";
  const air = await createClient();
  const { data: airAuth } = await air.auth.getUser();
  const airUser = airAuth.user;
  let land: Awaited<ReturnType<typeof createLandClient>> | null = null;
  let landUser: { id: string } | null = null;
  if (landAuthConfigured()) {
    try {
      land = await createLandClient();
      landUser = (await land.auth.getUser()).data.user;
    } catch {
      land = null;
      landUser = null;
    }
  }
  let profile: LandProfile | null = null;
  let staffApproved = false;

  if (land && landUser) {
    const profileRes = await land
      .from("profiles")
      .select("id, full_name, phone, invite_code, referred_by, role")
      .eq("id", landUser.id)
      .maybeSingle();
    if (!profileRes.error) profile = asLandProfile(profileRes.data);
  }
  if (airUser) {
    const staffRes = await air.from("staff_accounts").select("status").eq("user_id", airUser.id).maybeSingle();
    staffApproved = staffStatus(staffRes.data) === "approved";
  }

  if (!landUser && !airUser && previewFlag) {
    const sample = previewContracts();
    return <DashboardScreen profile={PREVIEW_PROFILE} owned={sample.owned} incoming={sample.incoming} preview loadError="" focusSearch={focusSearch} />;
  }

  if (profile && !staffApproved) {
    const client = land as unknown as ScopeClient;
    const [owned, incoming] = await Promise.all([
      loadContractCards(client, profile.role === "owner" ? "all" : "owner_id", profile.id),
      loadContractCards(client, "shared_with_upline_id", profile.id),
    ]);
    return (
      <DashboardScreen
        profile={profile}
        owned={owned.cards}
        incoming={incoming.cards}
        preview={false}
        loadError={owned.error || incoming.error}
        focusSearch={focusSearch}
      />
    );
  }

  return (
    <>
      {profile ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <ReferralProfile profile={profile} />
        </div>
      ) : null}
      <DeskScreen desk="money" initial="/dashboard" />
    </>
  );
}

function staffStatus(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const status = (value as { status?: unknown }).status;
  return typeof status === "string" ? status : "";
}
