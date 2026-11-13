import type { Metadata } from "next";
import LandNav from "@/app/components/LandNav";
import ContractWizard from "./wizard";

export const metadata: Metadata = {
  title: "สร้างสัญญา",
};

export default function NewContractPage() {
  return (
    <LandNav>
      <ContractWizard />
    </LandNav>
  );
}
