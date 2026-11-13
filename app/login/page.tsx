import type { Metadata } from "next";
import LoginScreen from "./screen";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function LoginPage() {
  return <LoginScreen />;
}
