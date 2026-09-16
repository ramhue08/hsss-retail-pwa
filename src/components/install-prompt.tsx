"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsIos(ios && !installed);
    setStandalone(installed);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone || dismissed) return null;

  if (isIos) {
    return (
      <div className="app-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-navy">Add to your home screen</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tap Share, then Add to Home Screen to come back to your design.
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={() => setDismissed(true)}>
          Dismiss
        </Button>
      </div>
    );
  }

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  }

  return (
    <div className="app-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-navy">Install this app</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Add it to your home screen so you can return to your design any time.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={install}>
          Install app
        </Button>
        <Button type="button" variant="secondary" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
