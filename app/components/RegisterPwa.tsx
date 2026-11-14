"use client";

import { useEffect } from "react";
import { storeInstallPrompt, type InstallPromptEvent } from "@/app/components/installPrompt";

export default function RegisterPwa() {
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      storeInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => storeInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
