import type { BackupFile, BackupRow } from "./backupFile";
import type { DashboardContract } from "./dashboardData";

type QueryResult = { data: unknown; error: { message?: string } | null };

type Builder = PromiseLike<QueryResult> & {
  eq: (column: string, value: string) => Builder;
  in: (column: string, values: readonly string[]) => Builder;
};

export type ScopeClient = {
  from: (table: string) => {
    select: (columns: string) => Builder;
  };
};

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

function text(value: unknown) {
  if (value == null) return "";
  return String(value);
}

function days(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function cardsFromRows(
  contracts: readonly Record<string, unknown>[],
  customers: readonly Record<string, unknown>[],
  lands: readonly Record<string, unknown>[],
): DashboardContract[] {
  const customerById = new Map(customers.map((row) => [text(row.id), row]));
  const landById = new Map(lands.map((row) => [text(row.id), row]));
  return contracts.map((row) => {
    const customer = customerById.get(text(row.customer_id));
    const land = landById.get(text(row.land_id));
    return {
      id: text(row.id),
      contractNumber: text(row.contract_number),
      contractType: text(row.contract_type),
      principal: text(row.principal_amount),
      interestRate: text(row.interest_rate),
      interestPeriodType: text(row.interest_period_type),
      startDate: text(row.start_date).slice(0, 10),
      endDate: text(row.end_date).slice(0, 10),
      alertBeforeDays: days(row.alert_before_days),
      status: text(row.status),
      customerName: text(customer?.full_name),
      customerPhone: text(customer?.phone),
      deedNumber: text(land?.deed_number),
      province: text(land?.province),
      district: text(land?.district),
    };
  });
}

async function related(
  supabase: ScopeClient,
  table: string,
  ids: string[],
) {
  if (!ids.length) return { rows: [] as Record<string, unknown>[], error: "" };
  const { data, error } = await supabase.from(table).select("*").in("id", ids);
  if (error) return { rows: [], error: "โหลดข้อมูลที่เกี่ยวข้องไม่สำเร็จ" };
  return { rows: rowsOf(data), error: "" };
}

export async function loadContractCards(
  supabase: ScopeClient,
  column: "owner_id" | "shared_with_upline_id",
  profileId: string,
) {
  const { data, error } = await supabase.from("contracts").select("*").eq(column, profileId);
  if (error) return { cards: [] as DashboardContract[], error: "โหลดสัญญาไม่สำเร็จ" };
  const contracts = rowsOf(data);
  const customerIds = [...new Set(contracts.map((row) => text(row.customer_id)).filter(Boolean))];
  const landIds = [...new Set(contracts.map((row) => text(row.land_id)).filter(Boolean))];
  const [customers, lands] = await Promise.all([
    related(supabase, "customers", customerIds),
    related(supabase, "land_assets", landIds),
  ]);
  return {
    cards: cardsFromRows(contracts, customers.rows, lands.rows),
    error: customers.error || lands.error,
  };
}

export async function loadOwnedBackup(supabase: ScopeClient, ownerId: string): Promise<{ file: BackupFile; error: string }> {
  const empty: BackupFile = { customers: [], land_assets: [], contracts: [], commission_splits: [] };
  const [customers, lands, contracts] = await Promise.all([
    supabase.from("customers").select("*").eq("owner_id", ownerId),
    supabase.from("land_assets").select("*").eq("owner_id", ownerId),
    supabase.from("contracts").select("*").eq("owner_id", ownerId),
  ]);
  if (customers.error || lands.error || contracts.error) return { file: empty, error: "โหลดข้อมูลสำรองไม่สำเร็จ" };
  const contractRows = rowsOf(contracts.data);
  const contractIds = contractRows.map((row) => text(row.id)).filter(Boolean);
  let splits: BackupRow[] = [];
  if (contractIds.length) {
    const splitResult = await supabase.from("commission_splits").select("*").in("contract_id", contractIds);
    if (splitResult.error) return { file: empty, error: "โหลดส่วนแบ่งไม่สำเร็จ" };
    splits = rowsOf(splitResult.data);
  }
  return {
    file: {
      customers: rowsOf(customers.data),
      land_assets: rowsOf(lands.data),
      contracts: contractRows,
      commission_splits: splits,
    },
    error: "",
  };
}
