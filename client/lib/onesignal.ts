import { toast } from "sonner";

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
let loaded = false;

function loadSdk(): Promise<void> {
  if (loaded) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      if ((window as any).OneSignal) {
        loaded = true;
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.async = true;
      script.onload = () => {
        loaded = true;
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    } catch {
      resolve();
    }
  });
}

function promptOnce() {
  try {
    const key = "os_prompted_once";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setTimeout(async () => {
      try {
        const os: any = (window as any).OneSignal;
        if (os?.Notifications?.requestPermission) {
          const res = await os.Notifications.requestPermission();
          if (res === "granted") toast("Push notifications enabled");
        } else if (os?.Slidedown?.promptPush) {
          os.Slidedown.promptPush();
        }
      } catch {}
    }, 2500);
  } catch {}
}

export async function setupOneSignal() {
  if (typeof window === "undefined") return;
  if (!APP_ID) return;
  await loadSdk();
  try {
    const os: any = (window as any).OneSignal;
    if (!os) return;
    // v16 API preferred
    if (typeof os.init === "function") {
      await os.init({ appId: APP_ID, notifyButton: { enable: true } } as any);
    } else if (typeof os.push === "function") {
      os.push(() => {
        os.init({ appId: APP_ID, notifyButton: { enable: true } });
      });
    }

    // Show bell and first-visit prompt
    promptOnce();

    // Listen for subscription status changes to show feedback
    try {
      os?.User?.PushSubscription?.addEventListener?.("change", (ev: any) => {
        if (ev && typeof ev === "object" && "subscribed" in ev) {
          toast(ev.subscribed ? "Push notifications enabled" : "Push notifications disabled");
        }
      });
    } catch {}

    // After PWA install, request permission if still default
    window.addEventListener("appinstalled", async () => {
      try {
        if (Notification.permission !== "granted") {
          const res = await os?.Notifications?.requestPermission?.();
          if (res === "granted") toast("Push notifications enabled");
        }
      } catch {}
    });
  } catch (e) {
    console.warn("OneSignal init failed:", (e as any)?.message || e);
  }
}
