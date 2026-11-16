import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { accountStop, handoffStopPage, isLandSupabaseUrl, type HandoffStop } from "@/lib/handoffPage";
import { consumeHandoffJti, readHandoffSecret, verifyLandHandoff } from "@/lib/hubHandoff";
import { findAuthUserByEmail, recoveryHashForExistingUser } from "@/lib/landAccount";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/public";

const STATUS: Record<HandoffStop, number> = {
  direct: 200,
  invalid: 401,
  missing: 404,
  ambiguous: 409,
  unavailable: 503,
  session: 502,
};

function stop(reason: HandoffStop) {
  return new NextResponse(handoffStopPage(reason), {
    status: STATUS[reason],
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}

function serviceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/\s+/g, "");
}

export function GET() {
  return stop("direct");
}

export async function POST(request: NextRequest) {
  const secret = readHandoffSecret();
  if (!secret) return stop("unavailable");

  let token = "";
  try {
    const form = await request.formData();
    const value = form.get("token");
    token = typeof value === "string" ? value : "";
  } catch {
    return stop("invalid");
  }

  const claims = verifyLandHandoff(token, secret);
  if (!claims) return stop("invalid");
  if (!isLandSupabaseUrl(SUPABASE_URL)) return stop("unavailable");

  const key = serviceRoleKey();
  if (!key) return stop("unavailable");
  if (!consumeHandoffJti(claims.jti, claims.exp)) return stop("invalid");

  const found = await findAuthUserByEmail({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: key,
    email: claims.email,
  });
  if (found.status !== "found") return stop(accountStop(found.status));

  const admin = createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const link = await recoveryHashForExistingUser({
    expectedUserId: found.id,
    email: found.email,
    generate: async (email) => {
      const result = await admin.auth.admin.generateLink({ type: "recovery", email });
      const tokenHash = result.data?.properties?.hashed_token;
      const userId = result.data?.user?.id;
      if (result.error || !tokenHash || !userId) {
        return { error: result.error && isMissingUser(result.error) ? "missing" : "unavailable" };
      }
      return { userId, tokenHash };
    },
  });
  if (link.status === "missing") return stop("missing");
  if (link.status !== "ok") return stop("session");

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  // แฮช recovery เปิดเซสชันของบัญชีเดิม โดยไม่ตั้งรหัสผ่านใหม่
  const verified = await supabase.auth.verifyOtp({ type: "recovery", token_hash: link.tokenHash });
  if (verified.error || !verified.data.session) return stop("session");
  return response;
}

function isMissingUser(error: { message?: string; status?: number; code?: string }): boolean {
  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();
  return error.status === 404 || code.includes("user_not_found") || message.includes("not found");
}
