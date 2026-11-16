export type AuthUserRecord = {
  id?: string | null;
  email?: string | null;
};

export type AccountMatch =
  | { status: "found"; id: string; email: string }
  | { status: "none" }
  | { status: "ambiguous" }
  | { status: "unavailable" };

const PAGE_SIZE = 200;
const MAX_PAGES = 5;

export function exactEmailMatches(users: AuthUserRecord[], email: string): { id: string; email: string }[] {
  const want = email.trim().toLowerCase();
  const found: { id: string; email: string }[] = [];
  for (const user of users) {
    const id = typeof user.id === "string" ? user.id : "";
    const value = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!id || value !== want) continue;
    found.push({ id, email: value });
  }
  return found;
}

export function matchAuthUsers(users: AuthUserRecord[], email: string): AccountMatch {
  const found = exactEmailMatches(users, email);
  if (found.length === 1) return { status: "found", id: found[0].id, email: found[0].email };
  if (found.length > 1) return { status: "ambiguous" };
  return { status: "none" };
}

type FetchLike = (input: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

/**
 * ค้นบัญชี Supabase Auth ที่มีอีเมลตรงกัน โดยไม่สร้างผู้ใช้
 * Looks up an existing Auth user by exact email and never creates one.
 */
export async function findAuthUserByEmail(options: {
  supabaseUrl: string;
  serviceRoleKey: string;
  email: string;
  fetchImpl?: FetchLike;
}): Promise<AccountMatch> {
  const email = options.email.trim().toLowerCase();
  if (!options.supabaseUrl || !options.serviceRoleKey || !email) return { status: "unavailable" };
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const exact = await readUsers(fetchImpl, options, { email, page: 1, perPage: 20 });
  if (exact.status === "unavailable") return { status: "unavailable" };
  if (exact.status === "unsupported") {
    return filterPages(fetchImpl, options, email);
  }
  const matched = matchAuthUsers(exact.users, email);
  if (matched.status === "found" || matched.status === "ambiguous") return matched;
  if (exact.users.length === 0) return { status: "none" };
  return filterPages(fetchImpl, options, email);
}

async function filterPages(fetchImpl: FetchLike, options: { supabaseUrl: string; serviceRoleKey: string }, email: string): Promise<AccountMatch> {
  const collected: AuthUserRecord[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await readUsers(fetchImpl, options, { filter: email, page, perPage: PAGE_SIZE });
    if (batch.status === "unavailable" || batch.status === "unsupported") return { status: "unavailable" };
    collected.push(...batch.users);
    const matched = matchAuthUsers(collected, email);
    if (matched.status === "found" || matched.status === "ambiguous") return matched;
    if (batch.users.length < PAGE_SIZE || page * PAGE_SIZE >= batch.total) break;
  }
  return matchAuthUsers(collected, email);
}

async function readUsers(
  fetchImpl: FetchLike,
  options: { supabaseUrl: string; serviceRoleKey: string },
  query: { email?: string; filter?: string; page: number; perPage: number },
): Promise<{ status: "ok"; users: AuthUserRecord[]; total: number } | { status: "unavailable" } | { status: "unsupported" }> {
  let endpoint: URL;
  try {
    endpoint = new URL("/auth/v1/admin/users", options.supabaseUrl);
  } catch {
    return { status: "unavailable" };
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    return { status: "unavailable" };
  }
  endpoint.searchParams.set("page", String(query.page));
  endpoint.searchParams.set("per_page", String(query.perPage));
  if (query.email) endpoint.searchParams.set("email", query.email);
  if (query.filter) endpoint.searchParams.set("filter", query.filter);
  try {
    const response = await fetchImpl(endpoint.toString(), {
      headers: {
        Authorization: `Bearer ${options.serviceRoleKey}`,
        apikey: options.serviceRoleKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 400 || response.status === 422) return { status: "unsupported" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.json();
    const users = usersFrom(body);
    if (!users) return { status: "unavailable" };
    const totalHeader = Number(response.headers.get("x-total-count") || "");
    const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : users.length;
    return { status: "ok", users, total };
  } catch {
    return { status: "unavailable" };
  }
}

function usersFrom(body: unknown): AuthUserRecord[] | null {
  if (!body || typeof body !== "object") return null;
  const users = (body as { users?: unknown }).users;
  if (!Array.isArray(users)) return null;
  return users.filter((user) => user && typeof user === "object") as AuthUserRecord[];
}

export type RecoveryLinkResult =
  | { status: "ok"; tokenHash: string }
  | { status: "missing" }
  | { status: "mismatch" }
  | { status: "unavailable" };

/**
 * ขอแฮช recovery ของบัญชีเดิมเท่านั้น ถ้าไอดีไม่ตรง จะไม่นำแฮชไปใช้
 * Requests a recovery hash for the already found user. A different id is discarded.
 */
export async function recoveryHashForExistingUser(input: {
  expectedUserId: string;
  email: string;
  generate: (email: string) => Promise<
    | { userId: string; tokenHash: string }
    | { error: "missing" | "unavailable" }
  >;
}): Promise<RecoveryLinkResult> {
  if (!input.expectedUserId || !input.email) return { status: "unavailable" };
  const generated = await input.generate(input.email);
  if ("error" in generated) return { status: generated.error };
  if (generated.userId !== input.expectedUserId || !generated.tokenHash) return { status: "mismatch" };
  return { status: "ok", tokenHash: generated.tokenHash };
}
