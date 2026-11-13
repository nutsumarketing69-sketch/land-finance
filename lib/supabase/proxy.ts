import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOpenPath } from "../staff";
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : "";
  const path = request.nextUrl.pathname;

  if (isOpenPath(path)) return supabaseResponse;
  if (!userId) {
    return redirectTo(request, path === "/dashboard" ? "/login" : "/staff-login", supabaseResponse);
  }

  const { data: account } = await supabase
    .from("staff_accounts")
    .select("status, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account || account.status !== "approved") {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profile) {
      if (path === "/dashboard") return supabaseResponse;
      return redirectTo(request, "/dashboard", supabaseResponse);
    }
    return redirectTo(request, "/pending", supabaseResponse);
  }
  if (path.startsWith("/approvals") && account.role !== "admin") {
    return redirectTo(request, "/", supabaseResponse);
  }
  return supabaseResponse;
}
