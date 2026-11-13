import type { Metadata } from "next";
import { LAND_BRAND } from "@/lib/brand";
import LoginScreen from "./screen";

export const metadata: Metadata = {
  title: { absolute: LAND_BRAND },
};

export default function LoginPage() {
  return <LoginScreen />;
}
