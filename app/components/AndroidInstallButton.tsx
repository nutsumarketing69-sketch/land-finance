"use client";

import { useEffect, useState } from "react";
import { getInstallPrompt, storeInstallPrompt, subscribeInstallPrompt } from "@/app/components/installPrompt";

const STEPS = "เปิดเมนู Chrome แล้วเลือกเพิ่มไปที่หน้าจอหลัก";

function installedNow() {
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return media || navigatorWithStandalone.standalone === true;
}

export default function AndroidInstallButton() {
  const [installed, setInstalled] = useState(false);
  const [promptReady, setPromptReady] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    const sync = () => {
      const standalone = installedNow();
      setInstalled(standalone);
      setPromptReady(Boolean(getInstallPrompt()));
      if (standalone) setSteps(false);
    };
    sync();
    const media = window.matchMedia("(display-mode: standalone)");
    const unsub = subscribeInstallPrompt(sync);
    media.addEventListener("change", sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      unsub();
      media.removeEventListener("change", sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  if (installed) return null;

  async function install() {
    const event = getInstallPrompt();
    if (!event) {
      setSteps(true);
      return;
    }
    try {
      await event.prompt();
      const choice = await event.userChoice;
      storeInstallPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      storeInstallPrompt(null);
      setSteps(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        data-testid="android-install"
        onClick={() => void install()}
        className="min-h-11 rounded-full border border-emerald-300/50 px-4 py-3 text-center text-sm font-semibold text-emerald-100"
      >
        ติดตั้งแอปแอนดรอยด์
      </button>
      {steps || !promptReady ? (
        <p data-testid="android-install-steps" className="text-sm leading-6 text-slate-300">
          {STEPS}
        </p>
      ) : null}
    </div>
  );
}
