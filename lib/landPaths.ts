/** เส้นทางของสมาชิกสัญญาที่ดิน ที่ไม่ใช่หน้าร้านแอร์ */
export function isLandContractPath(pathname: string) {
  return pathname === "/contracts" || pathname.startsWith("/contracts/");
}

export function isLandBackupPath(pathname: string) {
  return pathname === "/settings/backup" || pathname.startsWith("/settings/backup/");
}

export function isLandValuationPath(pathname: string) {
  return pathname === "/valuation" || pathname.startsWith("/valuation/");
}

export function isLandProfilePath(pathname: string) {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export function isLandMemberPath(pathname: string) {
  return pathname === "/dashboard" || isLandContractPath(pathname) || isLandBackupPath(pathname) || isLandValuationPath(pathname) || isLandProfilePath(pathname);
}

export function signedOutEntry(pathname: string) {
  if (pathname === "/" || isLandMemberPath(pathname)) return "/login";
  return "/staff-login";
}
