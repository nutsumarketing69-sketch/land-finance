import { Suspense } from "react";
import DeskScreen from "@/app/components/DeskScreen";
import LandHome from "@/app/components/LandHome";
import ReferralProfile from "@/app/components/ReferralProfile";
import { asLandProfile, type LandProfile } from "@/lib/landProfile";
import { createClient } from "@/lib/supabase/server";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-white">กำลังโหลด...</main>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  let profile: LandProfile | null = null;
  let staffApproved = false;

  if (user) {
    const [profileRes, staffRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, invite_code").eq("id", user.id).maybeSingle(),
      supabase.from("staff_accounts").select("status").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!profileRes.error) profile = asLandProfile(profileRes.data);
    staffApproved = staffStatus(staffRes.data) === "approved";
  }

  if (profile && !staffApproved) {
    return <LandHome profile={profile} />;
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
