import { useEffect } from "react";

const client = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

export default function AdsenseProvider() {
  useEffect(() => {
    if (!client) return;
    if (document.querySelector("script[data-adsbygoogle]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      client;
    s.setAttribute("crossorigin", "anonymous");
    s.setAttribute("data-adsbygoogle", "true");
    document.head.appendChild(s);
  }, []);
  return null;
}
