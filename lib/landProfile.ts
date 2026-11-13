export type LandProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  invite_code: string | null;
  referred_by: string | null;
};

export function asLandProfile(value: unknown): LandProfile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    invite_code: typeof row.invite_code === "string" ? row.invite_code : null,
    referred_by: asUuid(row.referred_by),
  };
}

export function asUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}
