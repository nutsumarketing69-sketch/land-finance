import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.landfinance.pro",
  appName: "Land Finance Pro",
  webDir: "capacitor-www",
  server: {
    url: "https://168.db357.com",
    androidScheme: "https",
  },
};

export default config;
