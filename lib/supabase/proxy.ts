import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLandMemberPath, signedOutEntry } from "../landPaths";
import { isOpenPath } from "../staff";
import { LAND_SCHEMA, LAND_SUPABASE_URL, landAnonKey, landAuthConfigured } from "./land";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./public";

function redirectTo(request: NextRequest, pathname: string, session: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  session.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

function bindCookies(request: NextRequest, state: { response: NextResponse }) {
  const jar = new Map<string, { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }>();
  return {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[]) {
      cookiesToSet.forEach((cookie) => {
        request.cookies.set(cookie.name, cookie.value);
        jar.set(cookie.name, cookie);
      });
      const next = NextResponse.next({ request });
      jar.forEach((cookie) => {
        next.cookies.set(cookie.name, cookie.value, cookie.options);
      });
      state.response = next;
    },
  };
}

export async function updateSession(request: NextRequest) {
  const state = { response: NextResponse.next({ request }) };
  const cookies = bindCookies(request, state);

  const air = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies });
  const land = landAuthConfigured()
    ? createServerClient(LAND_SUPABASE_URL, landAnonKey(), {
        db: { schema: LAND_SCHEMA },
        cookies,
      })
    : null;

  const { data: airClaims } = await air.auth.getClaims();
  let landClaims: { claims?: { sub?: unknown } } | null = null;
  if (land) {
    try {
      landClaims = (await land.auth.getClaims()).data;
    } catch {
      landClaims = null;
    }
  }
  const airUserId = typeof airClaims?.claims?.sub === "string" ? airClaims.claims.sub : "";
  const landUserId = typeof landClaims?.claims?.sub === "string" ? landClaims.claims.sub : "";
  const path = request.nextUrl.pathname;

  if (isOpenPath(path)) return state.response;

  const { data: account } = airUserId
    ? await air.from("staff_accounts").select("status, role").eq("user_id", airUserId).maybeSingle()
    : { data: null };
  let profile: { id: string } | null = null;
  if (land && landUserId) {
    try {
      const result = await land.from("profiles").select("id").eq("id", landUserId).maybeSingle();
      profile = result.data;
    } catch {
      profile = null;
    }
  }

  if (isLandMemberPath(path)) {
    if (profile) return state.response;
    if (account?.status === "approved" && path === "/dashboard") return state.response;
    if (!airUserId && !landUserId) return redirectTo(request, signedOutEntry(path), state.response);
    if (account?.status === "approved") return redirectTo(request, "/", state.response);
    return redirectTo(request, "/pending", state.response);
  }

  if (!account || account.status !== "approved") {
    if (profile) {
      if (path === "/dashboard") return state.response;
      return redirectTo(request, "/dashboard", state.response);
    }
    if (!airUserId) return redirectTo(request, signedOutEntry(path), state.response);
    return redirectTo(request, "/pending", state.response);
  }
  if (path.startsWith("/approvals") && account.role !== "admin") {
    return redirectTo(request, "/", state.response);
  }
  return state.response;
}
