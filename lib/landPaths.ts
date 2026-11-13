/** เส้นทางของสมาชิกสัญญาที่ดิน ที่ไม่ใช่หน้าร้านแอร์ */
export function isLandContractPath(pathname: string) {
  return pathname === "/contracts" || pathname.startsWith("/contracts/");
}

export function signedOutEntry(pathname: string) {
  if (pathname === "/dashboard" || isLandContractPath(pathname)) return "/login";
  return "/staff-login";
}
