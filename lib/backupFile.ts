import * as XLSX from "xlsx";

export type BackupTable = "customers" | "land_assets" | "contracts" | "commission_splits";

export type BackupRow = Record<string, unknown>;

export type BackupFile = Record<BackupTable, BackupRow[]>;

export type RestoreSkip = { table: BackupTable; id: string; reason: string };

export type RestorePlan = {
  customers: BackupRow[];
  landAssets: BackupRow[];
  contracts: BackupRow[];
  splits: BackupRow[];
  skipped: RestoreSkip[];
  inserted: number;
  updated: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COLUMNS: Record<BackupTable, readonly string[]> = {
  customers: ["id", "owner_id", "full_name", "phone", "id_card", "address", "created_at"],
  land_assets: [
    "id",
    "customer_id",
    "owner_id",
    "deed_number",
    "province",
    "district",
    "area_size",
    "latitude",
    "longitude",
    "map_url",
    "appraised_value",
    "nearby_appraised_value",
    "deed_images",
    "created_at",
  ],
  contracts: [
    "id",
    "contract_number",
    "owner_id",
    "customer_id",
    "land_id",
    "contract_type",
    "principal_amount",
    "interest_rate",
    "interest_period_type",
    "start_date",
    "end_date",
    "alert_before_days",
    "notes",
    "status",
    "shared_with_upline_id",
    "created_at",
  ],
  commission_splits: ["id", "contract_id", "person_name", "role_label", "percentage", "calculated_amount"],
};

export function emptyBackup(): BackupFile {
  return { customers: [], land_assets: [], contracts: [], commission_splits: [] };
}

export function parseBackup(text: string): { ok: true; data: BackupFile } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "ไฟล์ไม่ใช่ JSON ที่อ่านได้" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "รูปแบบไฟล์ไม่ถูกต้อง" };
  }
  const record = parsed as Record<string, unknown>;
  const data = emptyBackup();
  for (const table of Object.keys(COLUMNS) as BackupTable[]) {
    const value = record[table];
    if (!Array.isArray(value)) return { ok: false, error: `ต้องมีรายการ ${table}` };
    if (!value.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
      return { ok: false, error: `แถวใน ${table} ไม่ถูกต้อง` };
    }
    data[table] = value.map((row) => pickColumns(table, row as BackupRow));
  }
  return { ok: true, data };
}

function pickColumns(table: BackupTable, row: BackupRow): BackupRow {
  const next: BackupRow = {};
  for (const key of COLUMNS[table]) {
    if (key in row) next[key] = row[key];
  }
  return next;
}

function asId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function textOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export function planRestore(
  file: BackupFile,
  ownerId: string,
  existing: { customerIds: ReadonlySet<string>; landIds: ReadonlySet<string>; contractIds: ReadonlySet<string> },
): RestorePlan {
  const skipped: RestoreSkip[] = [];
  const customerIds = new Set(existing.customerIds);
  const landIds = new Set(existing.landIds);
  const contractIds = new Set(existing.contractIds);
  let inserted = 0;
  let updated = 0;

  const customers = file.customers.flatMap((row) => {
    const id = row.id == null || row.id === "" ? null : asId(row.id);
    if (row.id != null && row.id !== "" && !id) {
      skipped.push({ table: "customers", id: String(row.id), reason: "รหัสไม่ถูกต้อง" });
      return [];
    }
    if (id && customerIds.has(id)) updated += 1;
    else inserted += 1;
    if (id) customerIds.add(id);
    return [{ ...row, id: id ?? undefined, owner_id: ownerId }];
  });

  const landAssets = file.land_assets.flatMap((row) => {
    const id = row.id == null || row.id === "" ? null : asId(row.id);
    const label = id ?? "ไม่ระบุรหัส";
    if (row.id != null && row.id !== "" && !id) {
      skipped.push({ table: "land_assets", id: String(row.id), reason: "รหัสไม่ถูกต้อง" });
      return [];
    }
    const customerId = textOrNull(row.customer_id);
    if (customerId && !customerIds.has(customerId)) {
      skipped.push({ table: "land_assets", id: label, reason: "ลูกค้าไม่ได้อยู่ในข้อมูลของผู้ใช้" });
      return [];
    }
    if (id && landIds.has(id)) updated += 1;
    else inserted += 1;
    if (id) landIds.add(id);
    return [{ ...row, id: id ?? undefined, owner_id: ownerId, customer_id: customerId }];
  });

  const contracts = file.contracts.flatMap((row) => {
    const id = row.id == null || row.id === "" ? null : asId(row.id);
    const label = id ?? "ไม่ระบุรหัส";
    if (row.id != null && row.id !== "" && !id) {
      skipped.push({ table: "contracts", id: String(row.id), reason: "รหัสไม่ถูกต้อง" });
      return [];
    }
    const customerId = textOrNull(row.customer_id);
    const landId = textOrNull(row.land_id);
    if (customerId && !customerIds.has(customerId)) {
      skipped.push({ table: "contracts", id: label, reason: "ลูกค้าไม่ได้อยู่ในข้อมูลของผู้ใช้" });
      return [];
    }
    if (landId && !landIds.has(landId)) {
      skipped.push({ table: "contracts", id: label, reason: "โฉนดไม่ได้อยู่ในข้อมูลของผู้ใช้" });
      return [];
    }
    if (id && contractIds.has(id)) updated += 1;
    else inserted += 1;
    if (id) contractIds.add(id);
    const upline = textOrNull(row.shared_with_upline_id);
    return [{
      ...row,
      id: id ?? undefined,
      owner_id: ownerId,
      customer_id: customerId,
      land_id: landId,
      shared_with_upline_id: upline && asId(upline) ? upline : null,
    }];
  });

  const splits = file.commission_splits.flatMap((row) => {
    const id = row.id == null || row.id === "" ? null : asId(row.id);
    const contractId = asId(row.contract_id);
    if (!contractId || !contractIds.has(contractId)) {
      skipped.push({ table: "commission_splits", id: id ?? "ไม่ระบุรหัส", reason: "สัญญาไม่ได้อยู่ในข้อมูลของผู้ใช้" });
      return [];
    }
    if (row.id != null && row.id !== "" && !id) {
      skipped.push({ table: "commission_splits", id: String(row.id), reason: "รหัสไม่ถูกต้อง" });
      return [];
    }
    inserted += 1;
    return [{ ...row, id: id ?? undefined, contract_id: contractId }];
  });

  return { customers, landAssets, contracts, splits, skipped, inserted, updated };
}

export function backupToWorkbook(file: BackupFile) {
  const book = XLSX.utils.book_new();
  for (const table of Object.keys(COLUMNS) as BackupTable[]) {
    const rows = file[table];
    const keys = [...COLUMNS[table]];
    const grid = [
      keys,
      ...rows.map((row) => keys.map((key) => {
        const value = row[key];
        if (Array.isArray(value)) return value.join("|");
        if (value == null) return "";
        return String(value);
      })),
    ];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(grid), table);
  }
  return book;
}

export function downloadJson(file: BackupFile, filename: string) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return blob;
}

export function previewBackupFile(): BackupFile {
  return {
    customers: [
      { id: "00000000-0000-4000-8000-0000000000a1", full_name: "สมชาย ใจดี", phone: "0891112222", id_card: "", address: "เชียงใหม่" },
    ],
    land_assets: [
      { id: "00000000-0000-4000-8000-0000000000b1", customer_id: "00000000-0000-4000-8000-0000000000a1", deed_number: "089-55", province: "ลำพูน", district: "ป่าซาง", area_size: "2-1-50" },
    ],
    contracts: [
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        customer_id: "00000000-0000-4000-8000-0000000000a1",
        land_id: "00000000-0000-4000-8000-0000000000b1",
        contract_number: "LF-0890",
        contract_type: "sale_redemption",
        principal_amount: "100000",
        interest_rate: "1.50",
        interest_period_type: "monthly",
        start_date: "2026-10-14",
        end_date: "2026-11-20",
        alert_before_days: 14,
        status: "active",
      },
    ],
    commission_splits: [
      { id: "00000000-0000-4000-8000-0000000000d1", contract_id: "00000000-0000-4000-8000-0000000000c1", person_name: "นายเอ", role_label: "นายหน้า", percentage: "40", calculated_amount: "40000" },
    ],
  };
}
