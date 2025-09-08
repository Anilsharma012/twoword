import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useLocationPreference } from "../hooks/useLocationPreference";
import { api } from "../lib/api";

const useDebounced = (value: string, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
};

export default function LocationModal() {
  const { open, closeModal, setCurrentCity, currentCity } = useLocationPreference();
  const [tab, setTab] = useState<"auto" | "search">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Search state
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [results, setResults] = useState<any[]>([]);
  const cacheRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    setError("");
  }, [open]);

  // Debounced search
  useEffect(() => {
    const run = async () => {
      if (!dq) { setResults([]); return; }
      if (cacheRef.current[dq]) { setResults(cacheRef.current[dq]); return; }
      try {
        const { data } = await api.get(`locations/cities?query=${encodeURIComponent(dq)}&limit=10`);
        if (data?.success && Array.isArray(data.data)) {
          cacheRef.current[dq] = data.data;
          setResults(data.data);
        } else {
          // Fallback: offer Rohtak
          const fallback = [{ cityId: "rohtak", cityName: "Rohtak", stateId: "HR", countryCode: "IN" }];
          cacheRef.current[dq] = fallback;
          setResults(fallback);
        }
      } catch {
        const fallback = [{ cityId: "rohtak", cityName: "Rohtak", stateId: "HR", countryCode: "IN" }];
        cacheRef.current[dq] = fallback;
        setResults(fallback);
      }
    };
    run();
  }, [dq]);

  const selectCity = async (payload: { cityId: string; cityName: string; stateId?: string; countryCode?: string; coords?: {lat:number;lng:number}|null }) => {
    setCurrentCity({ ...payload });
    try {
      await api.patch("user/preferences", { cityId: payload.cityId, coords: payload.coords });
    } catch {}
    closeModal();
    // Trigger UI refresh by reloading current page data
    try { window.dispatchEvent(new CustomEvent("app:city-changed")); } catch {}
  };

  const autoDetect = async () => {
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setError("Auto-detect requires HTTPS or permission. Please use Search.");
      setTab("search");
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => setError("Taking longer than expected..."), 4000);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      clearTimeout(timer);
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const { data } = await api.get(`locations/reverse?lat=${lat}&lng=${lng}`);
        if (data?.success && data.data?.cityId) {
          await selectCity({ ...data.data, coords: { lat, lng } });
        } else {
          await selectCity({ cityId: "coords", cityName: "Near you", coords: { lat, lng } });
        }
      } catch {
        await selectCity({ cityId: "coords", cityName: "Near you", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      } finally { setLoading(false); }
    }, (err) => {
      clearTimeout(timer);
      setLoading(false);
      setError(err?.message || "Permission denied. Please use Search.");
      setTab("search");
    }, { timeout: 8000, enableHighAccuracy: false });
  };

  useEffect(() => {
    if (open) {
      setTab("auto");
      setError("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) closeModal(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v)=>setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="auto">Auto Detect</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          <TabsContent value="auto">
            <p className="text-sm text-gray-600 mb-3">Use your current location to personalize results.</p>
            <Button onClick={autoDetect} disabled={loading} className="w-full">
              {loading ? "Detecting..." : "Detect my location"}
            </Button>
            {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
          </TabsContent>
          <TabsContent value="search">
            <div className="space-y-3">
              <Input
                placeholder="Search city"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
              />
              <div className="max-h-60 overflow-auto divide-y">
                {results.map((r)=> (
                  <button key={r.cityId||r.cityName} onClick={()=>selectCity({ cityId: r.cityId||r.cityName, cityName: r.cityName||r.name, stateId: r.stateId, countryCode: r.countryCode })} className="w-full text-left py-2 px-2 hover:bg-gray-50">
                    <div className="font-medium">{r.cityName || r.name}</div>
                    <div className="text-xs text-gray-500">{[r.stateName||r.stateId, r.countryName||r.countryCode].filter(Boolean).join(", ")}</div>
                  </button>
                ))}
                {!results.length && <div className="text-sm text-gray-500 py-4 text-center">No matches</div>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
