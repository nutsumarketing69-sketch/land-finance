/** เส้นทางของสมาชิกสัญญาที่ดิน ที่ไม่ใช่หน้าร้านแอร์ */
export function isLandContractPath(pathname: string) {
  return pathname === "/contracts" || pathname.startsWith("/contracts/");
}

export function isLandBackupPath(pathname: string) {
  return pathname === "/settings/backup" || pathname.startsWith("/settings/backup/");
}

export function isLandMemberPath(pathname: string) {
  return pathname === "/dashboard" || isLandContractPath(pathname) || isLandBackupPath(pathname);
}

export function signedOutEntry(pathname: string) {
  if (isLandMemberPath(pathname)) return "/login";
  return "/staff-login";
}
