import { Suspense } from "react";
import ProfileScreen from "./screen";

export default function ProfilePage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return (
    <Suspense fallback={<main className="bg-slate-950 p-8 text-slate-200">กำลังเปิดโปรไฟล์</main>}>
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileContent({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  const query = await searchParams;
  const preview = (Array.isArray(query.preview) ? query.preview[0] : query.preview) === "1";
  return <ProfileScreen preview={preview} />;
}
