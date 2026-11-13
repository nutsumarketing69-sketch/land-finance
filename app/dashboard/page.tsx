import { Suspense } from "react";
import DeskScreen from "@/app/components/DeskScreen";
import ReferralProfile from "@/app/components/ReferralProfile";
import { previewContracts, PREVIEW_PROFILE } from "@/lib/dashboardData";
import { asLandProfile, type LandProfile } from "@/lib/landProfile";
import { loadContractCards, type ScopeClient } from "@/lib/landScope";
import { createClient } from "@/lib/supabase/server";
import DashboardScreen from "./land-screen";

export default function Page({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return (
    <Suspense fallback={<main className="bg-slate-950 p-8 text-center text-slate-200">กำลังโหลดแดชบอร์ด</main>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const query = await searchParams;
  const previewFlag = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === "1";
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  let profile: LandProfile | null = null;
  let staffApproved = false;

  if (user) {
    const [profileRes, staffRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, invite_code, referred_by").eq("id", user.id).maybeSingle(),
      supabase.from("staff_accounts").select("status").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!profileRes.error) profile = asLandProfile(profileRes.data);
    staffApproved = staffStatus(staffRes.data) === "approved";
  }

  if (!user && previewFlag) {
    const sample = previewContracts();
    return <DashboardScreen profile={PREVIEW_PROFILE} owned={sample.owned} incoming={sample.incoming} preview loadError="" />;
  }

  if (profile && !staffApproved) {
    const client = supabase as unknown as ScopeClient;
    const [owned, incoming] = await Promise.all([
      loadContractCards(client, "owner_id", profile.id),
      loadContractCards(client, "shared_with_upline_id", profile.id),
    ]);
    return (
      <DashboardScreen
        profile={profile}
        owned={owned.cards}
        incoming={incoming.cards}
        preview={false}
        loadError={owned.error || incoming.error}
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
