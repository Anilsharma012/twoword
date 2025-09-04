import { useEffect, useRef } from "react";

interface AdSlotProps {
  adSlot?: string; // data-ad-slot
  style?: React.CSSProperties;
  className?: string;
  format?: "horizontal" | "rectangle" | "vertical";
}

const defaultStyles: Record<
  NonNullable<AdSlotProps["format"]>,
  React.CSSProperties
> = {
  horizontal: { width: "100%", minHeight: 90 },
  rectangle: { width: "100%", minHeight: 250 },
  vertical: { width: 300, minHeight: 600 },
};

export default function AdSlot({
  adSlot,
  style,
  className = "",
  format = "horizontal",
}: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    if ((window as any).adsbygoogle && ref.current) {
      try {
        // @ts-ignore
        (window as any).adsbygoogle.push({});
      } catch {}
    }
  }, []);

  return (
    <div className={className} style={{ ...defaultStyles[format], ...style }}>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT}
        data-ad-slot={adSlot}
        data-full-width-responsive="true"
        ref={ref as any}
      />
    </div>
  );
}
