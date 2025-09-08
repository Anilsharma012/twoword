import React, { useEffect, useState } from "react";

export default function AdminAdsSettings() {
  const [form, setForm] = useState<any>({
    enabled: false,
    clientId: "",
    autoAds: false,
    testMode: true,
    slots: {
      header: { enabled: false, slotId: "" },
      belowHero: { enabled: false, slotId: "" },
      inArticle: { enabled: true, slotId: "" },
      sidebar: { enabled: false, slotId: "" },
    },
    noAdsRoutes: ["/login", "/checkout"],
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/ads", { credentials: "include" });
        const data = await r.json();
        setForm((f: any) => ({ ...f, ...data }));
      } catch {}
    })();
  }, []);

  const save = async () => {
    const r = await fetch("/api/admin/ads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    if (r.ok) alert("Saved!");
    else alert("Save failed");
  };

  const bind = (path: string) => ({
    value: path.split(".").reduce((o: any, k: string) => o?.[k], form) ?? "",
    onChange: (e: any) => {
      const v = e?.target?.type === "checkbox" ? !!e.target.checked : e.target.value;
      setForm((prev: any) => {
        const copy = structuredClone(prev);
        const keys = path.split(".");
        let ref = copy as any;
        while (keys.length > 1) ref = ref[keys.shift()!];
        ref[keys[0]] = v;
        return copy;
      });
    },
  });

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Google AdSense Settings</h1>

      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" {...bind("enabled")} /> Enable AdSense
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Client ID (ca-pub-XXXX)</label>
          <input className="border p-2 w-full" placeholder="ca-pub-XXXXXXXX" {...bind("clientId")} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...bind("autoAds")} /> Auto ads
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...bind("testMode")} /> Test mode (data-adtest="on")
        </label>
      </div>

      <h2 className="font-medium mt-6 mb-2">Slots</h2>
      {(["header", "belowHero", "inArticle", "sidebar"] as const).map((k) => (
        <div key={k} className="flex items-center gap-3 mb-2">
          <span className="w-28 capitalize">{k}</span>
          <input type="checkbox" {...bind(`slots.${k}.enabled`)} />
          <input className="border p-2 flex-1" placeholder="data-ad-slot ID" {...bind(`slots.${k}.slotId`)} />
        </div>
      ))}

      <h2 className="font-medium mt-6 mb-2">Disable on routes (one per line or regex)</h2>
      <textarea
        className="border p-2 w-full h-24"
        value={(form.noAdsRoutes || []).join("\n")}
        onChange={(e) =>
          setForm((f: any) => ({
            ...f,
            noAdsRoutes: e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          }))
        }
      />

      <button onClick={save} className="mt-4 px-4 py-2 bg-black text-white rounded">
        Save
      </button>
    </div>
  );
}
