import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CitySelection = {
  cityId: string;
  cityName: string;
  stateId?: string;
  countryCode?: string;
  coords?: { lat: number; lng: number } | null;
};

type LocationContextType = {
  currentCity: CitySelection | null;
  setCurrentCity: (city: CitySelection | null) => void;
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  loading: boolean;
};

const STORAGE_KEY = "app_city";
const COOKIE_KEY = "app_city";

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCity, setCurrentCityState] = useState<CitySelection | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize from localStorage or cookie
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.cityId && parsed.cityName) {
          setCurrentCityState(parsed);
        }
      } else {
        const match = document.cookie.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
        if (match) {
          const decoded = decodeURIComponent(match[1]);
          const parsed = JSON.parse(decoded);
          if (parsed && parsed.cityId && parsed.cityName) {
            setCurrentCityState(parsed);
          }
        }
      }
    } catch {}
  }, []);

  const persist = (city: CitySelection | null) => {
    if (city) {
      const str = JSON.stringify(city);
      try { localStorage.setItem(STORAGE_KEY, str); } catch {}
      try {
        const sevenDays = 7 * 24 * 60 * 60;
        document.cookie = `${COOKIE_KEY}=${encodeURIComponent(str)}; path=/; max-age=${sevenDays}`;
      } catch {}
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      try { document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`; } catch {}
    }
  };

  const setCurrentCity = (city: CitySelection | null) => {
    setCurrentCityState(city);
    persist(city);
  };

  const value = useMemo(
    () => ({ currentCity, setCurrentCity, open, openModal: () => setOpen(true), closeModal: () => setOpen(false), loading }),
    [currentCity, open, loading],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationPreference = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationPreference must be used within LocationProvider");
  return ctx;
};

// Lightweight helpers used by API layer
export const getSavedCity = (): CitySelection | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.cityId && parsed.cityName) return parsed;
  } catch {}
  return null;
};
