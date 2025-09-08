import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

type Slot = { enabled: boolean; slotId?: string };
export type AdsConfig = {
  enabled: boolean;
  clientId: string;
  autoAds: boolean;
  testMode: boolean;
  slots: Record<string, Slot>;
  noAdsRoutes: string[];
};

const AdsContext = createContext<AdsConfig | null>(null);
export const useAds = () => useContext(AdsContext);

function injectAdSense(clientId: string) {
  if (document.getElementById("adsbygoogle-js")) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  s.crossOrigin = "anonymous";
  s.id = "adsbygoogle-js";
  document.head.appendChild(s);
}

export const AdsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [cfg, setCfg] = useState<AdsConfig | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/ads", { credentials: "same-origin" });
        const c = (await r.json()) as AdsConfig;
        setCfg(c);
        if (c.enabled && c.clientId) {
          injectAdSense(c.clientId);
          if ((window as any).adsbygoogle) {
            try { (window as any).adsbygoogle.push({}); } catch {}
          }
        }
      } catch {
        setCfg({ enabled: false, clientId: "", autoAds: false, testMode: true, slots: {}, noAdsRoutes: [] });
      }
    })();
  }, []);

  // Route change: re-push (SPA)
  useEffect(() => {
    if (!cfg?.enabled) return;
    const blocked = (cfg.noAdsRoutes || []).some((rx) => {
      try { return new RegExp(rx).test(pathname); } catch { return rx === pathname; }
    });
    if (blocked) return;
    if ((window as any).adsbygoogle) {
      try { (window as any).adsbygoogle.push({}); } catch {}
    }
  }, [pathname, cfg]);

  const value = useMemo(() => cfg, [cfg]);
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
};
