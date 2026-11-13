import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LAND_BRAND, LAND_SHORT } from "@/lib/brand";
import "./globals.css";
import "./shop-theme.css";
import AuthShell from "./components/AuthShell";
import BackHome from "./components/BackHome";
import RegisterPwa from "./components/RegisterPwa";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  applicationName: LAND_SHORT,
  title: {
    default: LAND_BRAND,
    template: `%s · ${LAND_BRAND}`,
  },
  description: LAND_BRAND,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: LAND_SHORT,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d4a017",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <RegisterPwa />
          <AuthShell>
            <BackHome />
            {children}
          </AuthShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
