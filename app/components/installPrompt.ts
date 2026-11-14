export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let promptEvent: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function getInstallPrompt() {
  return promptEvent;
}

export function storeInstallPrompt(event: InstallPromptEvent | null) {
  promptEvent = event;
  listeners.forEach((listener) => listener());
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
