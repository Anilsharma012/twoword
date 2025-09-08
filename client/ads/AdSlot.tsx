import React, { useEffect } from "react";
import { useAds } from "./AdsProvider";

type Props = {
  place: "header" | "belowHero" | "inArticle" | "sidebar";
  style?: React.CSSProperties;
  className?: string;
};

export const AdSlot: React.FC<Props> = ({ place, style, className }) => {
  const cfg = useAds();
  if (!cfg?.enabled || !cfg.clientId) return null;

  const slot = (cfg.slots as any)?.[place];
  if (!slot?.enabled || !slot?.slotId) return null;

  useEffect(() => {
    const t = setTimeout(() => {
      try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [place, slot?.slotId]);

  return (
    <ins
      className={`adsbygoogle ${className || ""}`.trim()}
      style={style || { display: "block" }}
      data-ad-client={cfg.testMode ? "ca-test" : cfg.clientId}
      data-ad-slot={slot.slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
      {...(cfg.testMode ? { "data-adtest": "on" } : {})}
    />
  );
};

export default AdSlot;
