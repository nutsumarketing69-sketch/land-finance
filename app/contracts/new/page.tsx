import type { Metadata } from "next";
import ContractWizard from "./wizard";

export const metadata: Metadata = {
  title: "สร้างสัญญา",
};

export default function NewContractPage() {
  return <ContractWizard />;
}
