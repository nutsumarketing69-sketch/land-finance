import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterScreen from "./screen";

export const metadata: Metadata = {
  title: "สมัครสมาชิก",
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0c1210] px-6 text-sm text-emerald-100">
          กำลังเปิดหน้าสมัคร
        </main>
      }
    >
      <RegisterGate searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterGate({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = Array.isArray(query.ref) ? query.ref[0] : query.ref;
  return <RegisterScreen initialRef={raw?.trim() || ""} />;
}
