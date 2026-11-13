import { Suspense } from "react";
import LandNav from "@/app/components/LandNav";
import ContractEditor from "./editor";

export const instant = false;

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 px-4 py-10 text-white">กำลังเปิดสัญญา</main>}>
      <ContractDetail params={params} />
    </Suspense>
  );
}

async function ContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <LandNav>
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <ContractEditor contractId={id} />
        </div>
      </main>
    </LandNav>
  );
}
